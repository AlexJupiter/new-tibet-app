import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {generateKeyPairSync,verify,createHash} from 'node:crypto';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createMembershipCards,createApplePass,createGoogleSaveLink,applePassData} from '../backend/cards.mjs';
import {createApp} from '../backend/server.mjs';
const settings={MEMBERSHIP_CARD_SECRET:'test-card-secret-at-least-32-characters',CARD_FRONTEND_URL:'https://example.org/members/',FRONTEND_ORIGIN:'https://example.org'};
const application={reference:'NT-12345678-1234-4321-8765-123456789ABC',book:'green',status:'accepted',name:'Private Name',email:'private@example.org',whatsapp:'+447700900123',passport:{proofs:['private-proof']}};
function database(){const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE applications(reference TEXT PRIMARY KEY,session_id TEXT,data TEXT)');db.prepare('INSERT INTO applications VALUES(?,?,?)').run(application.reference,'owner',JSON.stringify(application));return db;}
function unzipStored(buffer){const files={};let offset=0;while(buffer.readUInt32LE(offset)===0x04034b50){assert.equal(buffer.readUInt16LE(offset+8),0);const size=buffer.readUInt32LE(offset+18),nameLength=buffer.readUInt16LE(offset+26),extra=buffer.readUInt16LE(offset+28),name=buffer.subarray(offset+30,offset+30+nameLength).toString(),start=offset+30+nameLength+extra;files[name]=buffer.subarray(start,start+size);offset=start+size;}return files;}

test('membership QR tokens are opaque, stable, private, and checked against current acceptance, revocation and expiration',()=>{
 const db=database();try{
  const cards=createMembershipCards(db,settings),card=cards.profile(application),token=new URLSearchParams(new URL(card.verificationURL).hash.slice(1)).get('card');
  assert.match(token,/^[-_A-Za-z0-9]{43}$/);assert(!card.verificationURL.includes(application.reference));assert.equal(cards.profile(application).verificationURL,card.verificationURL);assert.equal(card.apple,false);assert.equal(card.google,false);
  const checked=cards.verify(token);assert.equal(checked.valid,true);assert.equal(checked.reference,application.reference);for(const value of ['Private Name','private@example.org','447700900123','private-proof'])assert(!JSON.stringify(checked).includes(value));
  assert.equal(cards.verify(token.slice(0,-1)+'!').valid,false);assert.equal(cards.verify('A'.repeat(43)).valid,false);assert.equal(cards.verify({token}).valid,false);
  assert.throws(()=>cards.profile({...application,status:'pending'}),error=>error.status===403);
  db.prepare('UPDATE applications SET data=?').run(JSON.stringify({...application,status:'declined'}));assert.equal(cards.verify(token).valid,false);
  db.prepare('UPDATE applications SET data=?').run(JSON.stringify(application));db.exec('UPDATE membership_cards SET revoked=1');assert.equal(cards.verify(token).valid,false);assert.throws(()=>cards.profile(application),error=>error.status===403);
  db.exec("UPDATE membership_cards SET revoked=0,expires_at='2020-01-01T00:00:00Z'");assert.equal(cards.verify(token).valid,false);assert.throws(()=>cards.profile(application),error=>error.status===403);
 }finally{db.close();}
});
test('QR card configuration and key rotation fail closed',()=>{
 const db=database();try{
  assert.throws(()=>createMembershipCards(db,{}).profile(application),error=>error.status===503);
  assert.throws(()=>createMembershipCards(db,{...settings,CARD_FRONTEND_URL:'https://other.example/'}).profile(application),error=>error.status===503);
  const old=createMembershipCards(db,settings),token=new URLSearchParams(new URL(old.profile(application).verificationURL).hash.slice(1)).get('card');const changed=createMembershipCards(db,{...settings,MEMBERSHIP_CARD_SECRET:'different-card-secret-at-least-32-characters'});assert.equal(changed.verify(token).valid,false);assert.throws(()=>changed.profile(application),error=>error.status===403);
 }finally{db.close();}
});
test('Google Wallet links have a valid RSA signature and contain only membership metadata',()=>{
 const directory=mkdtempSync(join(tmpdir(),'nt-google-pass-')),db=database();try{
  const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});const path=join(directory,'service.json');writeFileSync(path,JSON.stringify({client_email:'wallet@example.iam.gserviceaccount.com',private_key:privateKey.export({format:'pem',type:'pkcs8'}),private_key_id:'key-id'}));
  const env={...settings,GOOGLE_WALLET_ISSUER_ID:'123456',GOOGLE_WALLET_CLASS_ID:'123456.membership',GOOGLE_WALLET_CREDENTIALS:path},cards=createMembershipCards(db,env),card=cards.profile(application);assert.equal(card.google,true);
  const {url}=createGoogleSaveLink(application,card,env),jwt=url.slice('https://pay.google.com/gp/v/save/'.length),[header,payload,signature]=jwt.split('.');assert.equal(JSON.parse(Buffer.from(header,'base64url')).alg,'RS256');assert(verify('RSA-SHA256',Buffer.from(header+'.'+payload),publicKey,Buffer.from(signature,'base64url')));
  const claims=JSON.parse(Buffer.from(payload,'base64url'));assert.equal(claims.aud,'google');assert.equal(claims.typ,'savetowallet');assert.deepEqual(claims.origins,['example.org']);const object=claims.payload.genericObjects[0];assert.equal(object.classId,env.GOOGLE_WALLET_CLASS_ID);assert.equal(object.barcode.value,card.verificationURL);assert.equal(object.state,'ACTIVE');assert.equal(object.header.defaultValue.value,'Member 789ABC');
  for(const value of ['Private Name','private@example.org','447700900123','private-proof'])assert(!Buffer.from(payload,'base64url').toString().includes(value));
  assert.throws(()=>createGoogleSaveLink(application,{...card,google:false},env),error=>error.status===503);
 }finally{db.close();rmSync(directory,{recursive:true,force:true});}
});
test('Apple Wallet packages contain the full manifest, QR barcode and a verifiable detached signature with its intermediate certificate',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'nt-apple-pass-')),db=database();const path=name=>join(directory,name);try{
  const openssl=(...args)=>execFileSync(process.env.OPENSSL_PATH||'openssl',args,{stdio:'pipe'});
  openssl('req','-x509','-newkey','rsa:2048','-nodes','-keyout',path('wwdr.key'),'-out',path('wwdr.pem'),'-days','2','-subj','/CN=Test WWDR');
  openssl('req','-newkey','rsa:2048','-nodes','-keyout',path('pass.key'),'-out',path('pass.csr'),'-subj','/UID=pass.org.newtibet.membership/OU=TESTTEAM/CN=Test Pass');
  openssl('x509','-req','-in',path('pass.csr'),'-CA',path('wwdr.pem'),'-CAkey',path('wwdr.key'),'-CAcreateserial','-out',path('pass.pem'),'-days','1');
  const env={...settings,APPLE_PASS_TYPE_ID:'pass.org.newtibet.membership',APPLE_TEAM_ID:'TESTTEAM',APPLE_PASS_CERTIFICATE:path('pass.pem'),APPLE_PASS_PRIVATE_KEY:path('pass.key'),APPLE_WWDR_CERTIFICATE:path('wwdr.pem')};const card=createMembershipCards(db,env).profile(application);assert.equal(card.apple,true);
  const bytes=await createApplePass(application,card,env),files=unzipStored(bytes),manifest=JSON.parse(files['manifest.json']);assert(files['icon@3x.png']);assert(files['logo@2x.png']);for(const [name,digest] of Object.entries(manifest))assert.equal(createHash('sha1').update(files[name]).digest('hex'),digest);
  const pass=JSON.parse(files['pass.json']);assert.equal(pass.barcodes[0].message,card.verificationURL);assert.equal(pass.barcodes[0].format,'PKBarcodeFormatQR');assert.equal(pass.passTypeIdentifier,env.APPLE_PASS_TYPE_ID);assert.equal(pass.generic.primaryFields[0].value,'Member 789ABC');for(const value of ['Private Name','private@example.org','447700900123','private-proof'])assert(!files['pass.json'].toString().includes(value));
  writeFileSync(path('manifest.json'),files['manifest.json']);writeFileSync(path('signature'),files.signature);openssl('cms','-verify','-binary','-inform','DER','-in',path('signature'),'-content',path('manifest.json'),'-CAfile',path('wwdr.pem'),'-purpose','any','-out',path('verified'));assert.deepEqual(readFileSync(path('verified')),files['manifest.json']);
  assert.equal(applePassData({...application,book:'blue'},card,env).generic.secondaryFields[0].value,'Blue Book supporter');await assert.rejects(createApplePass(application,card,{...env,APPLE_TEAM_ID:'WRONGTEAM'}),error=>error.status===503);
 }finally{db.close();rmSync(directory,{recursive:true,force:true});}
});
test('Wallet endpoints require the application owner, accepted status and issuer setup; public checks reveal no private data',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'nt-card-api-'));const env={...settings,APP_MODE:'live',NODE_ENV:'test',DATA_DIR:directory,SESSION_SECRET:'test-session-secret-32-characters-long',PASSPORT_UNIQUENESS_SECRET:'test-passport-secret-32-characters-long',RP_ID:'example.org',REVIEW_WEBHOOK_SECRET:'test-review-secret-32-characters-long',REVIEWER_EMAILS:'reviewer@example.org',GOOGLE_APPLICATION_CREDENTIALS:'mock',GOOGLE_DRIVE_FOLDER_ID:'mock',GOOGLE_SHEET_ID:'mock'};const app=createApp(env,{database:':memory:'});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+app.server.address().port;
 const call=async(path,body,bearer='')=>{const res=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{Origin:env.FRONTEND_ORIGIN,'Content-Type':'application/json',...(bearer?{Authorization:'Bearer '+bearer}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:res.status,data:await res.json()};};
 try{
  assert.equal((await call('cards/profile')).status,401);const owner=(await call('session',{})).data.token;const session=app.db.prepare('SELECT * FROM sessions').get();app.db.prepare('UPDATE sessions SET data=? WHERE id=?').run(JSON.stringify({...JSON.parse(session.data),reference:application.reference}),session.id);app.db.prepare('INSERT INTO applications VALUES(?,?,?)').run(application.reference,session.id,JSON.stringify({...application,status:'pending'}));
  assert.equal((await call('cards/profile',undefined,owner)).status,403);assert.equal((await call('cards/google',{},owner)).status,403);
  app.db.prepare('UPDATE applications SET data=?').run(JSON.stringify(application));const result=await call('cards/profile',undefined,owner);assert.equal(result.status,200);const token=new URLSearchParams(new URL(result.data.verificationURL).hash.slice(1)).get('card');const scan=await call('cards/verify',{card:token});assert.equal(scan.status,200);assert.equal(scan.data.valid,true);assert(!JSON.stringify(scan).includes('private@example.org'));
  assert.equal((await call('cards/apple',{},owner)).status,503);assert.equal((await call('cards/google',{},owner)).status,503);
  // Enabling issuers produces actual save links and one-use native pass downloads.
  const openssl=(...args)=>execFileSync(process.env.OPENSSL_PATH||'openssl',args,{stdio:'pipe'}),path=name=>join(directory,name);
  openssl('req','-x509','-newkey','rsa:2048','-nodes','-keyout',path('ca.key'),'-out',path('ca.pem'),'-days','2','-subj','/CN=Test Issuer');
  openssl('req','-newkey','rsa:2048','-nodes','-keyout',path('pass.key'),'-out',path('pass.csr'),'-subj','/UID=pass.org.newtibet.membership/OU=TESTTEAM/CN=Test Pass');
  openssl('x509','-req','-in',path('pass.csr'),'-CA',path('ca.pem'),'-CAkey',path('ca.key'),'-CAcreateserial','-out',path('pass.pem'),'-days','1');
  Object.assign(env,{APPLE_PASS_TYPE_ID:'pass.org.newtibet.membership',APPLE_TEAM_ID:'TESTTEAM',APPLE_PASS_CERTIFICATE:path('pass.pem'),APPLE_PASS_PRIVATE_KEY:path('pass.key'),APPLE_WWDR_CERTIFICATE:path('ca.pem')});
  const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});writeFileSync(path('google.json'),JSON.stringify({client_email:'wallet@example.iam.gserviceaccount.com',private_key:privateKey.export({format:'pem',type:'pkcs8'})}));Object.assign(env,{GOOGLE_WALLET_ISSUER_ID:'123456',GOOGLE_WALLET_CLASS_ID:'123456.membership',GOOGLE_WALLET_CREDENTIALS:path('google.json')});
  const ready=await call('cards/profile',undefined,owner);assert.equal(ready.data.apple,true);assert.equal(ready.data.google,true);assert.match((await call('cards/google',{},owner)).data.url,/^https:\/\/pay\.google\.com\/gp\/v\/save\//);
  const ticket=await call('cards/apple',{},owner);assert.equal(ticket.status,200);assert.match(ticket.data.path,/^\/api\/cards\/apple\/download\/[-_A-Za-z0-9]{43}$/);
  const download=await fetch(base+ticket.data.path);assert.equal(download.status,200);assert.equal(download.headers.get('content-type'),'application/vnd.apple.pkpass');assert(unzipStored(Buffer.from(await download.arrayBuffer()))['signature']);assert.equal((await fetch(base+ticket.data.path)).status,410);
  const revoked=await call('cards/apple',{},owner);app.db.exec('UPDATE membership_cards SET revoked=1');assert.equal((await fetch(base+revoked.data.path)).status,403);
  const stranger=(await call('session',{})).data.token;assert.equal((await call('cards/profile',undefined,stranger)).status,404);assert.equal((await call('cards/apple',{},stranger)).status,404);assert.equal((await call('cards/apple/download/unknown')).status,410);
 }finally{await new Promise(resolve=>app.server.close(resolve));rmSync(directory,{recursive:true,force:true});}
});
