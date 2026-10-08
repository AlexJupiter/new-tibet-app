import test from 'node:test';
import assert from 'node:assert/strict';
import {canUsePetitions,petitionsFor,createPetition,supportPetition,supporterCount,samplePetitions,initialDemoBalances,applyDemoVerificationReward,walletRewardUnread,parseAmount,quoteDemoSwap,swapDemoBalance,withdrawDemoBalance,searchDemoRecipients,findDemoRecipient,quoteDemoSend,sendDemoBalance} from '../public/member-model.js';
const applicant=(book='green',status='accepted')=>({book,status,name:'Tenzin Dolma',createdPetitions:[],petitionSignatures:[]});
test('new demo wallets are empty until membership acceptance credits the 100 TIBET reward',()=>{
 const empty=initialDemoBalances();assert.equal(empty.tibetUnits,0);assert.deepEqual(empty.transactions,[]);
 for(const status of ['pending','declined'])assert.equal(applyDemoVerificationReward(empty,{reference:'NT-REWARD-1234',status}),empty);
 assert.equal(applyDemoVerificationReward(empty,{status:'accepted'}),empty);
 for(const book of ['green','blue']){
  const application={reference:'NT-REWARD-1234',status:'accepted',book,applicationCreatedAt:'2026-10-08T10:00:00Z',inboxEvents:[{reference:'NT-OTHER-5678',status:'accepted',createdAt:'2026-10-08T09:00:00Z'},{reference:'NT-REWARD-1234',status:'accepted',createdAt:'2026-10-08T11:00:00Z'}]};
  const wallet=applyDemoVerificationReward(empty,application);assert.equal(wallet.tibetUnits,10000);assert.equal(wallet.transactions.length,1);
  assert.equal(wallet.transactions[0].type,'reward');assert.equal(wallet.transactions[0].createdAt,'2026-10-08T11:00:00Z');assert.equal(empty.tibetUnits,0);
  assert.equal(walletRewardUnread({...application,walletDemo:wallet}),1);assert.equal(walletRewardUnread({...application,walletDemo:wallet,walletRewardRead:true}),0);
 }
});
test('repeated acceptance never credits another reward or replenishes spent tokens',()=>{
 const application={reference:'NT-REWARD-1234',status:'accepted',applicationCreatedAt:'2026-10-08T11:00:00Z'};
 const credited=applyDemoVerificationReward(initialDemoBalances(),application);
 assert.equal(applyDemoVerificationReward(credited,application),credited);
 const sent=sendDemoBalance(credited,quoteDemoSend(credited,'sonam.tsering','25'),'reward-send');
 assert.equal(sent.tibetUnits,7475);assert.equal(applyDemoVerificationReward(sent,application),sent);
 const declined=applyDemoVerificationReward(sent,{...application,status:'declined'});
 assert.equal(applyDemoVerificationReward(declined,application),sent);assert.equal(sent.transactions.filter(tx=>tx.type==='reward').length,1);
 assert.equal(walletRewardUnread({...application,reference:'NT-OTHER-5678',walletDemo:sent}),0);
});
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
 const wallet=initialDemoBalances(125000);const quote=quoteDemoSwap(wallet,'100.01');assert.equal(quote.usdCents,1200);assert.equal(wallet.tibetUnits,125000);assert.equal(wallet.usdCents,0);
 assert.throws(()=>quoteDemoSwap(wallet,'1250.01'));assert.throws(()=>quoteDemoSwap(wallet,'0.01'));
});
test('demo swaps conserve integer balances and reject repeat or altered transactions',()=>{
 const original=initialDemoBalances(125000),quote=quoteDemoSwap(original,'1250');
 const wallet=swapDemoBalance(original,quote,'swap-1');assert.equal(wallet.tibetUnits,0);assert.equal(wallet.usdCents,15000);assert.equal(wallet.transactions.length,2);
 assert.equal(original.tibetUnits,125000);assert.throws(()=>swapDemoBalance(wallet,quote,'swap-1'));
 assert.throws(()=>swapDemoBalance(original,{...quote,usdCents:99999},'swap-2'));
});
test('sample bank withdrawals debit once and cannot overdraw or use fractional cents',()=>{
 const swapped=swapDemoBalance(initialDemoBalances(125000),{tibetUnits:125000,usdCents:15000},'swap-1');
 const wallet=withdrawDemoBalance(swapped,5000,'withdraw-1');assert.equal(wallet.usdCents,10000);assert.equal(wallet.transactions[0].bank,'•••• 0421');
 for(const amount of [10001,0,-1,0.5,NaN])assert.throws(()=>withdrawDemoBalance(wallet,amount,'withdraw-2'));
 assert.throws(()=>withdrawDemoBalance(wallet,5000,'withdraw-1'));assert.equal(swapped.usdCents,15000);
});
test('send search normalizes usernames and quotes require an exact registered recipient',()=>{
 assert.equal(searchDemoRecipients(' @SONAM ').length,1);
 assert.equal(findDemoRecipient(' @SONAM.TSERING ').username,'sonam.tsering');
 assert.equal(searchDemoRecipients('missing').length,0);
 assert.equal(findDemoRecipient('sonam'),undefined);
 for(const username of ['sonam','not-registered','__proto__',''])assert.throws(()=>quoteDemoSend(initialDemoBalances(125000),username,'10'),/registered username/);
});
test('demo sends debit amount plus gas, credit only the recipient amount, and conserve the ledger',()=>{
 const original=initialDemoBalances(125000),quote=quoteDemoSend(original,'@sonam.tsering','100');
 assert.equal(quote.tibetUnits,10000);assert.equal(quote.gasUnits,25);assert.equal(quote.totalUnits,10025);
 assert.equal(original.tibetUnits,125000);assert.deepEqual(original.recipientCredits,{});
 const sent=sendDemoBalance(original,quote,'send-1');assert.equal(sent.tibetUnits,114975);assert.equal(sent.usdCents,0);
 assert.equal(sent.recipientCredits['demo-sonam'],10000);assert.equal(sent.gasSpentUnits,25);assert.equal(sent.transactions[0].username,'sonam.tsering');
 const next=sendDemoBalance(sent,quoteDemoSend(sent,'pema.dolkar','12.34'),'send-2');
 assert.equal(next.recipientCredits['demo-pema'],1234);assert.equal(next.gasSpentUnits,50);
 assert.equal(next.tibetUnits+Object.values(next.recipientCredits).reduce((a,b)=>a+b,0)+next.gasSpentUnits,125000);
 assert.deepEqual(original.recipientCredits,{});assert.equal(original.gasSpentUnits,0);assert.equal(sent.recipientCredits['demo-pema'],undefined);
});
test('send maximum reserves gas and refuses even a one-unit overdraft or invalid amount',()=>{
 const wallet=initialDemoBalances(125000),max=quoteDemoSend(wallet,'sonam.tsering','1249.75');
 assert.equal(sendDemoBalance(wallet,max,'max-send').tibetUnits,0);
 for(const amount of ['1250','1249.76'])assert.throws(()=>quoteDemoSend(wallet,'sonam.tsering',amount),/gas fee/);
 for(const amount of ['0','-1','1.001','1e2','NaN','Infinity'])assert.throws(()=>quoteDemoSend(wallet,'sonam.tsering',amount));
 const tiny={...wallet,tibetUnits:26};assert.equal(sendDemoBalance(tiny,quoteDemoSend(tiny,'pema.dolkar','0.01'),'tiny-send').tibetUnits,0);
 assert.throws(()=>quoteDemoSend({...wallet,tibetUnits:25},'pema.dolkar','0.01'));
});
test('send confirmation rejects replay, changed fees, changed recipients and stale balances',()=>{
 const wallet=initialDemoBalances(125000),quote=quoteDemoSend(wallet,'sonam.tsering','100'),sent=sendDemoBalance(wallet,quote,'send-1');
 assert.throws(()=>sendDemoBalance(sent,quote,'send-1'),/already been completed/);
 for(const changed of [{gasUnits:0},{totalUnits:10000},{recipientId:'demo-pema'},{username:'pema.dolkar'},{name:'Different person'},{tibetUnits:10000.5},{tibetUnits:-1}])assert.throws(()=>sendDemoBalance(wallet,{...quote,...changed},'altered-send'));
 assert.throws(()=>sendDemoBalance({...wallet,tibetUnits:10000},quote,'stale-send'),/gas fee/);
 assert.equal(sent.tibetUnits,114975);assert.equal(wallet.tibetUnits,125000);
});
