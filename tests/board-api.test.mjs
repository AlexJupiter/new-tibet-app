import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createApp} from '../backend/server.mjs';
const env={APP_MODE:'live',NODE_ENV:'test',DATA_DIR:mkdtempSync(join(tmpdir(),'nt-board-test-')),PASSPORT_UNIQUENESS_SECRET:'p'.repeat(40),SESSION_SECRET:'s'.repeat(40),REVIEW_WEBHOOK_SECRET:'r'.repeat(40),FRONTEND_ORIGIN:'https://example.org',RP_ID:'example.org',REVIEWER_EMAILS:'reviewer@example.org',GOOGLE_APPLICATION_CREDENTIALS:'unused',GOOGLE_DRIVE_FOLDER_ID:'private',GOOGLE_SHEET_ID:'private'};
test('base membership works without NFC; authenticated NFC/passkey/contact upgrades persist and country totals do not retain an individual country',async()=>{
 const codes={},updates=[],app=createApp(env,{database:':memory:',store:{media:async(ref)=>({id:ref,url:'private'}),append:async()=>{},update:async data=>updates.push(data)},messages:{otp:async(f,v,c)=>{codes[f]=c;}},verifyPassport:async()=>({verified:true,uniqueIdentifier:'unique-passport',uniqueIdentifierType:0}),passkeys:async()=>({generateRegistrationOptions:async()=>({challenge:'challenge'}),verifyRegistrationResponse:async()=>({verified:true,registrationInfo:{credential:{id:'test-key',publicKey:Buffer.from('public-key'),counter:0,transports:[]}}})})});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;let token;
 const call=async(path,body,auth=token)=>{const res=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{Origin:env.FRONTEND_ORIGIN,'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:res.status,data:await res.json()};};
 try{
  token=(await call('session',{})).data.token;await call('media/challenge',{});
  for(const kind of ['front','back','identity','challenge','video']){const bytes=kind==='video'?Buffer.concat([Buffer.from([0x1a,0x45,0xdf,0xa3]),Buffer.alloc(200)]):Buffer.concat([Buffer.from([255,216]),Buffer.alloc(200),Buffer.from([255,217])]);const response=await fetch(base+'/api/media/upload?book=green&kind='+kind,{method:'POST',headers:{Origin:env.FRONTEND_ORIGIN,Authorization:'Bearer '+token,'X-Review-Consent':'2026-10-09','Content-Type':kind==='video'?'video/webm':'image/jpeg'},body:bytes});assert.equal(response.status,201);}
  const submitted=await call('applications',{name:'Snow Lion',book:'green',consent:true,consentVersion:'2026-10-09'});assert.equal(submitted.status,201);
  let saved=JSON.parse(app.db.prepare('SELECT data FROM applications').get().data);assert.equal(saved.passport,null);assert.equal(saved.verificationTier,'book');assert(Math.abs(Date.parse(saved.verificationDeleteAt)-Date.parse(saved.createdAt)-60*86400000)<1000);
  await call('reviews/decision',{reference:saved.reference,status:'accepted',reviewedBy:'reviewer@example.org'},env.REVIEW_WEBHOOK_SECRET);
  const challenge=(await call('passport/challenge',{})).data;
  const proof={proofs:[{proof:'0'.repeat(64),name:'test'}],result:{age:{gte:{expected:18,result:true}},bind:{custom_data:challenge.nonce},facematch:{mode:'strict',passed:true}}};assert.equal((await call('passport/verify',proof)).status,200);
  saved=JSON.parse(app.db.prepare('SELECT data FROM applications').get().data);assert.equal(saved.passport.verified,true);assert.equal(saved.passport.proofs,undefined);assert.equal(app.db.prepare('SELECT reference FROM passport_claims').get().reference,saved.reference);assert.equal((await call('passport/verify',proof)).status,400);
  assert.equal((await call('passkey/options',{})).status,200);assert.equal((await call('passkey/verify',{credential:{clientExtensionResults:{}}})).status,200);assert.equal(JSON.parse(app.db.prepare('SELECT data FROM applications').get().data).passkey.id,'test-key');
  assert.equal((await call('account/contacts',{email:'unverified@example.org'})).status,403);
  await call('otp/send',{factor:'email',value:'member@example.org',consent:true});await call('otp/verify',{factor:'email',value:'member@example.org',code:codes.email});
  assert.equal((await call('account/contacts',{email:'member@example.org',country:'DE',countryConsent:true})).status,200);assert.equal((await call('account/contacts',{country:'DE',countryConsent:true})).status,200);
  saved=JSON.parse(app.db.prepare('SELECT data FROM applications').get().data);assert.equal(saved.country,undefined);assert.equal(saved.countryStatsCounted,true);assert.equal(app.db.prepare('SELECT count FROM country_totals').get().count,1);assert.deepEqual((await call('statistics/countries')).data.countries,[]);
  app.db.prepare('UPDATE country_totals SET count=10').run();assert.deepEqual((await call('statistics/countries')).data.countries,[{country:'DE',count:10}]);
  await app.processJobs();assert.equal(updates.length,1);assert.equal(app.db.prepare("SELECT state FROM jobs WHERE kind='sheet'").get().state,'sent');
  assert.equal((await call('account/contacts',{email:'member@example.org'})).status,200);assert.equal(app.db.prepare("SELECT state FROM jobs WHERE kind='sheet'").get().state,'queued');
  await app.processJobs();assert.equal(updates.length,2);assert.equal(updates[1].email,'member@example.org');assert.equal(updates[1].passkey.id,'test-key');assert.equal(updates[1].passport.verified,true);
  assert.equal((await call('interest',{email:'interest@example.org',consent:false},'')).status,400);assert.equal((await call('interest',{email:'interest@example.org',consent:true},'')).status,201);assert.equal((await call('interest',{email:'interest@example.org',consent:true},'')).status,201);assert.equal(app.db.prepare('SELECT count(*) AS n FROM interest_subscriptions').get().n,1);
  const other=(await call('session',{})).data.token;assert.equal((await call('account/contacts',{},other)).status,404);
 }finally{await new Promise(r=>app.server.close(r));}
});

test('walkthrough video supports browser seeking with byte ranges and serves readable captions and transcript',async()=>{
 const app=createApp({APP_MODE:'demo',DATA_DIR:env.DATA_DIR},{database:':memory:'});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
 const path='/assets/walkthrough/new-tibet-walkthrough.mp4',source=readFileSync('public'+path);
 try{
  const full=await fetch(base+path);assert.equal(full.status,200);assert.equal(full.headers.get('content-length'),String(source.length));assert.equal(full.headers.get('accept-ranges'),'bytes');await full.arrayBuffer();
  for(const [range,start,end]of [['bytes=0-15',0,15],['bytes=1024-2047',1024,2047],['bytes=-32',source.length-32,source.length-1],['bytes='+(source.length-16)+'-',source.length-16,source.length-1]]){
   const response=await fetch(base+path,{headers:{Range:range}});assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),'bytes '+start+'-'+end+'/'+source.length);assert.deepEqual(Buffer.from(await response.arrayBuffer()),source.subarray(start,end+1));
  }
  for(const range of ['bytes='+source.length+'-','bytes=50-10','bytes=-0','bytes=0-1,5-6']){const response=await fetch(base+path,{headers:{Range:range}});assert.equal(response.status,416);assert.equal(response.headers.get('content-range'),'bytes */'+source.length);assert.equal((await response.arrayBuffer()).byteLength,0);}
  assert.match((await fetch(base+'/assets/walkthrough/captions.vtt')).headers.get('content-type'),/^text\/vtt/);
  assert.match((await fetch(base+'/assets/walkthrough/transcript.txt')).headers.get('content-type'),/^text\/plain/);
 }finally{await new Promise(r=>app.server.close(r));}
});

test('maintenance finishes in-flight updates before deletion and preserves newly added account security',async()=>{
 let start,release;const started=new Promise(r=>{start=r;}),blocked=new Promise(r=>{release=r;});const calls=[],synced=[];
 const app=createApp(env,{database:':memory:',store:{clearVerification:async()=>{calls.push('cleanup');},update:async data=>synced.push(data)},messages:{registration:async()=>{calls.push('message start');start();await blocked;calls.push('message end');return 'sent';}}});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 try{
  const record={reference:'NT-MAINTENANCE',createdAt:'2026-01-01T00:00:00Z',consentVersion:'2026-10-09',verificationDeleteAt:'2026-03-02T00:00:00Z',status:'accepted',book:'green',media:{identity:{id:'private-file'}},reviewNote:'Private review note'};
  app.db.prepare('INSERT INTO applications VALUES(?,?,?)').run(record.reference,'session',JSON.stringify(record));
  app.db.prepare('INSERT INTO jobs(id,reference,kind,due) VALUES(?,?,?,0)').run(record.reference+':registration',record.reference,'registration');
  const first=app.processMaintenance();await started;
  await app.processMaintenance();assert.deepEqual(calls,['message start']);
  const latest={...record,passkey:{id:'newly-added-key'},email:'new-contact@example.org'};app.db.prepare('UPDATE applications SET data=?').run(JSON.stringify(latest));
  release();await first;assert.deepEqual(calls,['message start','message end','cleanup']);
  const saved=JSON.parse(app.db.prepare('SELECT data FROM applications').get().data);assert.equal(saved.passkey.id,'newly-added-key');assert.equal(saved.email,'new-contact@example.org');assert.equal(saved.media,undefined);assert.equal(saved.reviewNote,undefined);assert(saved.verificationDeletedAt);
  await app.processMaintenance();assert.equal(synced.length,1);assert.equal(synced[0].media,undefined);assert(synced[0].verificationDeletedAt);
 }finally{release();await new Promise(r=>app.server.close(r));}
});
