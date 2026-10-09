import test from 'node:test';
import assert from 'node:assert/strict';
import {onboardingRewards,onboardingRewardTotal,rememberDemoOnboardingStages} from '../public/onboarding-rewards.js';
import {verificationProgress,rewardLadder} from '../public/profile-progress.js';
import {applyDemoOnboardingRewards,initialDemoBalances,walletRewardUnread,quoteDemoSend,sendDemoBalance} from '../public/member-model.js';
import {saveDemoInbox,restoreDemoInbox} from '../public/inbox-model.js';
const member=()=>({reference:'NT-STAGES-1234',book:'green',status:'accepted',applicationCreatedAt:'2026-10-09T10:00:00Z',inboxEvents:[{id:'NT-STAGES-1234:accepted',reference:'NT-STAGES-1234',status:'accepted',book:'green',createdAt:'2026-10-09T11:00:00Z'}],inboxRead:[],walletRewardReadIds:[]});
test('every onboarding stage has a reward and ledger credits match the ladder without repeated payouts',()=>{
 assert(Object.values(onboardingRewards).every(amount=>amount>0));assert.equal(onboardingRewardTotal,230);
 const state={...member(),demoPassportTier:true,passportTierAt:'2026-10-09T12:00:00Z',wallet:{ready:true},email:' Member@Example.org ',verified:{email:'member@example.org'}};
 rememberDemoOnboardingStages(state);
 const progress=verificationProgress(state),wallet=applyDemoOnboardingRewards(initialDemoBalances(),state);
 assert.equal(progress.earned,onboardingRewardTotal);assert.equal(wallet.tibetUnits,progress.earned*100);assert.equal(wallet.transactions.length,5);assert.equal(new Set(wallet.transactions.map(tx=>tx.id)).size,5);
 assert.equal(applyDemoOnboardingRewards(wallet,state),wallet);
 const spent=sendDemoBalance(wallet,quoteDemoSend(wallet,'sonam.tsering','25'),'stage-reward-send');assert.equal(applyDemoOnboardingRewards(spent,state),spent);
 assert.equal(verificationProgress({...state,walletDemo:spent}).earned,onboardingRewardTotal);
 assert(!rewardLadder({...state,demoMode:true}).includes('No coin reward'));
});
test('unfinished and skipped stages earn nothing; membership acceptance gates all credits',()=>{
 const empty=initialDemoBalances(),state=member();
 assert.equal(applyDemoOnboardingRewards(empty,state).tibetUnits,11000);
 for(const status of ['guest','pending','declined']){
  const unverified={...state,status,demoPassportTier:true,wallet:{ready:true},email:'member@example.org',verified:{email:'member@example.org'}};
  assert.equal(applyDemoOnboardingRewards(empty,unverified),empty);assert.equal(verificationProgress(unverified).earned,0);
 }
 assert.equal(applyDemoOnboardingRewards(empty,{...state,reference:''}),empty);
 const vouched={...state,book:'vouched',wallet:{ready:false,words:['unconfirmed']},email:'member@example.org',verified:{email:'different@example.org'}};
 assert.equal(applyDemoOnboardingRewards(empty,vouched).tibetUnits,1000);assert.equal(verificationProgress(vouched).earned,10);
 assert.equal(applyDemoOnboardingRewards(empty,{...vouched,demoPassportTier:true}).tibetUnits,11000);
});
test('new completion rewards notify after a previous wallet visit and survive reload without storing private details',()=>{
 const state=member();state.walletDemo=applyDemoOnboardingRewards(initialDemoBalances(),state);
 assert.equal(walletRewardUnread(state),1);state.walletRewardReadIds=state.walletDemo.transactions.map(tx=>tx.id);state.walletRewardRead=true;assert.equal(walletRewardUnread(state),0);
 Object.assign(state,{name:'Private name',email:'private@example.org',verified:{email:'private@example.org'},wallet:{ready:true,words:['private recovery word'],privateKey:'private-wallet-key'}});
 assert.equal(rememberDemoOnboardingStages(state),true);assert.equal(rememberDemoOnboardingStages(state),false);
 state.walletDemo=applyDemoOnboardingRewards(state.walletDemo,state);assert.equal(state.walletDemo.tibetUnits,13000);assert.equal(walletRewardUnread(state),1);
 const map=new Map(),storage={setItem:(key,value)=>map.set(key,value),getItem:key=>map.get(key)};
 saveDemoInbox(storage,state);const raw=[...map.values()][0];for(const secret of ['Private name','private@example.org','private recovery word','private-wallet-key'])assert(!raw.includes(secret));
 const restored=restoreDemoInbox(storage);assert.deepEqual(restored.demoOnboardingStages,state.demoOnboardingStages);restored.walletDemo=applyDemoOnboardingRewards(initialDemoBalances(),restored);
 assert.equal(restored.walletDemo.tibetUnits,13000);assert.equal(verificationProgress(restored).earned,130);assert.equal(walletRewardUnread(restored),1);
 restored.walletRewardReadIds=restored.walletDemo.transactions.map(tx=>tx.id);saveDemoInbox(storage,restored);const read=restoreDemoInbox(storage);read.walletDemo=applyDemoOnboardingRewards(initialDemoBalances(),read);assert.equal(walletRewardUnread(read),0);
 assert.equal(applyDemoOnboardingRewards(read.walletDemo,read),read.walletDemo);
});
