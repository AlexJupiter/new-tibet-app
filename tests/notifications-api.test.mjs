import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../backend/server.mjs';
import {createNotifications} from '../backend/notifications.mjs';
const env={APP_MODE:'live',NODE_ENV:'test',SESSION_SECRET:'test-session-secret-32-characters-long',PASSPORT_UNIQUENESS_SECRET:'test-passport-secret-32-characters-long',FRONTEND_ORIGIN:'http://localhost:4173',RP_ID:'localhost',REVIEW_WEBHOOK_SECRET:'test-review-secret-32-characters-long',REVIEWER_EMAILS:'reviewer@example.org',GOOGLE_APPLICATION_CREDENTIALS:'mock',GOOGLE_DRIVE_FOLDER_ID:'mock',GOOGLE_SHEET_ID:'mock'};
test('contact-free membership gets durable private receipts and announcements without messaging a contact',async()=>{
 let sent=0,verifyInput;
 const app=createApp({...env,DATA_DIR:mkdtempSync(join(tmpdir(),'nt-inbox-api-'))},{database:':memory:',store:{media:async()=>({id:'private',url:'https://example.org/private'}),append:async()=>{},update:async()=>{}},messages:{registration:async()=>{sent++;},decision:async()=>{sent++;}},verifyPassport:async()=>({verified:true,uniqueIdentifier:'contact-free-passport',uniqueIdentifierType:0}),passkeys:async()=>({generateRegistrationOptions:async options=>({challenge:'register',user:options.userName}),verifyRegistrationResponse:async()=>({verified:true,registrationInfo:{credential:{id:'stored-passkey',publicKey:new Uint8Array([1,2,3]),counter:0}}}),generateAuthenticationOptions:async()=>({challenge:'sign-in'}),verifyAuthenticationResponse:async input=>{verifyInput=input;return{verified:input.response.testValid===true,authenticationInfo:{newCounter:1}};}})});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+app.server.address().port;let bearer='';
 const call=async(path,body,auth=bearer)=>{const response=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{Origin:env.FRONTEND_ORIGIN,'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,data:await response.json()};};
 try{
  bearer=(await call('session',{})).data.token;
  const keyOptions=await call('passkey/options',{});assert.equal(keyOptions.status,200);assert.match(keyOptions.data.user,/^member-/);
  assert.equal((await call('passkey/verify',{credential:{clientExtensionResults:{}}})).status,200);
  await call('media/challenge',{});const challenge=(await call('passport/challenge',{})).data;
  const passport={proofs:[{proof:'0'.repeat(64),name:'test'}],result:{age:{gte:{expected:18,result:true}},bind:{custom_data:challenge.nonce},facematch:{mode:'strict',passed:true}}};assert.equal((await call('passport/verify',passport)).status,200);
  for(const kind of ['front','back','identity','challenge','video']){
   const bytes=kind==='video'?Buffer.concat([Buffer.from([0x1a,0x45,0xdf,0xa3]),Buffer.alloc(200)]):Buffer.concat([Buffer.from([255,216]),Buffer.alloc(200),Buffer.from([255,217])]);
   const response=await fetch(base+'/api/media/upload?kind='+kind+'&book=green',{method:'POST',headers:{Origin:env.FRONTEND_ORIGIN,Authorization:'Bearer '+bearer,'X-Review-Consent':'2026-10-08','Content-Type':kind==='video'?'video/webm':'image/jpeg'},body:bytes});assert.equal(response.status,201);
  }
  assert.equal((await call('applications',{book:'green',consent:true,consentVersion:'2026-10-08'})).status,400);
  const result=await call('applications',{name:'Snow Lion',book:'green',consent:true,consentVersion:'2026-10-08'});assert.equal(result.status,201);assert.equal(result.data.notification,'in-app');
  const receipt=await call('notifications');assert.equal(receipt.data.items.length,1);assert.equal(receipt.data.items[0].status,'pending');assert.equal(receipt.data.application.name,'Snow Lion');assert.equal(receipt.data.application.passportVerified,true);assert(!JSON.stringify(receipt.data).includes('proofs'));
  const decision={reference:result.data.reference,status:'accepted',reviewedBy:'reviewer@example.org'};
  assert.equal((await call('reviews/decision',decision,env.REVIEW_WEBHOOK_SECRET)).status,200);await call('reviews/decision',decision,env.REVIEW_WEBHOOK_SECRET);
  assert.equal((await call('notifications')).data.items.length,2);await app.processJobs();assert.equal(sent,0);
  const announcement={id:'important-update',publishedBy:'reviewer@example.org',title:'New Tibet announcement',body:'An important community update for New Tibet members.'};
  assert.equal((await call('admin/announcements',announcement)).status,401);assert.equal((await call('admin/announcements',{...announcement,publishedBy:'other'},env.REVIEW_WEBHOOK_SECRET)).status,403);assert.equal((await call('admin/announcements',announcement,env.REVIEW_WEBHOOK_SECRET)).status,201);
  assert.equal((await call('notifications',{body:'An unauthorized reply'})).status,404);
  const ownerToken=bearer;bearer=(await call('session',{},'')).data.token;
  assert.equal((await call('notifications')).data.items.length,1);assert.equal((await call('notifications/read',{ids:[result.data.reference+':accepted']})).status,404);
  await call('auth/options',{});assert.equal((await call('auth/verify',{credential:{id:'stored-passkey',response:{userHandle:'wrong'},testValid:true}})).status,401);
  const stored=JSON.parse(app.db.prepare('SELECT data FROM applications').get().data);
  await call('auth/options',{});assert.equal((await call('auth/verify',{credential:{id:'stored-passkey',response:{userHandle:stored.passkey.userHandle},testValid:false}})).status,401);
  await call('auth/options',{});const signed=await call('auth/verify',{credential:{id:'stored-passkey',response:{userHandle:stored.passkey.userHandle},testValid:true}});assert.equal(signed.status,200);assert.equal(verifyInput.requireUserVerification,true);assert.equal(verifyInput.expectedOrigin,env.FRONTEND_ORIGIN);assert.equal(verifyInput.expectedRPID,env.RP_ID);assert.equal(signed.data.application.reference,result.data.reference);
  assert.equal((await call('auth/verify',{credential:{}})).status,401);
  const feed=await call('notifications');assert.equal(feed.data.items.length,3);
  const eventId=result.data.reference+':accepted';assert.equal((await call('notifications/read',{ids:[eventId]})).status,200);
  assert.equal((await call('notifications',undefined,ownerToken)).data.items.find(item=>item.id===eventId).read,true);
  assert.equal((await call('applications',{})).data.reference,result.data.reference);
  assert.equal(app.db.prepare('SELECT count(*) AS n FROM applications').get().n,1);
 }finally{await new Promise(resolve=>app.server.close(resolve));}
});

test('inbox records and read state survive backend restart and legacy applications are backfilled once',()=>{
 const settings={...env,DATA_DIR:mkdtempSync(join(tmpdir(),'nt-inbox-persistent-'))};
 let app=createApp(settings);const application={reference:'NT-PERSIST-1234',status:'accepted',book:'green',createdAt:'2026-10-08T10:00:00Z',reviewedAt:'2026-10-08T11:00:00Z'};
 app.db.prepare('INSERT INTO applications VALUES(?,?,?)').run(application.reference,'owner',JSON.stringify(application));app.server.emit('close');
 app=createApp(settings);let notifications=createNotifications(app.db);assert.equal(notifications.list('owner').length,2);
 const announcement=notifications.publish({id:'persistent-announcement',title:'Community announcement',body:'A durable New Tibet update for all members.'});notifications.markRead('owner',[announcement.id,application.reference+':accepted']);app.server.emit('close');
 app=createApp(settings);try{notifications=createNotifications(app.db);const items=notifications.list('owner');assert.equal(items.length,3);assert.equal(items.filter(item=>item.read).length,2);assert.equal(notifications.list('other-member').length,1);}finally{app.server.emit('close');}
});
