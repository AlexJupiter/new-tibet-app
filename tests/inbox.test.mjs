import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createNotifications} from '../backend/notifications.mjs';
import {validateApplication} from '../backend/core.mjs';
import {recordApplicationEvent,saveDemoInbox,restoreDemoInbox,clearDemoInbox,unreadCount} from '../public/inbox-model.js';
import {initialDemoBalances,applyDemoVerificationReward,walletRewardUnread} from '../public/member-model.js';

const requiredEvidence={mediaChallenge:{expires:Date.now()+60000},media:Object.fromEntries(['front','back','identity','challenge','video'].map(kind=>[kind,{book:'green'}])),passport:{verified:true,expires:Date.now()+60000},verified:{}};
test('a display name is required, pseudonyms are accepted, and contacts remain optional',()=>{
 const body={name:'  Snow Lion  ',book:'green',consent:true,consentVersion:'2026-10-08'};
 assert.deepEqual(validateApplication(body,requiredEvidence),{name:'Snow Lion',email:'',whatsapp:'',book:'green',consentVersion:'2026-10-08'});
 for(const name of [undefined,null,'','   ','x'.repeat(101),{}])assert.throws(()=>validateApplication({...body,name},requiredEvidence),/display name/);
 assert.equal(validateApplication({...body,name:'བཀྲ་ཤིས་'},requiredEvidence).name,'བཀྲ་ཤིས་');
 assert.throws(()=>validateApplication({...body,email:'member@example.com'},requiredEvidence),/Verify the optional/);
 assert.equal(validateApplication({...body,email:'member@example.com'},{...requiredEvidence,verified:{email:'member@example.com'}}).email,'member@example.com');
 assert.throws(()=>validateApplication(body,{...requiredEvidence,media:{}}));assert.equal(validateApplication(body,{...requiredEvidence,passport:null}).book,'green');
 assert.throws(()=>validateApplication({...body,consent:false},requiredEvidence));
});
test('application notifications are private, announcements shared, read state scoped, and publishing idempotent',()=>{
 const db=new DatabaseSync(':memory:'),notifications=createNotifications(db);
 try{
  const app={reference:'NT-TEST-1234',status:'pending',book:'green',createdAt:'2026-10-08T10:00:00Z'};
  notifications.record(app,'member-a');notifications.record(app,'member-a');
  const announcement={id:'community-2026',title:'Community update',body:'The next community update will appear here.'};
  const shared=notifications.publish(announcement);assert.equal(notifications.publish(announcement).id,shared.id);
  assert.throws(()=>notifications.publish({...announcement,body:'Different announcement body'}),/already used/);
  assert.equal(notifications.list('member-a').length,2);assert.equal(notifications.list('member-b').length,1);
  assert.throws(()=>notifications.markRead('member-b',[app.reference+':pending']),/not found/);
  notifications.markRead('member-a',[shared.id]);assert.equal(notifications.list('member-a').find(item=>item.id===shared.id).read,true);assert.equal(notifications.list('member-b')[0].read,false);
  notifications.record({...app,status:'accepted',reviewedAt:'2026-10-08T11:00:00Z'},'member-a');
  assert.equal(notifications.list('member-a').filter(item=>item.kind==='application').length,2);
 }finally{db.close();}
});
test('demo receipts survive reload without retaining identity details, media, or wallet material',()=>{
 const map=new Map(),storage={setItem:(key,value)=>map.set(key,value),getItem:key=>map.get(key),removeItem:key=>map.delete(key)};
 const state={reference:'NT-TEST-1234',status:'pending',book:'green',name:'Private name',email:'private@example.com',whatsapp:'+447700900123',photos:{front:'secret photo'},wallet:{words:['secret word']},inboxEvents:[],inboxRead:[]};
 recordApplicationEvent(state,'pending');recordApplicationEvent(state,'pending');assert.equal(state.inboxEvents.length,1);
 state.status='accepted';recordApplicationEvent(state,'accepted');state.inboxRead.push(state.reference+':pending');
 saveDemoInbox(storage,state);const raw=[...map.values()][0];for(const secret of ['Private name','private@example.com','447700900123','secret photo','secret word'])assert(!raw.includes(secret));
 const restored=restoreDemoInbox(storage);assert.equal(restored.status,'accepted');assert.equal(restored.inboxEvents.length,2);assert.equal(unreadCount(restored,true),3);
 clearDemoInbox(storage);assert.equal(restoreDemoInbox(storage),null);
 assert.equal(restoreDemoInbox({getItem:()=>'{invalid'}),null);
});
test('wallet reward read state survives reload and existing accepted receipts receive the new reward once',()=>{
 const map=new Map(),storage={setItem:(key,value)=>map.set(key,value),getItem:key=>map.get(key),removeItem:key=>map.delete(key)};
 const state={reference:'NT-REWARD-1234',status:'accepted',book:'green',applicationCreatedAt:'2026-10-08T10:00:00Z',inboxEvents:[],inboxRead:[]};
 recordApplicationEvent(state,'accepted');saveDemoInbox(storage,state);
 // Older receipt versions have no wallet-reward read flag.
 const key=[...map.keys()][0],legacy=JSON.parse(map.get(key));delete legacy.walletRewardRead;map.set(key,JSON.stringify(legacy));
 const restored=restoreDemoInbox(storage);restored.walletDemo=applyDemoVerificationReward(initialDemoBalances(),restored);
 assert.equal(walletRewardUnread(restored),1);assert.equal(restored.walletDemo.tibetUnits,10000);
 const transaction=restored.walletDemo.transactions[0];restored.walletRewardRead=true;saveDemoInbox(storage,restored);
 const raw=JSON.parse(map.get(key));assert.equal(raw.walletRewardRead,true);assert.equal(raw.walletDemo,undefined);
 const reopened=restoreDemoInbox(storage);reopened.walletDemo=applyDemoVerificationReward(initialDemoBalances(),reopened);
 assert.equal(walletRewardUnread(reopened),0);assert.deepEqual(reopened.walletDemo.transactions,[transaction]);assert.equal(reopened.walletDemo.tibetUnits,10000);
 assert.equal(applyDemoVerificationReward(reopened.walletDemo,reopened),reopened.walletDemo);
 clearDemoInbox(storage);assert.equal(restoreDemoInbox(storage),null);
});
test('optional setup skips survive reload as stage IDs without adding personal details',()=>{
 const map=new Map(),storage={setItem:(key,value)=>map.set(key,value),getItem:key=>map.get(key)};
 const state={reference:'NT-SETUP-1234',status:'pending',book:'green',inboxEvents:[],inboxRead:[],onboardingSkipped:['passport','contacts','private@example.org','passport','book']};
 saveDemoInbox(storage,state);
 const key=[...map.keys()][0],raw=map.get(key);
 assert(!raw.includes('private@example.org'));assert.deepEqual(restoreDemoInbox(storage).onboardingSkipped,['passport','contacts']);
 const saved=JSON.parse(raw);saved.onboardingSkipped=['security','unknown','security'];map.set(key,JSON.stringify(saved));
 assert.deepEqual(restoreDemoInbox(storage).onboardingSkipped,['security']);
 delete saved.onboardingSkipped;map.set(key,JSON.stringify(saved));assert.deepEqual(restoreDemoInbox(storage).onboardingSkipped,[]);
});
