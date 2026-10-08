export const memberTabs=['announcements','petitions','chat','wallet','profile'];
export const samplePetitions=Object.freeze([
 {id:'language',category:'Language',title:'Support Tibetan language education',summary:'Expand access to Tibetan language classes and learning materials for the next generation.',body:'More community-run classes, open learning resources, and support for teachers serving Tibetan communities.',supporters:1842,goal:2500},
 {id:'education',category:'Education',title:'Create more student scholarships',summary:'Help Tibetan students access further education and vocational training.',body:'A transparent community scholarship programme with published eligibility criteria and an annual report.',supporters:936,goal:1500},
 {id:'heritage',category:'Culture',title:'Preserve Tibetan oral histories',summary:'Support a community archive of stories, language, and cultural knowledge.',body:'An accessible oral history archive with informed contributor consent and community oversight.',supporters:627,goal:1000}
]);
export const canUsePetitions=state=>state.status==='accepted'&&state.book==='green';
export const petitionsFor=state=>[...(state.createdPetitions||[]),...samplePetitions];
export const supporterCount=(petition,state)=>petition.supporters+(state.petitionSignatures.includes(petition.id)?1:0);
export function supportPetition(state,id){
 if(!canUsePetitions(state))throw new Error('Petitions are currently available only to verified Green Book holders.');
 if(!petitionsFor(state).some(p=>p.id===id))throw new Error('This petition is unavailable.');
 if(state.petitionSignatures.includes(id))return false;
 state.petitionSignatures.push(id);return true;
}
export function createPetition(state,{title,body,goal}){
 if(!canUsePetitions(state))throw new Error('Petitions are currently available only to verified Green Book holders.');
 title=String(title||'').trim();body=String(body||'').trim();goal=Number(goal);
 if(title.length<6||title.length>120)throw new Error('Use a title between 6 and 120 characters.');
 if(body.length<20||body.length>2000)throw new Error('Explain the change in 20–2,000 characters.');
 if(!Number.isSafeInteger(goal)||goal<10||goal>1000000)throw new Error('Choose a supporter goal from 10 to 1,000,000.');
 const petition={id:crypto.randomUUID(),category:'Community',title,summary:body.length>180?body.slice(0,177)+'…':body,body,goal,supporters:0,creator:state.name};
 state.createdPetitions.unshift(petition);return petition;
}

// A local demo ledger. Amounts are integers; no chain, exchange or bank is contacted.
export const demoRateCents=12;
export const initialDemoBalances=()=>({tibetUnits:125000,usdCents:0,processed:[],transactions:[{id:'allocation',type:'allocation',tibetUnits:125000,label:'Sample allocation'}]});
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
 return {...wallet,tibetUnits:wallet.tibetUnits-checked.tibetUnits,usdCents:wallet.usdCents+checked.usdCents,processed:[...wallet.processed,id],transactions:[{id,type:'swap',...checked,label:'Swapped to USD'},...wallet.transactions]};
}
export function withdrawDemoBalance(wallet,usdCents,id){
 checkTransaction(wallet,id);
 if(!Number.isSafeInteger(usdCents)||usdCents<=0)throw new Error('Enter a valid dollar amount.');
 if(usdCents>wallet.usdCents)throw new Error('This amount exceeds your demo USD balance.');
 return {...wallet,usdCents:wallet.usdCents-usdCents,processed:[...wallet.processed,id],transactions:[{id,type:'withdrawal',usdCents,label:'Withdrawal to sample bank',bank:'•••• 0421'},...wallet.transactions]};
}
