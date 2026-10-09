import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {Problem,token,digest,compare,code,validateContact,verifyChallenge,validateApplication,validateDecision,validateMedia} from './core.mjs';
import {GoogleStore} from './google.mjs';
import {verifyPassport,passportScope} from './passport.mjs';
import {Messages} from './messages.mjs';
import {createNotifications,applicationSummary} from './notifications.mjs';
import {createRetention} from './retention.mjs';
import {createMembershipCards} from './cards.mjs';
import {createInvites} from './invites.mjs';
const required=['PASSPORT_UNIQUENESS_SECRET','SESSION_SECRET','FRONTEND_ORIGIN','RP_ID','REVIEW_WEBHOOK_SECRET','REVIEWER_EMAILS','GOOGLE_APPLICATION_CREDENTIALS','GOOGLE_DRIVE_FOLDER_ID','GOOGLE_SHEET_ID'];
export function createApp(env=process.env,adapters={}){
 const live=env.APP_MODE==='live';const missing=required.filter(key=>!env[key]);if(live&&missing.length)throw new Error('Missing backend settings: '+missing.join(', '));if(live&&(env.SESSION_SECRET.length<32||env.REVIEW_WEBHOOK_SECRET.length<32||env.PASSPORT_UNIQUENESS_SECRET.length<32))throw new Error('Use secrets of at least 32 characters.');if(live&&!env.FRONTEND_ORIGIN.startsWith('https://')&&env.NODE_ENV!=='test')throw new Error('The live frontend must use HTTPS.');
 const secret=env.SESSION_SECRET||token();const dataDir=resolve(env.DATA_DIR||'backend/data');mkdirSync(dataDir,{recursive:true,mode:0o700});const db=new DatabaseSync(adapters.database||resolve(dataDir,'identity.sqlite'));db.exec("PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, data TEXT NOT NULL, expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS applications(reference TEXT PRIMARY KEY, session_id TEXT UNIQUE, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, reference TEXT NOT NULL, kind TEXT NOT NULL, attempts INTEGER DEFAULT 0, due INTEGER NOT NULL, state TEXT DEFAULT 'queued'); CREATE TABLE IF NOT EXISTS passport_claims(nullifier TEXT PRIMARY KEY, session_id TEXT UNIQUE NOT NULL, expires INTEGER NOT NULL, reference TEXT); CREATE TABLE IF NOT EXISTS rate_events(key TEXT NOT NULL, time INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS country_totals(country TEXT PRIMARY KEY,count INTEGER NOT NULL);");
 const notifications=createNotifications(db);
 const cards=createMembershipCards(db,env),cardDownloads=new Map();
 for(const row of db.prepare('SELECT session_id,data FROM applications').all()){const app=JSON.parse(row.data);notifications.record({...app,status:'pending'},row.session_id);if(app.status!=='pending')notifications.record(app,row.session_id);}
 const store=adapters.store||new GoogleStore(env),messages=adapters.messages||new Messages(env);let processing=false;const passkeys=adapters.passkeys||(()=>import('@simplewebauthn/server'));
 function readSession(id){const row=db.prepare('SELECT * FROM sessions WHERE id=? AND expires>?').get(id,Date.now());if(!row)throw new Problem('Your session expired. Please start again.',401);return JSON.parse(row.data);}
 function saveSession(id,data){db.prepare('UPDATE sessions SET data=? WHERE id=?').run(JSON.stringify(data),id);}
 function appByReference(reference){const row=db.prepare('SELECT data FROM applications WHERE reference=?').get(reference);if(!row)throw new Problem('Application not found.',404);return JSON.parse(row.data);}
 function saveApp(app){db.prepare('UPDATE applications SET data=? WHERE reference=?').run(JSON.stringify(app),app.reference);}
 function rate(key,max,window){const now=Date.now();db.prepare('DELETE FROM rate_events WHERE time<?').run(now-86400000);const count=db.prepare('SELECT count(*) AS n FROM rate_events WHERE key=? AND time>?').get(key,now-window).n;if(count>=max)throw new Problem('Too many requests. Please try again later.',429);db.prepare('INSERT INTO rate_events VALUES(?,?)').run(key,now);}
 function queue(reference,kind){if(kind==='sheet'&&appByReference(reference).book==='vouched')return;db.prepare('INSERT OR IGNORE INTO jobs(id,reference,kind,due) VALUES(?,?,?,?)').run(reference+':'+kind,reference,kind,Date.now());if(kind==='sheet')db.prepare("UPDATE jobs SET state='queued',attempts=0,due=? WHERE id=?").run(Date.now(),reference+':sheet');}
 const invites=createInvites({db,secret,appByReference,saveSession,notifications,rate});
 async function processJobs(){if(processing||!live)return;processing=true;try{for(const job of db.prepare("SELECT * FROM jobs WHERE state='queued' AND due<=? ORDER BY due LIMIT 10").all(Date.now())){let app=appByReference(job.reference);try{if(job.kind==='sheet'){await store.update(app);if(JSON.stringify(app)!==JSON.stringify(appByReference(job.reference))){queue(app.reference,'sheet');continue;}}else{const result=await messages[job.kind](app);app=appByReference(job.reference);app[job.kind+'Message']='sent';app[job.kind+'MessageId']=result;saveApp(app);queue(app.reference,'sheet'); // A completed sync must be rerun for subsequent notifications.
 db.prepare("UPDATE jobs SET state='queued',attempts=0,due=? WHERE id=?").run(Date.now(),app.reference+':sheet');}db.prepare("UPDATE jobs SET state='sent' WHERE id=?").run(job.id);}catch{const attempts=job.attempts+1;db.prepare('UPDATE jobs SET attempts=?,state=?,due=? WHERE id=?').run(attempts,attempts>=8?'failed':'queued',Date.now()+Math.min(3600000,30000*2**attempts),job.id);if(job.kind!=='sheet'){app=appByReference(job.reference);app[job.kind+'Message']=attempts>=8?'failed':'queued';saveApp(app);queue(app.reference,'sheet');db.prepare("UPDATE jobs SET state='queued',attempts=0,due=? WHERE id=?").run(Date.now(),app.reference+':sheet');}console.error('Integration job failed:',job.kind,'attempt',attempts);}}}finally{processing=false;}}
 const retention=createRetention({db,store,live});
 // Finish external updates before cleanup so an in-flight sync cannot restore erased evidence.
 let maintaining=false;
 async function processMaintenance(){if(maintaining)return;maintaining=true;try{await processJobs();await retention.run();}finally{maintaining=false;}}
 const timer=setInterval(()=>{processMaintenance().catch(()=>console.error('Integration maintenance failed.'));},15000);timer.unref();
 function json(res,status,body,origin){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})});res.end(JSON.stringify(body));}
 async function body(req){let parts=[],length=0;for await(const chunk of req){length+=chunk.length;if(length>4.5*1024*1024)throw new Problem('Request is too large.',413);parts.push(chunk);}try{return JSON.parse(Buffer.concat(parts).toString()||'{}');}catch{throw new Problem('Invalid JSON.');}}
 const server=http.createServer(async(req,res)=>{const origin=req.headers.origin;const sameOrigin=!origin&&req.headers['sec-fetch-site']==='same-origin'&&req.headers.host===new URL(env.FRONTEND_ORIGIN||'http://localhost').host;const allowedOrigin=origin===env.FRONTEND_ORIGIN?origin:sameOrigin?env.FRONTEND_ORIGIN:null;try{const path=new URL(req.url,'http://localhost').pathname;
 if(req.method==='OPTIONS'){if(!allowedOrigin)throw new Problem('Origin not permitted.',403);res.writeHead(204,{'Access-Control-Allow-Origin':allowedOrigin,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization, X-Review-Consent','Vary':'Origin'});return res.end();}
 if(path==='/health')return json(res,200,{ok:true,mode:live?'live':'demo'},allowedOrigin);
 if(!path.startsWith('/api/')){
  if(req.method!=='GET')throw new Problem('Method not allowed.',405);
  const file=resolve('public','.'+decodeURIComponent(path==='/'?'/index.html':path));if(!file.startsWith(resolve('public')+'/')||!existsSync(file))throw new Problem('Not found.',404);
  const content=readFileSync(file),video=extname(file)==='.mp4';
  const headers={'Content-Type':({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.mp4':'video/mp4','.woff2':'font/woff2','.vtt':'text/vtt; charset=utf-8','.txt':'text/plain; charset=utf-8'})[extname(file)]||'application/octet-stream','Content-Length':content.length,'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(self), microphone=(self)','Content-Security-Policy':"default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https://*.zkpassport.id wss://*.zkpassport.id https://*.obsidion.xyz wss://*.obsidion.xyz "+(env.FRONTEND_ORIGIN||'')};
  if(video){
   headers['Accept-Ranges']='bytes';
   if(req.headers.range){
    const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    const start=range?.[1]?Number(range[1]):range?.[2]?Math.max(0,content.length-Number(range[2])):NaN;
    const end=range?.[1]&&range[2]?Math.min(Number(range[2]),content.length-1):content.length-1;
    if(!range||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=content.length||(!range[1]&&Number(range[2])<=0)){
     res.writeHead(416,{'Content-Range':'bytes */'+content.length,'Accept-Ranges':'bytes','Content-Length':0});return res.end();
    }
    const part=content.subarray(start,end+1);res.writeHead(206,{...headers,'Content-Length':part.length,'Content-Range':'bytes '+start+'-'+end+'/'+content.length});return res.end(part);
   }
  }
  res.writeHead(200,headers);return res.end(content);
 }
 if(!live)throw new Problem('Live integrations are not configured. The website is in test mode.',503);
 if(path==='/api/cards/verify'){
  if(req.method!=='POST')throw new Problem('Method not allowed.',405);
  if(origin&&!allowedOrigin)throw new Problem('Origin not permitted.',403);
  rate(digest(secret,'card-scan:'+req.socket.remoteAddress),60,60000);
  return json(res,200,cards.verify((await body(req)).card),allowedOrigin);
 }
 if(path.startsWith('/api/cards/apple/download/')){
  if(req.method!=='GET')throw new Problem('Method not allowed.',405);
  const ticket=path.slice('/api/cards/apple/download/'.length),entry=cardDownloads.get(ticket);cardDownloads.delete(ticket);
  if(!entry||entry.expires<Date.now())throw new Problem('This Wallet download expired. Please add the card again.',410);
  cards.profile(appByReference(entry.reference));const pass=entry.pass;
  res.writeHead(200,{'Content-Type':'application/vnd.apple.pkpass','Content-Disposition':'attachment; filename="new-tibet-membership.pkpass"','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});return res.end(pass);
 }

 if(path==='/api/reviews/decision'||path==='/api/reviews/retry'){if(req.method!=='POST')throw new Problem('Method not allowed.',405);const provided=String(req.headers.authorization||'').replace(/^Bearer /,'');if(!compare(provided,env.REVIEW_WEBHOOK_SECRET))throw new Problem('Reviewer authorization required.',401);const data=await body(req);if(path.endsWith('/retry')){const app=appByReference(data.reference);db.prepare("UPDATE jobs SET state='queued',attempts=0,due=? WHERE reference=? AND state='failed'").run(Date.now(),app.reference);return json(res,200,{queued:true});}const reviewers=env.REVIEWER_EMAILS.toLowerCase().split(',').map(x=>x.trim());const reviewer=String(data.reviewedBy||'').toLowerCase();if(!reviewers.includes(reviewer))throw new Problem('Reviewer is not authorized.',403);const app=appByReference(data.reference);if((app.verificationDeletedAt||(app.verificationDeleteAt&&Date.parse(app.verificationDeleteAt)<=Date.now()))&&data.status==='accepted'&&app.status==='pending')throw new Problem('Verification evidence expired. A new application is required.',409);const changed=validateDecision(app.status,data.status);if(changed){app.status=data.status;app.reviewedBy=reviewer;app.reviewedAt=new Date().toISOString();if(data.note!==undefined)app.reviewNote=String(data.note).slice(0,1000);app.decisionMessage=app.whatsapp?'queued':'in-app';db.exec('BEGIN');try{saveApp(app);const owner=db.prepare('SELECT session_id FROM applications WHERE reference=?').get(app.reference).session_id;notifications.record(app,owner);if(app.whatsapp)queue(app.reference,'decision');queue(app.reference,'sheet');db.prepare("UPDATE jobs SET state='queued',attempts=0,due=? WHERE id=?").run(Date.now(),app.reference+':sheet');db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}return json(res,200,{reference:app.reference,status:app.status,notification:app.decisionMessage});}
 if(path==='/api/admin/announcements'){
  if(req.method!=='POST')throw new Problem('Method not allowed.',405);
  const provided=String(req.headers.authorization||'').replace(/^Bearer /,'');
  if(!compare(provided,env.REVIEW_WEBHOOK_SECRET))throw new Problem('Publisher authorization required.',401);
  const data=await body(req),publisher=String(data.publishedBy||'').toLowerCase();
  if(!env.REVIEWER_EMAILS.toLowerCase().split(',').map(value=>value.trim()).includes(publisher))throw new Problem('Publisher is not authorized.',403);
  const item=notifications.publish(data);return json(res,201,{announcement:item},allowedOrigin);
 }
 if(!allowedOrigin)throw new Problem('Origin not permitted.',403);if(!['GET','POST'].includes(req.method))throw new Problem('Method not allowed.',405);const ip=env.TRUST_PROXY==='1'?String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',')[0]:req.socket.remoteAddress;rate(digest(secret,'request:'+ip),120,60000);
 if(path==='/api/interest'&&req.method==='POST'){
  rate(digest(secret,'interest:'+ip),5,3600000);const data=await body(req);if(data.consent!==true)throw new Problem('Agree to receive email updates first.');
  const email=validateContact('email',data.email);
  db.exec('CREATE TABLE IF NOT EXISTS interest_subscriptions(id TEXT PRIMARY KEY,email TEXT NOT NULL,consented_at TEXT NOT NULL);');
  db.prepare('INSERT OR IGNORE INTO interest_subscriptions VALUES(?,?,?)').run(digest(secret,'interest:'+email),email,new Date().toISOString());return json(res,201,{saved:true},allowedOrigin);
 }
 if(path==='/api/session'&&req.method==='POST'){rate(digest(secret,'session:'+ip),20,3600000);const bearer=token(),id=digest(secret,bearer);db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(id,JSON.stringify({verified:{},challenges:{},createdAt:Date.now()}),Date.now()+86400000);return json(res,201,{token:bearer},allowedOrigin);}
 const bearer=String(req.headers.authorization||'').replace(/^Bearer /,'');if(!bearer)throw new Problem('Start a verification session first.',401);const id=digest(secret,bearer),s=readSession(id);const data=req.method==='POST'&&path!=='/api/media/upload'?await body(req):{};if(req.method==='POST'&&path!=='/api/applications'&&s.submitting&&s.submittingAt>Date.now()-120000)throw new Problem('Your application is being submitted. Please wait.',409);
 if(path==='/api/invites'&&req.method==='POST')return json(res,201,invites.issue(s),allowedOrigin);
 if(path==='/api/invites/redeem'&&req.method==='POST'){
  rate(digest(secret,'invite-redemption:'+ip),30,3600000);
  const app=invites.redeem(s,id,data);return json(res,201,{application:applicationSummary(app)},allowedOrigin);
 }
 if(path==='/api/auth/options'&&req.method==='POST'){
  rate(digest(secret,'signin:'+id),12,3600000);const auth=await passkeys();
  const options=await auth.generateAuthenticationOptions({rpID:env.RP_ID,userVerification:'required'});
  s.authChallenge={value:options.challenge,expires:Date.now()+300000};saveSession(id,s);return json(res,200,options,allowedOrigin);
 }
 if(path==='/api/auth/verify'&&req.method==='POST'){
  if(!s.authChallenge||s.authChallenge.expires<Date.now())throw new Problem('Sign-in expired. Try again.',401);
  const challenge=s.authChallenge.value;delete s.authChallenge;saveSession(id,s);
  const credentialId=data.credential?.id;
  if(typeof credentialId!=='string'||credentialId.length>1024)throw new Problem('Passkey sign-in failed.',401);
  const row=db.prepare("SELECT * FROM applications WHERE json_extract(data,'$.passkey.id')=?").get(credentialId);
  if(!row)throw new Problem('Passkey sign-in failed.',401);
  const app=JSON.parse(row.data),key=app.passkey;
  if(!compare(data.credential?.response?.userHandle,key.userHandle))throw new Problem('Passkey sign-in failed.',401);
  let result;try{const auth=await passkeys();result=await auth.verifyAuthenticationResponse({response:data.credential,expectedChallenge:challenge,expectedOrigin:env.FRONTEND_ORIGIN,expectedRPID:env.RP_ID,requireUserVerification:true,credential:{id:key.id,publicKey:Buffer.from(key.publicKey,'base64url'),counter:key.counter,transports:key.transports}});}catch{throw new Problem('Passkey sign-in failed.',401);}
  if(!result.verified)throw new Problem('Passkey sign-in failed.',401);
  const latest=appByReference(app.reference);if(latest.passkey.counter!==key.counter)throw new Problem('Sign-in changed. Try again.',409);
  latest.passkey.counter=result.authenticationInfo.newCounter;saveApp(latest);s.reference=app.reference;s.ownerSessionId=row.session_id;saveSession(id,s);
  return json(res,200,{application:applicationSummary(latest)},allowedOrigin);
 }
 if(path==='/api/cards/profile'&&req.method==='GET'){
  if(!s.reference)throw new Problem('No application in this session.',404);
  return json(res,200,cards.profile(appByReference(s.reference)),allowedOrigin);
 }
 if((path==='/api/cards/apple'||path==='/api/cards/google')&&req.method==='POST'){
  if(!s.reference)throw new Problem('No application in this session.',404);
  rate(digest(secret,'wallet-pass:'+id),10,60000);
  const app=appByReference(s.reference);
  if(path.endsWith('/google'))return json(res,200,cards.google(app),allowedOrigin);
  const card=cards.profile(app);if(!card.apple)throw new Problem('Apple Wallet issuing is not enabled yet.',503);
  for(const [key,value] of cardDownloads)if(value.expires<Date.now())cardDownloads.delete(key);
  if(cardDownloads.size>=256)throw new Problem('Wallet downloads are busy. Please try again later.',503);
  const pass=await cards.apple(app),ticket=token();cardDownloads.set(ticket,{reference:app.reference,pass,expires:Date.now()+60000});
  return json(res,200,{path:'/api/cards/apple/download/'+ticket},allowedOrigin);
 }
 if(path==='/api/notifications'&&req.method==='GET'){
  const owner=s.ownerSessionId||id;const items=notifications.list(owner);
  return json(res,200,{items,application:s.reference?applicationSummary(appByReference(s.reference)):null},allowedOrigin);
 }
 if(path==='/api/notifications/read'&&req.method==='POST')return json(res,200,{read:notifications.markRead(s.ownerSessionId||id,data.ids)},allowedOrigin);
 if(path==='/api/media/challenge'&&req.method==='POST'){if(s.reference)throw new Problem('This application is already submitted.',409);s.mediaChallenge||={code:code(),expires:Date.now()+86400000};if(s.mediaChallenge.expires<Date.now())throw new Problem('Your photo challenge expired. Start a new application.');saveSession(id,s);return json(res,200,s.mediaChallenge,allowedOrigin);}
 if(path==='/api/passport/challenge'&&req.method==='POST'){if(s.reference&&appByReference(s.reference).passport?.verified)throw new Problem('Your passport is already verified.',409);s.passportChallenge={nonce:token(),domain:new URL(env.FRONTEND_ORIGIN).hostname,scope:passportScope,expires:Date.now()+3600000};saveSession(id,s);return json(res,200,s.passportChallenge,allowedOrigin);}
 if(path==='/api/passport/verify'&&req.method==='POST'){
  if(!s.passportChallenge||s.passportChallenge.expires<Date.now())throw new Problem('Passport request expired. Start a new check.');
  rate(digest(secret,'passport:'+id),6,3600000);
  const checked=await verifyPassport(data,s.passportChallenge,{...env,DATA_DIR:dataDir},adapters.verifyPassport),latest=readSession(id);
  if(latest.reference!==s.reference||latest.submitting||latest.passportChallenge?.nonce!==s.passportChallenge.nonce)throw new Problem('This passport request is no longer current.',409);
  const nullifier=digest(env.PASSPORT_UNIQUENESS_SECRET,'passport:'+checked.uniqueIdentifier),expires=Date.now()+3600000;
  db.exec('BEGIN');try{
   db.prepare('DELETE FROM passport_claims WHERE reference IS NULL AND expires<?').run(Date.now());
   const duplicate=db.prepare('SELECT * FROM passport_claims WHERE nullifier=?').get(nullifier);
   if(duplicate&&duplicate.session_id!==id&&!(latest.reference&&duplicate.reference===latest.reference))throw new Problem('This passport is already registered or has an active application.',409);
   db.prepare('DELETE FROM passport_claims WHERE session_id=? AND reference IS NULL').run(id);
   if(!duplicate?.reference)db.prepare('INSERT OR REPLACE INTO passport_claims VALUES(?,?,?,?)').run(nullifier,id,expires,latest.reference||null);
   latest.passport={verified:true,proofs:checked.proofs,nullifier,expires,verifiedAt:new Date().toISOString()};
   delete latest.passportChallenge;saveSession(id,latest);
   if(latest.reference){const app=appByReference(latest.reference);delete latest.passport.proofs;saveSession(id,latest);app.passport={...latest.passport};app.verificationTier='enhanced';saveApp(app);queue(app.reference,'sheet');}
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
  return json(res,200,{verified:true},allowedOrigin);
 }
 if(path==='/api/media/upload'&&req.method==='POST'){if(s.reference)throw new Problem('This application is already submitted.',409);if(!['2026-10-07','2026-10-08','2026-10-09'].includes(req.headers['x-review-consent']))throw new Problem('Consent to book and video review is required before uploading.',403);if(!s.mediaChallenge||s.mediaChallenge.expires<Date.now())throw new Problem('Your photo challenge expired.');const params=new URL(req.url,'http://localhost').searchParams,kind=params.get('kind'),book=params.get('book');if(!['green','blue'].includes(book)||!['front','back','identity','challenge','video'].includes(kind))throw new Problem('Choose a valid book and media kind.');const limit=(kind==='video'?20:3)*1024*1024;let length=0,parts=[];for await(const chunk of req){length+=chunk.length;if(length>limit)throw new Problem('Media upload is too large.',413);parts.push(chunk);}const media=Buffer.concat(parts);const type=validateMedia(kind,String(req.headers['content-type']||'').split(';')[0],media);s.submissionReference||='NT-'+randomUUID().toUpperCase();saveSession(id,s);const hash=digest(secret,media);let uploaded;try{uploaded=await store.media(s.submissionReference+'-'+book+'-'+kind+'-'+hash.slice(0,16),media,type);}catch{throw new Problem('Your media could not be stored. Please try again.',502);}const latest=readSession(id);if(latest.reference||latest.submitting)throw new Problem('This application is already being submitted.',409);latest.media||={};latest.media[kind]={...uploaded,book,type};saveSession(id,latest);return json(res,201,{uploaded:true,kind},allowedOrigin);}
 if(path==='/api/otp/send'&&req.method==='POST'){if(data.consent!==true)throw new Problem('Message consent is required.');const value=validateContact(data.factor,data.value),factor=data.factor;rate(digest(secret,'otp:'+value),5,3600000);if(s.challenges[factor]?.sentAt>Date.now()-60000)throw new Problem('Wait one minute before requesting another code.',429);const otp=code();s.challenges[factor]={value,hash:digest(secret,value+':'+otp),sentAt:Date.now(),expires:Date.now()+600000,attempts:0,used:false};delete s.verified[factor];saveSession(id,s);try{await messages.otp(factor,value,otp);}catch{delete s.challenges[factor];saveSession(id,s);throw new Problem('The verification message could not be sent. Please try again.',502);}return json(res,200,{sent:true},allowedOrigin);}
 if(path==='/api/otp/verify'&&req.method==='POST'){const value=validateContact(data.factor,data.value);try{s.verified[data.factor]=verifyChallenge(s.challenges[data.factor],{value,code:String(data.code||'')},secret);}finally{saveSession(id,s);}return json(res,200,{verified:true},allowedOrigin);}
 if(path==='/api/passkey/options'&&req.method==='POST'){const auth=await passkeys();s.userHandle||=token();const options=await auth.generateRegistrationOptions({rpName:'New Tibet',rpID:env.RP_ID,userID:Buffer.from(s.userHandle,'base64url'),userName:s.verified.email||'member-'+s.userHandle.slice(0,12),attestationType:'none',authenticatorSelection:{residentKey:'required',userVerification:'required'},supportedAlgorithmIDs:[-7,-257],extensions:{prf:{}}});s.passkeyChallenge={value:options.challenge,expires:Date.now()+300000};saveSession(id,s);return json(res,200,options,allowedOrigin);}
 if(path==='/api/passkey/verify'&&req.method==='POST'){if(!s.passkeyChallenge||s.passkeyChallenge.expires<Date.now())throw new Problem('Passkey challenge expired. Try again.');const challenge=s.passkeyChallenge.value;delete s.passkeyChallenge;saveSession(id,s);const auth=await passkeys();let result;try{result=await auth.verifyRegistrationResponse({response:data.credential,expectedChallenge:challenge,expectedOrigin:env.FRONTEND_ORIGIN,expectedRPID:env.RP_ID,requireUserVerification:true});}catch{throw new Problem('Passkey verification failed. Please try again.');}if(!result.verified||!result.registrationInfo)throw new Problem('Passkey verification failed.');const cred=result.registrationInfo.credential;s.passkey={id:cred.id,publicKey:Buffer.from(cred.publicKey).toString('base64url'),counter:cred.counter,transports:cred.transports||[],prfSupported:Boolean(data.credential.clientExtensionResults?.prf?.enabled),userHandle:s.userHandle};if(s.reference){const app=appByReference(s.reference);const used=db.prepare("SELECT reference FROM applications WHERE json_extract(data,'$.passkey.id')=? AND reference<>?").get(s.passkey.id,s.reference);if(used)throw new Problem('This credential is already used.',409);app.passkey=s.passkey;saveApp(app);queue(app.reference,'sheet');}saveSession(id,s);return json(res,200,{verified:true},allowedOrigin);}
 if(path==='/api/applications'&&req.method==='POST'){if(s.reference){const app=appByReference(s.reference);return json(res,200,{reference:app.reference,status:app.status,notification:app.registrationMessage},allowedOrigin);}const existing=db.prepare('SELECT data FROM applications WHERE session_id=?').get(id);if(existing){const app=JSON.parse(existing.data);return json(res,200,{reference:app.reference,status:app.status,notification:app.registrationMessage},allowedOrigin);}if(s.submitting&&s.submittingAt>Date.now()-120000)throw new Problem('Your submission is already being processed.',409);const validated=validateApplication(data,s);s.submitting=true;s.submittingAt=Date.now();s.submissionReference||='NT-'+randomUUID().toUpperCase();saveSession(id,s);try{const reference=s.submissionReference;const passport=s.passport?.verified&&s.passport.expires>Date.now()?s.passport:null;if(passport){const claim=db.prepare('SELECT * FROM passport_claims WHERE nullifier=? AND session_id=? AND expires>? AND reference IS NULL').get(passport.nullifier,id,Date.now());if(!claim)throw new Problem('Verify your passport again before submitting.',403);db.prepare('UPDATE passport_claims SET expires=? WHERE nullifier=? AND session_id=?').run(Date.now()+3600000,passport.nullifier,id);}const app={...validated,reference,createdAt:new Date().toISOString(),status:'pending',photoURL:s.media.identity.url,photoId:s.media.identity.id,media:s.media,challengeCode:s.mediaChallenge.code,passport:passport?{verified:true,proofs:passport.proofs,nullifier:passport.nullifier,verifiedAt:passport.verifiedAt}:null,verificationTier:passport?'enhanced':'book',verificationDeleteAt:validated.consentVersion==='2026-10-09'?new Date(Date.now()+60*86400000).toISOString():null,passkey:s.passkey||null,registrationMessage:validated.whatsapp?'queued':'in-app'};await store.append(app);db.exec('BEGIN');try{db.prepare('INSERT INTO applications VALUES(?,?,?)').run(reference,id,JSON.stringify(app));if(passport)db.prepare('UPDATE passport_claims SET reference=? WHERE nullifier=? AND session_id=?').run(reference,passport.nullifier,id);notifications.record(app,id);if(app.whatsapp)queue(reference,'registration');s.reference=reference;s.submitting=false;saveSession(id,s);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return json(res,201,{reference,status:'pending',notification:app.registrationMessage},allowedOrigin);}catch(e){s.submitting=false;saveSession(id,s);// Keep any private upload for an idempotent retry with the same reference.
if(e instanceof Problem)throw e;throw new Problem('Your application could not be stored. Please try again.',502);}}
 if(path==='/api/statistics/countries'&&req.method==='GET')return json(res,200,{countries:db.prepare('SELECT country,count FROM country_totals WHERE count>=10 ORDER BY country').all()},allowedOrigin);
 if(path==='/api/account/contacts'&&req.method==='POST'){
  if(!s.reference)throw new Problem('Submit an application first.',404);
  const app=appByReference(s.reference);
  for(const factor of ['email','whatsapp']){const value=String(data[factor]||'').trim()?validateContact(factor,data[factor]):'';if(value&&s.verified?.[factor]!==value&&app[factor]!==value)throw new Problem('Verify the optional contact first.',403);app[factor]=value;}
  if(!app.whatsapp){app.registrationMessage='in-app';app.decisionMessage='in-app';db.prepare("DELETE FROM jobs WHERE reference=? AND kind IN ('registration','decision') AND state='queued'").run(app.reference);}
  if(data.country){if(data.countryConsent!==true||!['DE','IN','NP','BT','GB','US','CA','AU','FR','CH','AT','IT','SE','ZZ'].includes(data.country))throw new Problem('Choose a country and consent to the totals.');}
  db.exec('BEGIN');try{if(data.country&&!app.countryStatsCounted){db.prepare('INSERT INTO country_totals VALUES(?,1) ON CONFLICT(country) DO UPDATE SET count=count+1').run(data.country);app.countryStatsCounted=true;}saveApp(app);queue(app.reference,'sheet');db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}return json(res,200,{saved:true},allowedOrigin);
 }
 if(path==='/api/applications/status'&&req.method==='GET'){if(!s.reference)throw new Problem('No application in this session.',404);const app=appByReference(s.reference);return json(res,200,{reference:app.reference,status:app.status},allowedOrigin);}
 throw new Problem('Endpoint not found.',404);
 }catch(e){if(!(e instanceof Problem))console.error('Request failed:',e.name);json(res,e.status||500,{error:e instanceof Problem?e.message:'The service is temporarily unavailable. Please try again.'},allowedOrigin);}});
 server.on('close',()=>{clearInterval(timer);db.close();});return {server,db,processJobs,processRetention:retention.run,processMaintenance};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const {server}=createApp();server.listen(Number(process.env.PORT||4173),'0.0.0.0',()=>console.log('New Tibet server listening on port '+(process.env.PORT||4173)));}
