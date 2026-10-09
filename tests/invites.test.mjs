import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../backend/server.mjs';
import {digest} from '../backend/core.mjs';
import {canInvite,createDemoInvite,redeemDemoInvite,invitationMessage,membershipLabel} from '../public/invites.js';
import {initialDemoBalances,applyDemoVerificationReward,canUsePetitions} from '../public/member-model.js';
import {recordApplicationEvent,saveDemoInbox,restoreDemoInbox} from '../public/inbox-model.js';

const env={APP_MODE:'live',NODE_ENV:'test',DATA_DIR:mkdtempSync(join(tmpdir(),'nt-invite-test-')),PASSPORT_UNIQUENESS_SECRET:'p'.repeat(40),SESSION_SECRET:'s'.repeat(40),REVIEW_WEBHOOK_SECRET:'r'.repeat(40),FRONTEND_ORIGIN:'https://example.org',RP_ID:'example.org',REVIEWER_EMAILS:'reviewer@example.org',GOOGLE_APPLICATION_CREDENTIALS:'unused',GOOGLE_DRIVE_FOLDER_ID:'private',GOOGLE_SHEET_ID:'private'};
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key),values};};

test('demo invitations are portable, detect typos, distinguish membership and persist no raw codes',async()=>{
 for(const state of [{book:'green',status:'pending'},{book:'blue',status:'declined'},{book:'vouched',status:'accepted'}]){assert.equal(canInvite(state),false);await assert.rejects(()=>createDemoInvite(state));}
 for(const book of ['green','blue'])assert.equal(canInvite({book,status:'accepted'}),true);
 const invitation=await createDemoInvite({book:'green',status:'accepted'}),browser=memory();
 const other=await createDemoInvite({book:'blue',status:'accepted'});assert.notEqual(invitation.code,other.code);
 const message=invitationMessage(invitation,'https://example.org/app/?preview=profile',true);assert(message.includes(invitation.code));assert(message.includes('https://example.org/app/?invite='));assert(!message.includes('preview='));assert(message.includes('demo invitation'));
 await assert.rejects(()=>redeemDemoInvite(invitation.code.slice(0,-1)+'Z',browser));
 await redeemDemoInvite(' '+invitation.code.toLowerCase()+' ',browser);
 await assert.rejects(()=>redeemDemoInvite(invitation.code,browser),/already been used/);
 await redeemDemoInvite(invitation.code,memory()); // No cross-browser authority is claimed in demo mode.
 const state={reference:'NT-VOUCHED-0001',status:'accepted',book:'vouched',name:'Private pseudonym',inviteCode:invitation.code,invitation,inboxEvents:[],inboxRead:[]};
 recordApplicationEvent(state,'pending');recordApplicationEvent(state,'accepted');saveDemoInbox(browser,state);
 assert.equal(restoreDemoInbox(browser).book,'vouched');assert.equal(restoreDemoInbox(browser).name,undefined);
 assert(![...browser.values.values()].join('').includes(invitation.code));
 assert.equal(membershipLabel(state.book),'Vouched member');assert.equal(canUsePetitions(state),false);
 assert.equal(applyDemoVerificationReward(initialDemoBalances(),state).tibetUnits,0);
});

test('live invitations require verified ownership, expire, redeem once atomically and keep inviter/private codes out of public summaries',async()=>{
 const writes=[];
 const app=createApp(env,{database:':memory:',store:{append:async()=>writes.push('append'),update:async()=>writes.push('update')}});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+app.server.address().port;
 const call=async(path,body,token)=>{const response=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{Origin:env.FRONTEND_ORIGIN,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,data:await response.json()};};
 const session=async()=>{const token=(await call('session',{})).data.token;return {token,id:digest(env.SESSION_SECRET,token)};};
 const member=async(book='green',status='accepted')=>{const owner=await session(),reference='NT-'+crypto.randomUUID().slice(0,8).toUpperCase();const record={reference,name:'Inviter',book,status,createdAt:new Date().toISOString()};app.db.prepare('INSERT INTO applications VALUES(?,?,?)').run(reference,owner.id,JSON.stringify(record));const data=JSON.parse(app.db.prepare('SELECT data FROM sessions WHERE id=?').get(owner.id).data);data.reference=reference;app.db.prepare('UPDATE sessions SET data=? WHERE id=?').run(JSON.stringify(data),owner.id);return {...owner,reference};};
 try{
  assert.equal((await call('invites',{})).status,401);
  const unknown=await session();assert.equal((await call('invites',{reference:'NT-SPOOF'},unknown.token)).status,403);
  for(const [book,status]of [['green','pending'],['blue','declined'],['vouched','accepted']])assert.equal((await call('invites',{},(await member(book,status)).token)).status,403);
  const issuer=await member(),blue=await member('blue');assert.equal((await call('invites',{},blue.token)).status,201);
  const invitation=(await call('invites',{},issuer.token)).data;assert.match(invitation.code,/^NT-(?:[A-F0-9]{6}-){2}[A-F0-9]{6}$/);assert(Math.abs(Date.parse(invitation.expiresAt)-Date.now()-7*86400000)<2000);
  assert(!JSON.stringify(app.db.prepare('SELECT * FROM invites').all()).includes(invitation.code));
  const recipient=await session(),other=await session();
  for(const code of ['DEMO-NT-1234567890-ABCDEF','NT-000000-000000-000000'])assert.equal((await call('invites/redeem',{code,name:'Alias'},recipient.token)).status,400);
  assert.equal((await call('invites/redeem',{code:invitation.code,name:' '},recipient.token)).status,400);
  const results=await Promise.all([call('invites/redeem',{code:invitation.code,name:'Snow Lion',book:'green',status:'accepted'},recipient.token),call('invites/redeem',{code:invitation.code,name:'Other'},other.token)]);
  assert.deepEqual(results.map(result=>result.status).sort(),[201,400]);
  const success=results.find(result=>result.status===201),owner=results[0].status===201?recipient:other,loser=results[0].status===201?other:recipient;
  assert.equal(success.data.application.book,'vouched');assert.equal(success.data.application.status,'accepted');assert.equal(success.data.application.verificationTier,'vouched');assert.equal(success.data.application.invitedBy,undefined);
  const record=JSON.parse(app.db.prepare('SELECT data FROM applications WHERE reference=?').get(success.data.application.reference).data);assert.equal(record.invitedBy,issuer.reference);assert.equal(record.media,undefined);assert.equal(record.passkey,null);assert(!JSON.stringify(record).includes(invitation.code));
  const inbox=await call('notifications',null,owner.token);assert.equal(inbox.data.items.filter(item=>item.kind==='application').length,2);assert.equal((await call('notifications',null,loser.token)).data.items.filter(item=>item.kind==='application').length,0);
  const retry=await call('invites/redeem',{code:invitation.code,name:'Retry'},owner.token);assert.equal(retry.status,201);assert.equal(retry.data.application.reference,record.reference);
  assert.equal((await call('account/contacts',{},owner.token)).status,200);await app.processJobs();assert.deepEqual(writes,[]);
  assert.equal((await call('invites',{},owner.token)).status,403);
  const expired=(await call('invites',{},issuer.token)).data;app.db.prepare('UPDATE invites SET expires_at=0 WHERE code_hash=?').run(digest(env.SESSION_SECRET,'member-invite:'+expired.code));assert.equal((await call('invites/redeem',{code:expired.code,name:'Alias'},loser.token)).status,400);
  const revoked=(await call('invites',{},issuer.token)).data;const original=JSON.parse(app.db.prepare('SELECT data FROM applications WHERE reference=?').get(issuer.reference).data);app.db.prepare('UPDATE applications SET data=? WHERE reference=?').run(JSON.stringify({...original,status:'declined'}),issuer.reference);assert.equal((await call('invites/redeem',{code:revoked.code,name:'Alias'},loser.token)).status,400);
  const active=await member();for(let i=0;i<20;i++)assert.equal((await call('invites',{},active.token)).status,201);assert.equal((await call('invites',{},active.token)).status,429);
 }finally{await new Promise(resolve=>app.server.close(resolve));}
});
