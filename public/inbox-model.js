import {onboardingRewards} from './onboarding-rewards.js';
import {rewardCelebrationKeys} from './reward-celebration.js';
export const sampleAnnouncements=Object.freeze([
 {id:'sample-community',kind:'announcement',title:'New Tibet community updates',body:'Important New Tibet announcements will appear in this channel. You can read them in the app without sharing an email address or phone number.',createdAt:'2026-10-08T09:00:00Z',sample:true},
 {id:'sample-petitions',kind:'announcement',title:'Green Book petitions',body:'Everyone can read petitions and view their results. Creating and supporting petitions currently requires verified Green Book membership. Your application receipt and review decisions are private to you.',createdAt:'2026-10-07T14:00:00Z',sample:true}
]);
const storageKey='new-tibet-demo-inbox-v1';
const statuses=['pending','accepted','declined'];
export function applicationEvent(reference,status,book,createdAt=new Date().toISOString()){
 if(!statuses.includes(status))throw new Error('Invalid application status.');
 return {id:reference+':'+status,kind:'application',reference,status,book,createdAt,title:book==='vouched'&&status==='pending'?'Invitation received':status==='pending'?'Application received':status==='accepted'?'Membership application accepted':'Membership application declined',body:book==='vouched'&&status==='pending'?'Your member invitation was received. No book photos or video were needed.':status==='pending'?'Your membership application has been received and is awaiting review. Your decision will appear here.':book==='vouched'&&status==='accepted'?'You joined as a vouched member. Open Profile to view your membership card. Green Book petition rights still require book verification.':status==='accepted'?'Your membership application has been accepted. Open Profile to view your digital membership card.':'Your membership application could not be approved. Keep your reference when contacting New Tibet for help.'};
}
export function recordApplicationEvent(state,status){
 state.applicationCreatedAt||=new Date().toISOString();
 const event=applicationEvent(state.reference,status,state.book,status==='pending'?state.applicationCreatedAt:undefined);
 if(!state.inboxEvents.some(item=>item.id===event.id))state.inboxEvents.push(event);
 return event;
}
export const inboxItems=(state,demo)=>[...(demo&&state.status==='accepted'?sampleAnnouncements:[]),...(demo?state.inboxEvents:state.inboxItems)].filter(item=>state.status==='accepted'||item.kind==='application').sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id));
export const unreadCount=(state,demo)=>inboxItems(state,demo).filter(item=>!state.inboxRead.includes(item.id)).length;
export function saveDemoInbox(storage,state){
 if(!state.reference)return;
 // Store completion dates and reward read IDs, never contacts, media, proofs or wallet keys.
 const demoOnboardingStages=Object.fromEntries(['security','contacts'].filter(id=>Number.isFinite(Date.parse(state.demoOnboardingStages?.[id]))).map(id=>[id,state.demoOnboardingStages[id]]));
 const onboardingSkipped=['passport','security','contacts'].filter(id=>state.onboardingSkipped?.includes(id));
 const rewardCelebrations=rewardCelebrationKeys.filter(key=>state.rewardCelebrations?.includes(key));
 const rewardIds=new Set(['verification',...Object.keys(onboardingRewards)].map(id=>state.reference+':'+id+'-reward'));
 const snapshot={version:1,reference:state.reference,status:state.status,book:state.book,createdAt:state.applicationCreatedAt,events:state.inboxEvents.map(({id,reference,status,book,createdAt})=>({id,reference,status,book,createdAt})),read:state.inboxRead.slice(-500),demoPassportTier:state.demoPassportTier===true,passportTierAt:state.demoPassportTier?state.passportTierAt:undefined,demoOnboardingStages,onboardingSkipped,rewardCelebrations,walletRewardRead:state.walletRewardRead===true,walletRewardReadIds:Array.isArray(state.walletRewardReadIds)?state.walletRewardReadIds.filter(id=>rewardIds.has(id)):undefined};
 try{storage.setItem(storageKey,JSON.stringify(snapshot));return true;}catch{return false;}
}
export function restoreDemoInbox(storage){
 try{
  const raw=storage.getItem(storageKey);if(!raw||raw.length>100000)return null;const saved=JSON.parse(raw);
  if(saved.version!==1||!/^NT-[A-Z0-9-]{4,60}$/.test(saved.reference)||!statuses.includes(saved.status)||!['green','blue','vouched'].includes(saved.book)||!Array.isArray(saved.events)||saved.events.length>200)return null;
  const events=saved.events.filter(event=>event.reference===saved.reference&&statuses.includes(event.status)&&event.book===saved.book&&Number.isFinite(Date.parse(event.createdAt))).map(event=>applicationEvent(event.reference,event.status,event.book,event.createdAt));
  const allowed=new Set([...events,...sampleAnnouncements].map(item=>item.id));
  const demoOnboardingStages=Object.fromEntries(['security','contacts'].filter(id=>Number.isFinite(Date.parse(saved.demoOnboardingStages?.[id]))).map(id=>[id,saved.demoOnboardingStages[id]]));
  const onboardingSkipped=Array.isArray(saved.onboardingSkipped)?['passport','security','contacts'].filter(id=>saved.onboardingSkipped.includes(id)):[];
  const completedStages=['join',...(['green','blue'].includes(saved.book)?['book']:[]),...(saved.demoPassportTier?['passport']:[]),...Object.keys(demoOnboardingStages)];
  const rewardCelebrations=Array.isArray(saved.rewardCelebrations)?rewardCelebrationKeys.filter(key=>saved.rewardCelebrations.includes(key)):completedStages.map(stage=>stage+':'+(saved.status==='accepted'?'credited':'completed'));
  const rewardIds=new Set(['verification',...Object.keys(onboardingRewards)].map(id=>saved.reference+':'+id+'-reward'));
  return {reference:saved.reference,status:saved.status,book:saved.book,applicationCreatedAt:Number.isFinite(Date.parse(saved.createdAt))?saved.createdAt:events[0]?.createdAt,inboxEvents:events,inboxRead:Array.isArray(saved.read)?saved.read.filter(id=>allowed.has(id)):[],demoPassportTier:saved.demoPassportTier===true,passportTierAt:saved.demoPassportTier&&Number.isFinite(Date.parse(saved.passportTierAt))?saved.passportTierAt:undefined,demoOnboardingStages,onboardingSkipped,rewardCelebrations,walletRewardRead:saved.walletRewardRead===true,walletRewardReadIds:Array.isArray(saved.walletRewardReadIds)?saved.walletRewardReadIds.filter(id=>rewardIds.has(id)):undefined};
 }catch{return null;}
}
export function clearDemoInbox(storage){try{storage.removeItem(storageKey);}catch{}}
