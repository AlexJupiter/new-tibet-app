import {createHmac,createHash,sign,createPrivateKey,X509Certificate} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import zip from 'do-not-zip';
import {Problem} from './core.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const memberLabel=app=>'Member '+app.reference.slice(-6);
const bookLabel=app=>app.book==='vouched'?'Vouched member':app.book==='blue'?'Blue Book supporter':'Green Book holder';
const appleKeys=['APPLE_PASS_TYPE_ID','APPLE_TEAM_ID','APPLE_PASS_CERTIFICATE','APPLE_PASS_PRIVATE_KEY','APPLE_WWDR_CERTIFICATE'];
const googleKeys=['GOOGLE_WALLET_ISSUER_ID','GOOGLE_WALLET_CLASS_ID','GOOGLE_WALLET_CREDENTIALS'];
const configured=(env,keys)=>keys.every(key=>Boolean(env[key]));
export function createMembershipCards(db,env){
 db.exec('CREATE TABLE IF NOT EXISTS membership_cards(reference TEXT PRIMARY KEY,token_hash TEXT UNIQUE NOT NULL,issued_at TEXT NOT NULL,expires_at TEXT NOT NULL,revoked INTEGER NOT NULL DEFAULT 0)');
 function checkConfiguration(){
  if(!env.MEMBERSHIP_CARD_SECRET||env.MEMBERSHIP_CARD_SECRET.length<32||!env.CARD_FRONTEND_URL)throw new Problem('Membership card issuing is not enabled yet.',503);
  const base=new URL(env.CARD_FRONTEND_URL);
  if(base.origin!==env.FRONTEND_ORIGIN||base.search||base.hash||!base.pathname.endsWith('/')||(base.protocol!=='https:'&&env.NODE_ENV!=='test'))throw new Problem('Membership card issuing is not enabled yet.',503);
  return base;
 }
 function profile(app){
  if(app.status!=='accepted')throw new Problem('Your application must be accepted before a membership card can be issued.',403);
  const base=checkConfiguration();
  const token=createHmac('sha256',env.MEMBERSHIP_CARD_SECRET).update('new-tibet-membership-v1:'+app.reference).digest('base64url');
  const now=new Date(),expires=new Date(now);expires.setUTCFullYear(expires.getUTCFullYear()+1);
  db.prepare('INSERT OR IGNORE INTO membership_cards(reference,token_hash,issued_at,expires_at) VALUES(?,?,?,?)').run(app.reference,hash(token),now.toISOString(),expires.toISOString());
  const row=db.prepare('SELECT * FROM membership_cards WHERE reference=?').get(app.reference);
  if(row.revoked||row.expires_at<=now.toISOString()||row.token_hash!==hash(token))throw new Problem('This membership card is no longer active. Contact New Tibet for help.',403);
  const url=new URL('verify.html',base);url.hash=new URLSearchParams({card:token}).toString();
  return {verificationURL:url.href,issuedAt:row.issued_at,expiresAt:row.expires_at,apple:configured(env,appleKeys)&&appleKeys.slice(2).every(key=>existsSync(env[key])),google:configured(env,googleKeys)&&existsSync(env.GOOGLE_WALLET_CREDENTIALS)};
 }
 function verify(token){
  if(typeof token!=='string'||!/^[-_A-Za-z0-9]{43}$/.test(token))return {valid:false};
  const row=db.prepare('SELECT c.*,a.data FROM membership_cards c JOIN applications a ON a.reference=c.reference WHERE c.token_hash=?').get(hash(token));
  if(!row||row.revoked||row.expires_at<=new Date().toISOString())return {valid:false};
  const app=JSON.parse(row.data);
  // Key rotation, revocation, expiration and current review status invalidate scans.
  if(!env.MEMBERSHIP_CARD_SECRET||app.status!=='accepted'||createHmac('sha256',env.MEMBERSHIP_CARD_SECRET).update('new-tibet-membership-v1:'+app.reference).digest('base64url')!==token)return {valid:false};
  return {valid:true,reference:app.reference,book:app.book,status:'accepted',expiresAt:row.expires_at,checkedAt:new Date().toISOString()};
 }
 return {profile,verify,apple:async app=>createApplePass(app,profile(app),env),google:app=>createGoogleSaveLink(app,profile(app),env)};
}

export function applePassData(app,card,env){
 return {formatVersion:1,passTypeIdentifier:env.APPLE_PASS_TYPE_ID,teamIdentifier:env.APPLE_TEAM_ID,serialNumber:app.reference,organizationName:'New Tibet',description:'New Tibet membership card',backgroundColor:'rgb(237, 241, 247)',foregroundColor:'rgb(27, 42, 91)',labelColor:'rgb(27, 42, 91)',expirationDate:card.expiresAt,sharingProhibited:true,
  generic:{primaryFields:[{key:'member',label:'MEMBER',value:memberLabel(app)}],secondaryFields:[{key:'book',label:'MEMBERSHIP',value:bookLabel(app)},{key:'status',label:'STATUS',value:'Accepted'}],auxiliaryFields:[{key:'reference',label:'MEMBER REFERENCE',value:app.reference}],backFields:[{key:'use',label:'IN PERSON',value:'Present at participating physical locations. Staff can scan the QR code to check current New Tibet membership.'},{key:'privacy',label:'PRIVACY',value:'This membership pass contains no name, contact details, book photos or passport data.'},{key:'contact',label:'NEW TIBET',value:'https://newtibet.com/\nhello@newtibet.com'}]},
  barcodes:[{format:'PKBarcodeFormatQR',message:card.verificationURL,messageEncoding:'iso-8859-1',altText:app.reference}]};
}
async function signManifest(manifest,env){
 const cert=new X509Certificate(readFileSync(env.APPLE_PASS_CERTIFICATE));
 const subject=new Map(cert.subject.split('\n').map(field=>{const index=field.indexOf('=');return [field.slice(0,index),field.slice(index+1)];}));
 if(subject.get('UID')!==env.APPLE_PASS_TYPE_ID||subject.get('OU')!==env.APPLE_TEAM_ID||Date.parse(cert.validTo)<=Date.now()||Date.parse(cert.validFrom)>Date.now())throw new Error('Invalid pass certificate.');
 const directory=await mkdtemp(join(tmpdir(),'new-tibet-pass-'));
 try{
  const input=join(directory,'manifest.json'),output=join(directory,'signature');await writeFile(input,manifest,{mode:0o600});
  await new Promise((resolve,reject)=>{
   // No shell and no private-key password in command arguments or logs.
   const child=spawn(env.OPENSSL_PATH||'openssl',['cms','-sign','-binary','-md','sha256','-in',input,'-signer',env.APPLE_PASS_CERTIFICATE,'-inkey',env.APPLE_PASS_PRIVATE_KEY,'-certfile',env.APPLE_WWDR_CERTIFICATE,'-outform','DER','-out',output,'-passin','stdin'],{stdio:['pipe','ignore','ignore']});
   const timer=setTimeout(()=>{child.kill();reject(new Error('Pass signing timed out.'));},10000);
   child.on('error',error=>{clearTimeout(timer);reject(error);});child.on('close',code=>{clearTimeout(timer);code===0?resolve():reject(new Error('Pass signing failed.'));});
   child.stdin.on('error',()=>{});child.stdin.end((env.APPLE_PASS_KEY_PASSWORD||'')+'\n');
  });return await readFile(output);
 }finally{await rm(directory,{recursive:true,force:true});}
}
export async function createApplePass(app,card,env){
 if(!card.apple)throw new Problem('Apple Wallet issuing is not enabled yet.',503);
 try{
  const files=[{path:'pass.json',data:Buffer.from(JSON.stringify(applePassData(app,card,env)))}];
  for(const file of ['icon.png','icon@2x.png','icon@3x.png','logo.png','logo@2x.png','logo@3x.png'])files.push({path:file,data:readFileSync(new URL('../public/assets/passes/'+file,import.meta.url))});
  const manifest=Buffer.from(JSON.stringify(Object.fromEntries(files.map(file=>[file.path,createHash('sha1').update(file.data).digest('hex')]))));
  const signature=await signManifest(manifest,env);
  return zip.toBuffer([...files,{path:'manifest.json',data:manifest},{path:'signature',data:signature}]);
 }catch{throw new Problem('Apple Wallet passes are temporarily unavailable. Please try again later.',503);}
}
export function createGoogleSaveLink(app,card,env){
 if(!card.google)throw new Problem('Google Wallet issuing is not enabled yet.',503);
 try{
  if(!/^\d+$/.test(env.GOOGLE_WALLET_ISSUER_ID)||!env.GOOGLE_WALLET_CLASS_ID.startsWith(env.GOOGLE_WALLET_ISSUER_ID+'.')||!/^\d+\.[\w.-]+$/.test(env.GOOGLE_WALLET_CLASS_ID))throw new Error('Invalid issuer.');
  const credentials=JSON.parse(readFileSync(env.GOOGLE_WALLET_CREDENTIALS,'utf8')),key=createPrivateKey(credentials.private_key);
  if(!credentials.client_email||key.asymmetricKeyType!=='rsa'||key.asymmetricKeyDetails.modulusLength<2048)throw new Error('Invalid signing credentials.');
  const localized=value=>({defaultValue:{language:'en-US',value}});
  const object={id:env.GOOGLE_WALLET_ISSUER_ID+'.'+app.reference,classId:env.GOOGLE_WALLET_CLASS_ID,state:'ACTIVE',cardTitle:localized('New Tibet'),header:localized(memberLabel(app)),hexBackgroundColor:'#edf1f7',barcode:{type:'QR_CODE',value:card.verificationURL,alternateText:app.reference},validTimeInterval:{end:{date:card.expiresAt}},textModulesData:[{id:'book',header:'MEMBERSHIP',body:bookLabel(app)},{id:'status',header:'STATUS',body:'Accepted'}],logo:{sourceUri:{uri:new URL('assets/passes/google-logo.png',env.CARD_FRONTEND_URL).href}}};
  const claims={iss:credentials.client_email,aud:'google',typ:'savetowallet',iat:Math.floor(Date.now()/1000),origins:[new URL(env.FRONTEND_ORIGIN).hostname],payload:{genericObjects:[object]}};
  const header=Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT'})).toString('base64url');
  const payload=Buffer.from(JSON.stringify(claims)).toString('base64url'),unsigned=header+'.'+payload;
  return {url:'https://pay.google.com/gp/v/save/'+unsigned+'.'+sign('RSA-SHA256',Buffer.from(unsigned),key).toString('base64url')};
 }catch{throw new Problem('Google Wallet passes are temporarily unavailable. Please try again later.',503);}
}
