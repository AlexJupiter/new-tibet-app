export const onboardingRewards=Object.freeze({join:10,book:100,passport:100,security:10,contacts:10});
export const onboardingRewardTotal=Object.values(onboardingRewards).reduce((sum,amount)=>sum+amount,0);
export const onboardingRewardLabels=Object.freeze({join:'Joined New Tibet',book:'Verification successful',passport:'NFC verification upgrade',security:'Wallet security completed',contacts:'Contact verification completed'});
const validTime=value=>Number.isFinite(Date.parse(value));
export const securityComplete=state=>Boolean(state.demoOnboardingStages?.security||state.passkey||state.wallet?.ready);
export const contactsComplete=state=>Boolean(state.demoOnboardingStages?.contacts||['email','whatsapp'].some(factor=>{
 const value=String(state[factor]||'');
 const normalized=factor==='email'?value.trim().toLowerCase():value.replace(/[\s()-]/g,'');
 return normalized&&state.verified?.[factor]===normalized;
}));
export function rememberDemoOnboardingStages(state){
 let changed=false;state.demoOnboardingStages||={};
 for(const [id,done] of [['security',securityComplete(state)],['contacts',contactsComplete(state)]]){
  if(done&&!validTime(state.demoOnboardingStages[id])){state.demoOnboardingStages[id]=new Date().toISOString();changed=true;}
 }
 return changed;
}
export function eligibleOnboardingRewards(state){
 if(state.status!=='accepted'||!/^NT-[A-Z0-9-]{4,60}$/.test(state.reference||''))return [];
 const accepted=state.inboxEvents?.find(event=>event.reference===state.reference&&event.status==='accepted');
 const completed={join:true,book:['green','blue'].includes(state.book),passport:state.demoPassportTier===true||state.passport?.verified===true,security:securityComplete(state),contacts:contactsComplete(state)};
 return Object.keys(onboardingRewards).filter(id=>completed[id]).map(id=>{
  const stageTime=id==='passport'?state.passportTierAt:state.demoOnboardingStages?.[id];
  const times=[stageTime,accepted?.createdAt,state.applicationCreatedAt].filter(validTime).map(Date.parse);
  return {stage:id,amount:onboardingRewards[id],label:onboardingRewardLabels[id],createdAt:times.length?new Date(Math.max(...times)).toISOString():new Date().toISOString()};
 });
}
