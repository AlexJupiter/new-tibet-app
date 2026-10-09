import test from 'node:test';
import assert from 'node:assert/strict';
import {claimStageCelebration,claimApprovalCelebration} from '../public/reward-celebration.js';
import {initialDemoBalances,applyDemoOnboardingRewards} from '../public/member-model.js';
import {saveDemoInbox,restoreDemoInbox} from '../public/inbox-model.js';

const application=()=>({reference:'NT-CELEBRATION-1234',status:'pending',book:'green',name:'Sample',inboxEvents:[],inboxRead:[],rewardCelebrations:[]});
test('stage celebrations distinguish pending rewards, require completion and do not repeat',()=>{
 const state=application();
 for(const stage of ['security','passport','contacts','unknown'])assert.equal(claimStageCelebration(state,stage),null);
 const book=claimStageCelebration(state,'book');assert.equal(book.amount,100);assert.equal(book.accepted,false);assert.equal(claimStageCelebration(state,'book'),null);
 state.wallet={ready:true};assert.equal(claimStageCelebration(state,'security').amount,10);assert.equal(claimStageCelebration(state,'security'),null);
 state.status='declined';assert.equal(claimStageCelebration(state,'join'),null);
 assert.equal(claimStageCelebration({status:'accepted',name:'No application'},'join'),null);
});
test('approval celebrates each newly credited reward together, without granting extra coins',()=>{
 const state=application();state.demoPassportTier=true;state.demoOnboardingStages={security:'2026-10-09T12:00:00Z',contacts:'2026-10-09T12:00:00Z'};
 for(const stage of ['join','book','security','passport','contacts'])claimStageCelebration(state,stage);
 assert.equal(claimApprovalCelebration(state),null);assert.equal(applyDemoOnboardingRewards(initialDemoBalances(),state).tibetUnits,0);
 state.status='accepted';const reward=claimApprovalCelebration(state);assert.equal(reward.amount,230);assert.equal(reward.approval,true);assert.equal(reward.items.length,5);
 assert.equal(claimApprovalCelebration(state),null);assert.equal(claimStageCelebration(state,'security'),null);
 const wallet=applyDemoOnboardingRewards(initialDemoBalances(),state);assert.equal(wallet.tibetUnits,23000);assert.equal(applyDemoOnboardingRewards(wallet,state),wallet);
 const vouched={...application(),status:'accepted',book:'vouched',onboardingSkipped:['security','passport','contacts']};assert.equal(claimApprovalCelebration(vouched).amount,10);assert.equal(claimStageCelebration(vouched,'book'),null);
});
test('celebration state survives reload, filters private values and treats older receipts as already seen',()=>{
 const map=new Map(),storage={setItem:(key,value)=>map.set(key,value),getItem:key=>map.get(key)},state=application();
 claimStageCelebration(state,'join');claimStageCelebration(state,'book');state.rewardCelebrations.push('private@example.org');saveDemoInbox(storage,state);
 const raw=[...map.values()][0];assert(!raw.includes('private@example.org'));const restored=restoreDemoInbox(storage);assert.equal(claimStageCelebration(restored,'book'),null);
 restored.status='accepted';assert.equal(claimApprovalCelebration(restored).amount,110);saveDemoInbox(storage,restored);assert.equal(claimApprovalCelebration(restoreDemoInbox(storage)),null);
 const [key,value]=[...map.entries()][0],legacy=JSON.parse(value);delete legacy.rewardCelebrations;map.set(key,JSON.stringify(legacy));assert.equal(claimApprovalCelebration(restoreDemoInbox(storage)),null);
});
