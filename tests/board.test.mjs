import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createRetention} from '../backend/retention.mjs';
import {initialDemoBalances,applyDemoVerificationReward,applyDemoPassportReward,advanceDemoCampaign} from '../public/member-model.js';

test('the optional NFC reward requires acceptance, credits another 100 once and never replenishes spending',()=>{
 const state={status:'accepted',reference:'NT-TEST-100',demoPassportTier:false};
 let wallet=applyDemoVerificationReward(initialDemoBalances(),state);
 assert.equal(applyDemoPassportReward(wallet,state),wallet);
 state.demoPassportTier=true;wallet=applyDemoPassportReward(wallet,state);assert.equal(wallet.tibetUnits,20000);
 assert.equal(applyDemoPassportReward(wallet,state),wallet);
 wallet={...wallet,tibetUnits:17000};assert.equal(applyDemoPassportReward(wallet,state).tibetUnits,17000);
 assert.equal(applyDemoPassportReward(initialDemoBalances(),{...state,status:'pending'}).tibetUnits,0);
});
test('demo learning campaigns credit after seven simulated days once, require acceptance and keep separate campaigns',()=>{
 const state={status:'accepted',reference:'NT-TEST-100',rewardDays:{},walletDemo:initialDemoBalances(10000)};
 for(let i=0;i<6;i++)advanceDemoCampaign(state,'monlam');assert.equal(state.walletDemo.tibetUnits,10000);
 advanceDemoCampaign(state,'monlam');assert.equal(state.walletDemo.tibetUnits,20000);
 advanceDemoCampaign(state,'monlam');assert.equal(state.walletDemo.tibetUnits,20000);
 for(let i=0;i<7;i++)advanceDemoCampaign(state,'dzongsar');assert.equal(state.walletDemo.tibetUnits,30000);
 assert.throws(()=>advanceDemoCampaign({...state,status:'pending'},'monlam'));
 assert.throws(()=>advanceDemoCampaign(state,'unknown'));
});
function retentionFixture(){
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE applications(reference TEXT PRIMARY KEY,data TEXT NOT NULL); CREATE TABLE sessions(id TEXT PRIMARY KEY,data TEXT NOT NULL,expires INTEGER);');
 const now=Date.UTC(2026,11,9),app={reference:'NT-TEST-100',consentVersion:'2026-10-09',verificationDeleteAt:new Date(now).toISOString(),name:'Display name',email:'optional@example.org',status:'accepted',book:'green',passkey:{id:'key'},media:{identity:{id:'private-photo'}},photoURL:'private-review-url',photoId:'private-photo',challengeCode:'123456',reviewNote:'Private review note',passport:{verified:true,nullifier:'private-hmac',proofs:['proof']}};
 db.prepare('INSERT INTO applications VALUES(?,?)').run(app.reference,JSON.stringify(app));
 db.prepare('INSERT INTO sessions VALUES(?,?,?)').run('owner',JSON.stringify({reference:app.reference,media:app.media,passport:app.passport,mediaChallenge:{code:'123456'}}),now+100000);
 return {db,now,app};
}
test('60-day cleanup removes evidence from storage, application and session while preserving account access and review changes',async()=>{
 const {db,now,app}=retentionFixture();let calls=0;
 const retention=createRetention({db,live:true,store:{clearVerification:async()=>{calls++;const latest=JSON.parse(db.prepare('SELECT data FROM applications').get().data);latest.passkey={id:'updated-key'};db.prepare('UPDATE applications SET data=?').run(JSON.stringify(latest));}}});
 try{assert.equal(await retention.run({now:now-1,force:true}),0);assert.equal(await retention.run({now,force:true}),1);assert.equal(calls,1);
 const saved=JSON.parse(db.prepare('SELECT data FROM applications').get().data),session=JSON.parse(db.prepare('SELECT data FROM sessions').get().data);
 for(const field of ['media','photoURL','photoId','challengeCode','reviewNote'])assert.equal(saved[field],undefined);
 assert.equal(saved.passport.proofs,undefined);assert.equal(session.passport.proofs,undefined);assert.equal(session.media,undefined);assert.equal(session.mediaChallenge,undefined);
 assert.equal(saved.name,app.name);assert.equal(saved.email,app.email);assert.equal(saved.passkey.id,'updated-key');assert.equal(saved.passport.nullifier,'private-hmac');assert.equal(saved.status,'accepted');
 assert.equal(await retention.run({now:now+10000,force:true}),0);
 }finally{db.close();}
});
test('cleanup retries storage failures and never purges legacy, malformed-deadline or demo records',async()=>{
 const {db,now,app}=retentionFixture();let fail=true,calls=0;
 const retention=createRetention({db,live:true,store:{clearVerification:async()=>{calls++;if(fail)throw new Error('Storage offline');}}});
 try{assert.equal(await retention.run({now,force:true}),0);assert.equal(JSON.parse(db.prepare('SELECT data FROM applications').get().data).photoId,'private-photo');
 fail=false;assert.equal(await retention.run({now,force:true}),1);assert.equal(calls,2);
 for(const data of [{...app,consentVersion:'2026-10-08'},{...app,verificationDeleteAt:'invalid'}]){db.prepare('UPDATE applications SET data=?').run(JSON.stringify(data));assert.equal(await retention.run({now,force:true}),0);}
 assert.equal(await createRetention({db,store:{},live:false}).run({now,force:true}),0);
 }finally{db.close();}
});

test('Drive/Sheets cleanup includes retakes across paginated results and clears only verification copies',async()=>{
 const {GoogleStore}=await import('../backend/google.mjs');const store=new GoogleStore({GOOGLE_DRIVE_FOLDER_ID:'private-folder',GOOGLE_SHEET_ID:'private-sheet'}),removed=[],requests=[];
 store.removePhoto=async id=>{removed.push(id);};store.sheet=async()=>({values:[['Reference'],['NT-TEST-100']]});
 store.request=async(url,options={})=>{requests.push({url,method:options.method});if(url.includes('drive/v3/files'))return url.includes('pageToken=next')?{files:[{id:'older-retake'}]}:{files:[{id:'current-photo'},{id:'replaced-photo'}],nextPageToken:'next'};return {};};
 await store.clearVerification({reference:'NT-TEST-100',media:{identity:{id:'current-photo'}}});assert.deepEqual(removed,['current-photo','replaced-photo','older-retake']);
 const clears=requests.filter(req=>req.url.endsWith(':clear'));assert.equal(clears.length,4);for(const req of clears)assert.equal(req.method,'POST');
 assert(requests[0].url.includes('newTibetApplication'));assert(!clears.some(req=>decodeURIComponent(req.url).includes('L2')),'passkey access remains');
});
