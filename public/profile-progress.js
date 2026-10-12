import {onboardingRewards,onboardingRewardTotal,eligibleOnboardingRewards,securityComplete,contactsComplete} from './onboarding-rewards.js';
export const hasMemberAccess=state=>state.status==='accepted'&&Boolean(state.reference);
export function verificationProgress(state){
 const joined=Boolean(state.reference),bookVerified=hasMemberAccess(state)&&['green','blue'].includes(state.book);
 const passportChecked=state.passport?.verified===true||state.demoPassportTier===true,passportVerified=hasMemberAccess(state)&&passportChecked;
 const photosReady=['front','back','identity','challenge'].every(kind=>state.photos?.[kind]);
 const contactsAdded=contactsComplete(state),securityAdded=securityComplete(state),earnedRewards=eligibleOnboardingRewards(state);
 const rewardLabel=(id,done,fallback)=>earnedRewards.some(reward=>reward.stage===id)?`${onboardingRewards[id]} coins earned`:done?'Completed · Awaiting acceptance':fallback;
 return {earned:earnedRewards.reduce((sum,reward)=>sum+reward.amount,0),available:state.book==='vouched'?onboardingRewardTotal-onboardingRewards.book:onboardingRewardTotal,bookVerified,passportVerified,stages:[
  {id:'join',title:'Join New Tibet',detail:'Choose a display name or pseudonym. Use a book or a member’s invitation.',done:joined,reward:onboardingRewards.join,label:rewardLabel('join',joined,'Choose how to join'),action:joined?null:'join'},
  {id:'book',title:'Verify your book',detail:state.book==='vouched'&&joined?'You joined by invitation. Book verification is a separate membership route.':state.status==='pending'&&joined?'Your photos and video are awaiting review. Coins are added after approval.':state.status==='declined'&&joined?'Your application was declined. Contact New Tibet with your reference.':`${photosReady?'4 photos ready':'4 book photos'} + ${state.video?'video ready':'a short video'}. Your verification information is deleted after 60 days.`,done:bookVerified,reward:onboardingRewards.book,label:bookVerified?`${onboardingRewards.book} coins earned`:state.book==='vouched'&&joined?'Book reward not earned':joined&&state.status==='pending'?'Awaiting approval':joined&&state.status==='declined'?'Contact support':`Verify to earn ${onboardingRewards.book}`,action:bookVerified||state.book==='vouched'&&joined?null:joined?'status':['green','blue'].includes(state.book)&&String(state.name||'').trim()?'evidence':'join'},
  {id:'security',title:'Set up your wallet · Optional',detail:'Set up a wallet for your free $TIBET after membership approval. Use a passkey with Face ID, fingerprint or PIN, or confirm 12 recovery words in the demo.',done:securityAdded,reward:onboardingRewards.security,label:rewardLabel('security',securityAdded,joined?'Set up your wallet':'Join first'),action:joined?'security':null},
  {id:'passport',title:'Verify a passport · Optional',detail:'Tap a compatible NFC passport for a private cryptographic proof. Book membership does not require a passport.',done:passportChecked,reward:onboardingRewards.passport,label:rewardLabel('passport',passportChecked,joined?`Earn another ${onboardingRewards.passport}`:'Join first'),action:joined&&!passportChecked?'passport':null},
  {id:'contacts',title:'Contact details · Optional',detail:'Verify an email address or phone number to earn this reward. Announcements keeps you informed even if you skip this step.',done:contactsAdded,reward:onboardingRewards.contacts,label:rewardLabel('contacts',contactsAdded,joined?'Verify a contact':'Join first'),action:joined?'contacts':null}
 ]};
}
export function nextSetupAction(state){
 if(!state.reference)return state.profileSetupStep===1&&String(state.name||'').trim()&&state.book!=='vouched'?'evidence':'join';
 if(state.status==='declined')return null;
 const progress=verificationProgress(state);
 return ['security','passport','contacts'].find(id=>!progress.stages.find(stage=>stage.id===id).done&&!state.onboardingSkipped?.includes(id))||null;
}
export function rewardLadder(state,{currentStage}={}){
 const progress=verificationProgress(state),next=nextSetupAction(state),expanded=currentStage||next;
 return `<section class="verification-ladder setup-journey" aria-labelledby="verification-ladder-title"><div class="ladder-heading"><div><h3 id="verification-ladder-title">${state.status==='declined'?'Setup paused':'Your signup steps'}</h3><p>Earn up to ${progress.available} free $TIBET</p></div><span class="ladder-earned">${progress.earned}<small>$TIBET earned</small></span></div><div class="signup-stage-list">${progress.stages.map((item,index)=>{
  const active=item.id===currentStage,skipped=!item.done&&state.onboardingSkipped?.includes(item.id),detailsSaved=item.id==='join'&&!state.reference&&currentStage==='book';
  const label=detailsSaved?'Membership details saved':skipped?'Skipped · Available later':item.label;
  const unavailable=item.id==='book'&&state.book==='vouched';
  const actionable=state.status!=='declined'&&item.action&&!unavailable&&!(item.id==='book'&&currentStage==='join');
  return `<details class="signup-stage ${item.done||detailsSaved?'complete':''} ${active?'current':''}" name="signup-stages" data-verification-stage="${item.id}" ${active?'aria-current="step"':''} ${item.id===expanded?'open':''}><summary><span class="ladder-number" aria-hidden="true">${item.done||detailsSaved?'✓':index+1}</span><span class="signup-stage-heading"><strong>${item.title.replace(' · Optional','')}</strong><small>${index>1?'Optional · ':''}${unavailable?'Not required with an invitation':label}</small></span><span class="signup-stage-reward">${unavailable?`<s>+${item.reward}</s>`:`+${item.reward}`}<small>${unavailable?'Book route only':'free $TIBET'}</small></span><span class="accordion-chevron" aria-hidden="true"></span></summary><div class="signup-stage-body" ${active?`data-stage-form="${item.id}"`:''}>${active?'':`<p>${item.detail}</p>${actionable?`<button class="primary" type="button" data-profile-setup="${item.action}">${detailsSaved?'Edit membership':item.done?'Manage step':item.action==='status'?'Check verification status':item.id==='join'?'Start signup':`Continue · +${item.reward} $TIBET`}</button>`:''}`}</div></details>`;
 }).join('')}</div><p class="section-note">Rewards from the New Tibet Foundation are credited once after membership acceptance. Optional steps can be skipped. ${state.demoMode?'Demo rewards only; no real tokens are issued.':'Token distribution is planned.'}</p></section>`;
}
const guestKey='new-tibet-explore-v1';
export const rememberExplorer=storage=>{try{storage.setItem(guestKey,'1');}catch{}};
export const restoreExplorer=storage=>{try{return storage.getItem(guestKey)==='1';}catch{return false;}};
export const clearExplorer=storage=>{try{storage.removeItem(guestKey);}catch{}};
