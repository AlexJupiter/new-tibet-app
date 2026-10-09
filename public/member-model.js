import {onboardingRewards,eligibleOnboardingRewards} from './onboarding-rewards.js';
export const memberTabs=['profile','wallet','chat','petitions','ecosystem','announcements'];
export const samplePetitions=Object.freeze([
 {id:'english-access',category:'Accessibility',title:'English access to CTA documents and sessions',summary:'Guarantee English access to official documents and parliamentary sessions through translations and subtitles.',body:'Do you think the CTA should guarantee that all official documents and parliamentary sessions are accessible in English, for example by providing translations and subtitles?',supporters:1842,goal:2500},
 {id:'charter-reform',category:'Governance',title:'Clarify the separation of powers in the Tibetan Charter',summary:'Revise the Tibetan Charter to clearly define the separation of powers and introduce conflict resolution mechanisms.',body:'Do you think the Tibetan Charter should be revised to more clearly define the separation of powers and to introduce conflict resolution mechanisms?',supporters:936,goal:1500},
 {id:'succession-planning',category:'Future planning',title:'A more active CTA role in planning for the future',summary:'Ask the CTA to take a more active role in planning the period following His Holiness the 14th Dalai Lama.',body:'Do you think the CTA should play a more active role in planning the period following His Holiness the 14th Dalai Lama?',supporters:627,goal:1000},
 {id:'overseas-resources',category:'Community resources',title:'More CTA resources for Tibetan communities overseas',summary:'Allocate more resources overseas, even if support for traditional settlements in India, Nepal, and Bhutan is reduced.',body:'Do you think the CTA should allocate more resources to Tibetan communities overseas, even if this means reducing support for the traditional settlements in India, Nepal, and Bhutan?',supporters:812,goal:1500},
 {id:'youth-participation',category:'Youth participation',title:'Lower the minimum ages for Chitue and Sikyong',summary:'Lower the minimum age requirements of 25 for Chitue and 35 for Sikyong to encourage greater youth participation.',body:'Do you think the minimum age requirements for Chitue (25 years) and Sikyong (35 years) should be lowered to encourage greater youth participation?',supporters:1186,goal:2000}
]);
export const canUsePetitions=state=>state.status==='accepted'&&Boolean(state.reference)&&state.book==='green';
export const petitionsFor=state=>[...(state.createdPetitions||[]),...samplePetitions];
export const supporterCount=(petition,state)=>petition.supporters+(state.petitionSignatures.includes(petition.id)?1:0);
export function supportPetition(state,id){
 if(!canUsePetitions(state))throw new Error('Supporting petitions currently requires verified Green Book membership.');
 if(!petitionsFor(state).some(p=>p.id===id))throw new Error('This petition is unavailable.');
 if(state.petitionSignatures.includes(id))return false;
 state.petitionSignatures.push(id);return true;
}
export function createPetition(state,{title,body,goal}){
 if(!canUsePetitions(state))throw new Error('Creating petitions currently requires verified Green Book membership.');
 title=String(title||'').trim();body=String(body||'').trim();goal=Number(goal);
 if(title.length<6||title.length>120)throw new Error('Use a title between 6 and 120 characters.');
 if(body.length<20||body.length>2000)throw new Error('Explain the change in 20–2,000 characters.');
 if(!Number.isSafeInteger(goal)||goal<10||goal>1000000)throw new Error('Choose a supporter goal from 10 to 1,000,000.');
 const petition={id:crypto.randomUUID(),category:'Community',title,summary:body.length>180?body.slice(0,177)+'…':body,body,goal,supporters:0,creator:state.name};
 state.createdPetitions.unshift(petition);return petition;
}

// A local demo ledger. Amounts are integers; no chain, exchange or bank is contacted.
export const demoRateCents=12;
export const initialDemoBalances=(tibetUnits=0)=>({tibetUnits,usdCents:0,recipientCredits:{},gasSpentUnits:0,processed:[],transactions:tibetUnits?[{id:'allocation',type:'allocation',tibetUnits,label:'Sample allocation'}]:[]});
export const demoVerificationRewardUnits=onboardingRewards.book*100;
export function applyDemoVerificationReward(wallet,application){
 if(application.status!=='accepted'||!['green','blue'].includes(application.book)||!/^NT-[A-Z0-9-]{4,60}$/.test(application.reference||''))return wallet;
 const id=application.reference+':verification-reward';
 if(wallet.processed.includes(id))return wallet;
 const accepted=application.inboxEvents?.find(event=>event.reference===application.reference&&event.status==='accepted');
 const createdAt=[accepted?.createdAt,application.applicationCreatedAt].find(value=>Number.isFinite(Date.parse(value)))||new Date().toISOString();
 return {...wallet,tibetUnits:wallet.tibetUnits+demoVerificationRewardUnits,processed:[...wallet.processed,id],transactions:[{id,type:'reward',tibetUnits:demoVerificationRewardUnits,label:'Verification successful',createdAt},...wallet.transactions]};
}
export const demoPassportRewardUnits=onboardingRewards.passport*100;
export function applyDemoPassportReward(wallet,application){
 if(application.status!=='accepted'||!(application.demoPassportTier===true||application.passport?.verified===true)||!/^NT-[A-Z0-9-]{4,60}$/.test(application.reference||''))return wallet;
 const id=application.reference+':passport-reward';if(wallet.processed.includes(id))return wallet;
 const accepted=application.inboxEvents?.find(event=>event.reference===application.reference&&event.status==='accepted');
 const times=[application.passportTierAt,accepted?.createdAt].map(value=>Date.parse(value)).filter(Number.isFinite);
 const createdAt=times.length?new Date(Math.max(...times)).toISOString():new Date().toISOString();
 return {...wallet,tibetUnits:wallet.tibetUnits+demoPassportRewardUnits,processed:[...wallet.processed,id],transactions:[{id,type:'passport-reward',tibetUnits:demoPassportRewardUnits,label:'NFC verification upgrade',createdAt},...wallet.transactions]};
}
export function applyDemoOnboardingRewards(wallet,application){
 wallet=applyDemoPassportReward(applyDemoVerificationReward(wallet,application),application);
 for(const reward of eligibleOnboardingRewards(application).filter(item=>!['book','passport'].includes(item.stage))){
  const id=application.reference+':'+reward.stage+'-reward';
  if(wallet.processed.includes(id))continue;
  const tibetUnits=reward.amount*100;
  wallet={...wallet,tibetUnits:wallet.tibetUnits+tibetUnits,processed:[...wallet.processed,id],transactions:[{id,type:'onboarding-reward',stage:reward.stage,tibetUnits,label:reward.label,createdAt:reward.createdAt},...wallet.transactions]};
 }
 return wallet;
}
export const demoCampaigns=Object.freeze([{id:'monlam',name:'Monlam AI'},{id:'dzongsar',name:'Dzongsar'}]);
export function advanceDemoCampaign(state,id){
 if(state.status!=='accepted')throw new Error('Complete membership signup before trying a reward campaign.');
 const campaign=demoCampaigns.find(item=>item.id===id);if(!campaign)throw new Error('Unknown reward campaign.');
 state.rewardDays||={};const day=Math.min(7,(state.rewardDays[id]||0)+1);state.rewardDays[id]=day;
 const txid=state.reference+':campaign:'+id;
 const wallet=state.walletDemo;
 if(day===7&&!wallet.processed.includes(txid))state.walletDemo={...wallet,tibetUnits:wallet.tibetUnits+10000,processed:[...wallet.processed,txid],transactions:[{id:txid,type:'partner-reward',tibetUnits:10000,label:campaign.name+' learning reward',createdAt:new Date().toISOString()},...wallet.transactions]};
 return day;
}
export const walletRewardUnread=state=>state.status==='accepted'&&state.walletDemo?.transactions.some(tx=>
 ['reward','passport-reward','onboarding-reward'].includes(tx.type)&&tx.id.startsWith(state.reference+':')&&
 (Array.isArray(state.walletRewardReadIds)?!state.walletRewardReadIds.includes(tx.id):!state.walletRewardRead))?1:0;
export const formatTokens=units=>new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(units/100);
export const formatDollars=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
export function parseAmount(value){
 const text=String(value).trim();
 if(!/^\d{1,9}(?:\.\d{1,2})?$/.test(text))throw new Error('Enter a positive amount with up to two decimal places.');
 const [whole,fraction='']=text.split('.');const units=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(!Number.isSafeInteger(units)||units<=0)throw new Error('Enter an amount greater than zero.');
 return units;
}
export function quoteDemoSwap(wallet,value){
 const tibetUnits=parseAmount(value);
 if(tibetUnits>wallet.tibetUnits)throw new Error('This amount exceeds your demo $TIBET balance.');
 const usdCents=Math.floor(tibetUnits*demoRateCents/100);
 if(usdCents<1)throw new Error('Enter at least 0.09 $TIBET for this example rate.');
 return {tibetUnits,usdCents};
}
function checkTransaction(wallet,id){if(!id||wallet.processed.includes(id))throw new Error('This demo transaction has already been completed.');}
export function swapDemoBalance(wallet,quote,id){
 checkTransaction(wallet,id);
 const checked=quoteDemoSwap(wallet,(quote.tibetUnits/100).toFixed(2));
 if(checked.usdCents!==quote.usdCents)throw new Error('The demo quote changed. Review the amount again.');
 return {...wallet,tibetUnits:wallet.tibetUnits-checked.tibetUnits,usdCents:wallet.usdCents+checked.usdCents,processed:[...wallet.processed,id],transactions:[{id,type:'swap',...checked,label:'Swapped to USD',createdAt:new Date().toISOString()},...wallet.transactions]};
}
export function withdrawDemoBalance(wallet,usdCents,id){
 checkTransaction(wallet,id);
 if(!Number.isSafeInteger(usdCents)||usdCents<=0)throw new Error('Enter a valid dollar amount.');
 if(usdCents>wallet.usdCents)throw new Error('This amount exceeds your demo USD balance.');
 return {...wallet,usdCents:wallet.usdCents-usdCents,processed:[...wallet.processed,id],transactions:[{id,type:'withdrawal',usdCents,label:'Withdrawal to sample bank',bank:'•••• 0421',createdAt:new Date().toISOString()},...wallet.transactions]};
}

// Fictional registered recipients for the local send demonstration.
export const demoSendGasUnits=25;
export const demoWalletMembers=Object.freeze([
 {id:'demo-sonam',username:'sonam.tsering',name:'Sonam Tsering',initials:'ST'},
 {id:'demo-pema',username:'pema.dolkar',name:'Pema Dolkar',initials:'PD'},
 {id:'demo-lobsang',username:'lobsang.norbu',name:'Lobsang Norbu',initials:'LN'}
].map(member=>Object.freeze(member)));
const normalizeUsername=value=>String(value??'').trim().replace(/^@/,'').toLowerCase();
export const findDemoRecipient=username=>demoWalletMembers.find(member=>member.username===normalizeUsername(username));
export function searchDemoRecipients(query){
 const text=normalizeUsername(query);
 return demoWalletMembers.filter(member=>member.username.includes(text));
}
export function quoteDemoSend(wallet,username,value){
 const recipient=findDemoRecipient(username);
 if(!recipient)throw new Error('Choose a registered username from the sample directory.');
 const tibetUnits=parseAmount(value),totalUnits=tibetUnits+demoSendGasUnits;
 if(totalUnits>wallet.tibetUnits)throw new Error('Your balance must cover the amount plus the 0.25 $TIBET gas fee.');
 return {recipientId:recipient.id,username:recipient.username,name:recipient.name,tibetUnits,gasUnits:demoSendGasUnits,totalUnits};
}
export function sendDemoBalance(wallet,quote,id){
 checkTransaction(wallet,id);
 if(!Number.isSafeInteger(quote?.tibetUnits)||quote.tibetUnits<=0)throw new Error('Enter a valid $TIBET amount.');
 const checked=quoteDemoSend(wallet,quote.username,(quote.tibetUnits/100).toFixed(2));
 if(['recipientId','username','name','gasUnits','totalUnits'].some(key=>quote[key]!==checked[key]))throw new Error('The recipient or fee changed. Review the send again.');
 return {...wallet,tibetUnits:wallet.tibetUnits-checked.totalUnits,
  recipientCredits:{...wallet.recipientCredits,[checked.recipientId]:(wallet.recipientCredits[checked.recipientId]||0)+checked.tibetUnits},
  gasSpentUnits:wallet.gasSpentUnits+checked.gasUnits,processed:[...wallet.processed,id],
  transactions:[{id,type:'send',...checked,label:'Sent to @'+checked.username,createdAt:new Date().toISOString()},...wallet.transactions]};
}
