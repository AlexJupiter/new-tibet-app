import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../backend/server.mjs';
import {createNotifications} from '../backend/notifications.mjs';
import {digest} from '../backend/core.mjs';

test('logout revokes the current bearer without removing membership, notifications, passkeys or another session',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'nt-logout-'));
 const env={APP_MODE:'live',NODE_ENV:'test',DATA_DIR:directory,SESSION_SECRET:'test-session-secret-32-characters-long',PASSPORT_UNIQUENESS_SECRET:'test-passport-secret-32-characters-long',FRONTEND_ORIGIN:'http://localhost:4173',RP_ID:'localhost',REVIEW_WEBHOOK_SECRET:'test-review-secret-32-characters-long',REVIEWER_EMAILS:'reviewer@example.org',GOOGLE_APPLICATION_CREDENTIALS:'mock',GOOGLE_DRIVE_FOLDER_ID:'mock',GOOGLE_SHEET_ID:'mock'};
 const removed=[];
 const app=createApp(env,{database:':memory:',store:{removeVerificationMedia:async data=>removed.push(data)},passkeys:async()=>({generateAuthenticationOptions:async()=>({challenge:'sign-in'}),verifyAuthenticationResponse:async()=>({verified:true,authenticationInfo:{newCounter:1}})})});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+app.server.address().port;
 const call=async(path,{body,token='',origin=env.FRONTEND_ORIGIN}={})=>{
  const response=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {status:response.status,data:await response.json()};
 };
 try{
  const owner=(await call('session',{body:{}})).data.token,ownerRow=app.db.prepare('SELECT * FROM sessions').get();
  const application={reference:'NT-LOGOUT-1234',name:'Display alias',book:'green',status:'accepted',createdAt:new Date().toISOString(),passkey:{id:'fixture-key',userHandle:'fixture-user',publicKey:'AQID',counter:0}};
  app.db.prepare('UPDATE sessions SET data=? WHERE id=?').run(JSON.stringify({...JSON.parse(ownerRow.data),reference:application.reference}),ownerRow.id);
  app.db.prepare('INSERT INTO applications VALUES(?,?,?)').run(application.reference,ownerRow.id,JSON.stringify(application));
  const notifications=createNotifications(app.db);const receipt=notifications.record(application,ownerRow.id);notifications.markRead(ownerRow.id,[receipt.id]);
  const other=(await call('session',{body:{}})).data.token;
  assert.equal((await call('notifications',{token:owner})).data.application.name,'Display alias');
  assert.equal((await call('auth/logout',{body:{},token:owner,origin:'https://untrusted.example'})).status,403);
  assert.equal((await call('auth/logout',{body:{}})).status,401);
  assert.equal((await call('auth/logout',{body:{},token:owner})).status,200);
  assert.equal((await call('auth/logout',{body:{},token:owner})).status,200);
  for(const path of ['notifications','applications/status','cards/profile'])assert.equal((await call(path,{token:owner})).status,401);
  assert.equal((await call('auth/options',{body:{},token:owner})).status,401);
  assert.equal((await call('notifications',{token:other})).status,200);
  assert.equal(app.db.prepare('SELECT count(*) AS n FROM applications').get().n,1);
  assert.deepEqual(JSON.parse(app.db.prepare('SELECT data FROM applications').get().data),application);
  assert.deepEqual(JSON.parse(app.db.prepare('SELECT data FROM sessions WHERE id=?').get(ownerRow.id).data),{reference:application.reference});
  assert.equal((await call('auth/options',{body:{},token:other})).status,200);
  const login=await call('auth/verify',{body:{credential:{id:'fixture-key',response:{userHandle:'fixture-user'}}},token:other});
  assert.equal(login.status,200);assert.equal(login.data.application.reference,application.reference);
  const restored=await call('notifications',{token:other});assert.equal(restored.data.application.name,'Display alias');assert.equal(restored.data.items.find(item=>item.id===receipt.id).read,true);
  assert.equal((await call('notifications',{token:owner})).status,401);
  const pending=(await call('session',{body:{}})).data.token,pendingId=digest(env.SESSION_SECRET,pending);
  const upload={submissionReference:'NT-ABANDONED-1234',media:{front:{id:'private-upload'}},verified:{email:'private@example.org'},authChallenge:{value:'old-auth-challenge'}};
  app.db.prepare('UPDATE sessions SET data=? WHERE id=?').run(JSON.stringify(upload),pendingId);
  await call('auth/logout',{body:{},token:pending});
  const cleanup=JSON.parse(app.db.prepare('SELECT data FROM sessions WHERE id=?').get(pendingId).data);
  assert.deepEqual(cleanup,{submissionReference:upload.submissionReference,media:upload.media});
  await app.processRetention({force:true});assert.deepEqual(removed,[{reference:upload.submissionReference,media:upload.media}]);
  assert.equal(app.db.prepare('SELECT id FROM sessions WHERE id=?').get(pendingId),undefined);
  assert.equal((await call('notifications',{token:pending})).status,401);
 }finally{await new Promise(resolve=>app.server.close(resolve));rmSync(directory,{recursive:true,force:true});}
});

test('stored application notifications use current reward wording without changing announcement text or read state',()=>{
 const directory=mkdtempSync(join(tmpdir(),'nt-reward-copy-')),app=createApp({DATA_DIR:directory},{database:':memory:'});
 try{
  const notifications=createNotifications(app.db),event=notifications.record({reference:'NT-REWARD-1234',status:'accepted',book:'green'},'owner');
  app.db.prepare('UPDATE notifications SET data=? WHERE id=?').run(JSON.stringify({...event,body:'Old signup offer wording.'}),event.id);notifications.markRead('owner',[event.id]);
  const published=notifications.publish({id:'unchanged-community',title:'Community update',body:'The original community announcement stays unchanged.'});
  const items=notifications.list('owner'),current=items.find(item=>item.id===event.id);
  assert.match(current.body,/earned by completing membership setup/);assert.equal(current.read,true);assert.equal(current.id,event.id);
  assert.equal(items.find(item=>item.id===published.id).body,published.body);
 }finally{app.server.emit('close');rmSync(directory,{recursive:true,force:true});}
});
