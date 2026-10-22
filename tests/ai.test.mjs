import test from 'node:test';
import assert from 'node:assert/strict';
import {initialAIState,aiCreditPacks,buyDemoAICredits,sendDemoAIMessage} from '../public/ai-model.js';
import {initialDemoBalances,applyDemoOnboardingRewards} from '../public/member-model.js';
const applicant=()=>({status:'accepted',reference:'NT-AI-DEMO-123',book:'green',demoOnboardingStages:{security:'2026-10-22T10:00:00Z'},walletDemo:initialDemoBalances(12000),ai:initialAIState()});

test('AI packs conserve wallet value, grant only their stated credits and record one purchase',()=>{
 for(const pack of aiCreditPacks){
  const state=applicant(),before=state.walletDemo;
  const tx=buyDemoAICredits(state,pack.id,'purchase-'+pack.id,{demo:true});
  assert.equal(state.walletDemo.tibetUnits,12000-pack.tibetUnits);assert.equal(state.ai.credits,pack.credits);
  assert.equal(tx.type,'ai-credits');assert.equal(tx.tibetUnits,pack.tibetUnits);assert.equal(tx.credits,pack.credits);
  assert.equal(state.walletDemo.transactions.filter(item=>item.id===tx.id).length,1);assert.equal(before.tibetUnits,12000);
  const snapshot=structuredClone(state);
  assert.throws(()=>buyDemoAICredits(state,pack.id,tx.id,{demo:true}),/already/);assert.deepEqual(state,snapshot);
 }
});
test('AI purchases fail without demo mode, accepted membership, wallet setup or sufficient funds',()=>{
 for(const changes of [{status:'pending'},{status:'declined'},{reference:''},{demoOnboardingStages:{}},{walletDemo:initialDemoBalances(99)}]){
  const state={...applicant(),...changes},before=structuredClone(state);
  assert.throws(()=>buyDemoAICredits(state,'small','purchase-fail',{demo:true}));assert.deepEqual(state,before);
 }
 const state=applicant(),before=structuredClone(state);
 assert.throws(()=>buyDemoAICredits(state,'small','purchase-live'));
 assert.throws(()=>buyDemoAICredits(state,'invented','purchase-fail',{demo:true}));
 assert.throws(()=>buyDemoAICredits(state,'small','',{demo:true}));assert.deepEqual(state,before);
});
test('sending a demo prompt consumes one credit, retains separate conversations and rejects replay or overdrafts',()=>{
 let ai={...initialAIState(),credits:2,draft:'Hello'};
 const original=structuredClone(ai);
 ai=sendDemoAIMessage(ai,'Hello','message-one',{demo:true});
 assert.equal(ai.credits,1);assert.equal(ai.conversations[0].messages.length,2);assert.equal(ai.draft,'');
 assert.equal(ai.conversations[0].messages[1].sample,true);assert.match(ai.conversations[0].messages[1].text,/Tashi delek/);
 assert.deepEqual(original,{...initialAIState(),credits:2,draft:'Hello'});
 assert.throws(()=>sendDemoAIMessage(ai,'Hello','message-one',{demo:true}),/already/);
 const firstId=ai.activeId;
 ai=sendDemoAIMessage({...ai,activeId:''},'What is Losar?','message-two',{demo:true});
 assert.equal(ai.credits,0);assert.equal(ai.conversations.length,2);assert.notEqual(ai.activeId,firstId);
 assert.equal(ai.conversations.find(chat=>chat.id===firstId).messages.length,2);
 assert.throws(()=>sendDemoAIMessage(ai,'Again','message-three',{demo:true}),/Add AI credits/);
 assert.throws(()=>sendDemoAIMessage({...ai,credits:1},'Again','message-three'),/not active/);
 for(const text of ['',' '.repeat(10),'a'.repeat(4001)])assert.throws(()=>sendDemoAIMessage({...ai,credits:1},text,'message-three',{demo:true}));
});
test('onboarding rerenders never refund tokens spent on AI credits',()=>{
 const state=applicant();state.walletDemo=applyDemoOnboardingRewards(initialDemoBalances(),state);
 const initial=state.walletDemo.tibetUnits;
 buyDemoAICredits(state,'small','purchase-once',{demo:true});
 const spent=state.walletDemo;
 assert.equal(applyDemoOnboardingRewards(spent,state),spent);assert.equal(spent.tibetUnits,initial-100);
 assert.equal(state.ai.credits,10);
});
