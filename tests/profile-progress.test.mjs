import test from 'node:test';
import assert from 'node:assert/strict';
import {hasMemberAccess,verificationProgress,nextSetupAction,setupProgress,rewardLadder,rememberExplorer,restoreExplorer,clearExplorer} from '../public/profile-progress.js';
import {inboxItems,unreadCount} from '../public/inbox-model.js';
import {applyDemoVerificationReward,applyDemoPassportReward,initialDemoBalances,canUsePetitions} from '../public/member-model.js';

const visitor={status:'guest',reference:'',book:'green',name:'',photos:{},inboxEvents:[],inboxRead:[]};
test('guided setup resumes required evidence and follows optional stages in order',()=>{
 assert.equal(nextSetupAction(visitor),'join');
 assert.equal(nextSetupAction({...visitor,name:'Snow Lion',profileSetupStep:1}),'evidence');
 assert.equal(nextSetupAction({...visitor,name:'Snow Lion',book:'vouched',profileSetupStep:1}),'join');
 const submitted={...visitor,status:'pending',reference:'NT-SETUP-1234'};
 assert.equal(nextSetupAction(submitted),'security');
 assert.equal(nextSetupAction({...submitted,onboardingSkipped:['passport']}),'security');
 assert.equal(nextSetupAction({...submitted,onboardingSkipped:['security']}),'passport');
 assert.equal(nextSetupAction({...submitted,wallet:{ready:true}}),'passport');
 assert.equal(nextSetupAction({...submitted,demoPassportTier:true}),'security');
 assert.equal(nextSetupAction({...submitted,demoPassportTier:true,wallet:{ready:true}}),'contacts');
 const finished={...submitted,onboardingSkipped:['passport','security','contacts']};
 assert.equal(nextSetupAction(finished),null);assert.equal(verificationProgress(finished).earned,0);
 assert.equal(nextSetupAction({...submitted,status:'declined'}),null);
 assert.equal(nextSetupAction({...submitted,status:'accepted',demoPassportTier:true,wallet:{ready:true},email:'a@example.org',verified:{email:'a@example.org'}}),null);
});
test('progress distinguishes skipped upgrades from completed ones and keeps rewards collapsed',()=>{
 assert.match(setupProgress(visitor,0),/Signup · Step 1 of 2/);
 assert.match(setupProgress({...visitor,book:'vouched'},0),/Signup · Step 1 of 1/);
 const submitted={...visitor,status:'pending',reference:'NT-SETUP-1234',onboardingSkipped:['passport']};
 const html=setupProgress(submitted,4);
 assert.match(html,/Optional setup · Step 1 of 3/);assert.doesNotMatch(html,/✓/);
 assert.match(html,/<strong>Wallet<\/strong>.*<strong>Passport<\/strong>.*<strong>Contacts<\/strong>/);
 assert.match(setupProgress({...submitted,wallet:{ready:true}},3),/Optional setup · Step 2 of 3/);
 assert.match(setupProgress({...submitted,demoPassportTier:true},4),/✓/);
 const summary=rewardLadder(submitted);
 assert.match(summary,/data-profile-setup="security"/);assert.match(summary,/<details class="journey-details">/);assert.doesNotMatch(summary,/<details[^>]*open/);
 assert.match(summary,/Skipped · Available later/);
 assert.deepEqual(verificationProgress(submitted).stages.map(stage=>stage.id),['join','book','security','passport','contacts']);
 assert.match(rewardLadder({...submitted,status:'declined'}),/Setup paused/);
 assert.doesNotMatch(rewardLadder({...submitted,status:'declined'}),/data-profile-setup=/);
});
test('exploring does not create membership, reveal announcements or grant coins and petition rights',()=>{
 for(const state of [visitor,{...visitor,status:'pending',reference:'NT-PENDING-123'},{...visitor,status:'declined',reference:'NT-DECLINED-123'},{...visitor,status:'accepted'}]){
  assert.equal(hasMemberAccess(state),false);assert.equal(verificationProgress(state).earned,0);assert.equal(canUsePetitions(state),false);
  assert.equal(applyDemoVerificationReward(initialDemoBalances(),state).tibetUnits,0);
  assert.equal(applyDemoPassportReward(initialDemoBalances(),{...state,demoPassportTier:true}).tibetUnits,0);
 }
 assert.deepEqual(inboxItems(visitor,true),[]);assert.equal(unreadCount(visitor,true),0);
 const pending={...visitor,status:'pending',reference:'NT-PENDING-123',inboxEvents:[{id:'receipt',kind:'application',createdAt:'2026-10-09T10:00:00Z'}]};
 assert.equal(inboxItems(pending,true).length,1);
 assert.equal(inboxItems({...pending,status:'accepted'},true).length,3);
});
test('reward progress matches confirmed credit eligibility for every stage',()=>{
 const approved={...visitor,reference:'NT-APPROVED-123',status:'accepted'};
 for(const book of ['green','blue']){
  const state={...approved,book};assert.equal(hasMemberAccess(state),true);assert.equal(verificationProgress(state).earned,110);
  assert.equal(verificationProgress({...state,demoPassportTier:true}).earned,210);
  assert.equal(verificationProgress({...state,passport:{verified:true}}).earned,210);
 }
 assert.equal(verificationProgress({...approved,book:'vouched'}).earned,10);
 assert.equal(verificationProgress({...approved,book:'vouched',demoPassportTier:true}).earned,110);
 const pendingNFC={...approved,status:'pending',demoPassportTier:true,passportTierAt:'2026-10-09T10:00:00Z'};
 assert.equal(verificationProgress(pendingNFC).earned,0);assert.equal(verificationProgress(pendingNFC).stages.find(stage=>stage.id==='passport').done,true);
 assert.equal(verificationProgress(pendingNFC).stages.find(stage=>stage.id==='passport').action,null);
 assert.equal(applyDemoPassportReward(initialDemoBalances(),pendingNFC).tibetUnits,0);
 const acceptedNFC={...pendingNFC,status:'accepted',inboxEvents:[{reference:pendingNFC.reference,status:'accepted',createdAt:'2026-10-09T11:00:00Z'}]};
 const wallet=applyDemoPassportReward(initialDemoBalances(),acceptedNFC);assert.equal(wallet.tibetUnits,10000);assert.equal(Date.parse(wallet.transactions[0].createdAt),Date.parse('2026-10-09T11:00:00Z'));
 const draft={...visitor,name:'Snow Lion',photos:Object.fromEntries(['front','back','identity','challenge'].map(kind=>[kind,'private-photo'])),video:{},passkey:{id:'key'},email:'contact@example.org',verified:{email:'contact@example.org'}};
 const progress=verificationProgress(draft);assert.equal(progress.earned,0);assert.equal(progress.stages.find(stage=>stage.id==='book').action,'evidence');
 assert.equal(progress.stages.find(stage=>stage.id==='security').reward,10);assert.equal(progress.stages.find(stage=>stage.id==='contacts').reward,10);
 assert.equal(verificationProgress({...draft,book:'vouched'}).stages.find(stage=>stage.id==='book').action,'join');
});
test('exploration persists only a preference, without identity details, and handles disabled storage',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 assert.equal(restoreExplorer(storage),false);rememberExplorer(storage);assert.equal(restoreExplorer(storage),true);assert.deepEqual([...values.values()],['1']);clearExplorer(storage);assert.equal(restoreExplorer(storage),false);
 const blocked={getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');},removeItem:()=>{throw Error('blocked');}};
 rememberExplorer(blocked);assert.equal(restoreExplorer(blocked),false);clearExplorer(blocked);
});
