import test from 'node:test';
import assert from 'node:assert/strict';
import {canUsePetitions,petitionsFor,createPetition,supportPetition,supporterCount,samplePetitions,initialDemoBalances,parseAmount,quoteDemoSwap,swapDemoBalance,withdrawDemoBalance} from '../public/member-model.js';
const applicant=(book='green',status='accepted')=>({book,status,name:'Tenzin Dolma',createdPetitions:[],petitionSignatures:[]});
test('petitions require an accepted Green Book application for creation and support',()=>{
 for(const state of [applicant('blue'),applicant('green','pending'),applicant('green','declined')]){
  assert.equal(canUsePetitions(state),false);
  assert.throws(()=>supportPetition(state,samplePetitions[0].id));
  assert.throws(()=>createPetition(state,{title:'Community learning',body:'Expand community language learning for young people.',goal:1000}));
 }
});
test('Blue Book, pending and declined members can read petitions and results without voting',()=>{
 for(const state of [applicant('blue'),applicant('green','pending'),applicant('green','declined')]){
  const petitions=petitionsFor(state);assert.equal(petitions.length,5);
  assert.equal(petitions[0].title,'English access to CTA documents and sessions');
  assert.equal(supporterCount(petitions[0],state),1842);
  assert.throws(()=>supportPetition(state,petitions[0].id),/Supporting petitions/);
  assert.equal(supporterCount(petitions[0],state),1842);assert.deepEqual(state.petitionSignatures,[]);
 }
});
test('support is counted once and a new petition starts with zero supporters',()=>{
 const state=applicant();assert.equal(supportPetition(state,samplePetitions[0].id),true);assert.equal(supportPetition(state,samplePetitions[0].id),false);
 assert.equal(supporterCount(samplePetitions[0],state),1843);
 const petition=createPetition(state,{title:'Community learning',body:'Expand community language learning for young people.',goal:1000});
 assert.equal(petition.supporters,0);assert.equal(state.createdPetitions[0].id,petition.id);
 supportPetition(state,petition.id);assert.equal(supporterCount(petition,state),1);
 assert.throws(()=>createPetition(state,{title:'Short',body:'Too short',goal:1}));
 assert.throws(()=>supportPetition(state,'missing'));
});
test('demo money parsing rejects ambiguous amounts and quotes never change balances',()=>{
 for(const value of ['0','-1','NaN','Infinity','1e2','1.001','1,000','10000000000'])assert.throws(()=>parseAmount(value));
 assert.equal(parseAmount('100.01'),10001);
 const wallet=initialDemoBalances();const quote=quoteDemoSwap(wallet,'100.01');assert.equal(quote.usdCents,1200);assert.equal(wallet.tibetUnits,125000);assert.equal(wallet.usdCents,0);
 assert.throws(()=>quoteDemoSwap(wallet,'1250.01'));assert.throws(()=>quoteDemoSwap(wallet,'0.01'));
});
test('demo swaps conserve integer balances and reject repeat or altered transactions',()=>{
 const original=initialDemoBalances(),quote=quoteDemoSwap(original,'1250');
 const wallet=swapDemoBalance(original,quote,'swap-1');assert.equal(wallet.tibetUnits,0);assert.equal(wallet.usdCents,15000);assert.equal(wallet.transactions.length,2);
 assert.equal(original.tibetUnits,125000);assert.throws(()=>swapDemoBalance(wallet,quote,'swap-1'));
 assert.throws(()=>swapDemoBalance(original,{...quote,usdCents:99999},'swap-2'));
});
test('sample bank withdrawals debit once and cannot overdraw or use fractional cents',()=>{
 const swapped=swapDemoBalance(initialDemoBalances(),{tibetUnits:125000,usdCents:15000},'swap-1');
 const wallet=withdrawDemoBalance(swapped,5000,'withdraw-1');assert.equal(wallet.usdCents,10000);assert.equal(wallet.transactions[0].bank,'•••• 0421');
 for(const amount of [10001,0,-1,0.5,NaN])assert.throws(()=>withdrawDemoBalance(wallet,amount,'withdraw-2'));
 assert.throws(()=>withdrawDemoBalance(wallet,5000,'withdraw-1'));assert.equal(swapped.usdCents,15000);
});
