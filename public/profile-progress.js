import {onboardingRewards,onboardingRewardTotal,eligibleOnboardingRewards,creditableOnboardingRewards,securityComplete,contactsComplete} from './onboarding-rewards.js';
export const hasMemberAccess=state=>state.status==='accepted'&&Boolean(state.reference);
export function verificationProgress(state){
 const joined=Boolean(state.reference),bookVerified=hasMemberAccess(state)&&['green','blue'].includes(state.book);
 const passportChecked=state.passport?.verified===true||state.demoPassportTier===true,passportVerified=hasMemberAccess(state)&&passportChecked;
 const photosReady=['front','back','identity','challenge'].every(kind=>state.photos?.[kind]);
 const contactsAdded=contactsComplete(state),securityAdded=securityComplete(state),earnedRewards=creditableOnboardingRewards(state);
 const pending=securityAdded?0:eligibleOnboardingRewards(state).reduce((sum,reward)=>sum+reward.amount,0);
 const rewardLabel=(id,done,fallback)=>earnedRewards.some(reward=>reward.stage===id)?`${onboardingRewards[id]} coins received`:done?hasMemberAccess(state)?'Completed · Set up wallet to receive coins':'Completed · Awaiting acceptance':fallback;
 return {earned:earnedRewards.reduce((sum,reward)=>sum+reward.amount,0),pending,available:state.book==='vouched'?onboardingRewardTotal-onboardingRewards.book:onboardingRewardTotal,bookVerified,passportVerified,stages:[
  {id:'join',title:'Join New Tibet',detail:'Choose a display name or pseudonym. Use a book or a member’s invitation.',done:joined,reward:onboardingRewards.join,label:rewardLabel('join',joined,'Choose how to join'),action:joined?null:'join'},
  {id:'book',title:'Verify your book',detail:state.book==='vouched'&&joined?'You joined by invitation. Book verification is a separate membership route.':bookVerified?securityAdded?'Your book verification is complete.':'Your book is verified. Set up a wallet to receive the $TIBET reward earned through book verification.':state.status==='pending'&&joined?'Your photos and video are awaiting review. Receiving coins requires approval and wallet setup.':state.status==='declined'&&joined?'Your application was declined. Contact New Tibet with your reference.':`${photosReady?'4 photos ready':'4 book photos'} + ${state.video?'video ready':'a short video'}. Your verification information is deleted after 60 days.`,done:bookVerified,reward:onboardingRewards.book,label:bookVerified?rewardLabel('book',true,''):state.book==='vouched'&&joined?'Book reward not earned':joined&&state.status==='pending'?'Awaiting approval':joined&&state.status==='declined'?'Contact support':`Verify to earn ${onboardingRewards.book}`,action:bookVerified||state.book==='vouched'&&joined?null:joined?'status':['green','blue'].includes(state.book)&&String(state.name||'').trim()?'evidence':'join'},
  {id:'security',title:'Set up your wallet',detail:`Set up your wallet to receive the $TIBET rewards earned through verification.${pending?` ${pending} $TIBET in setup rewards are waiting for your wallet.`:''} Use a passkey with Face ID, fingerprint or PIN, or confirm 12 recovery words in the demo. You can keep exploring and set up later.`,done:securityAdded,reward:onboardingRewards.security,label:rewardLabel('security',securityAdded,joined?'Required to receive $TIBET':'Join first'),action:joined?'security':null},
  {id:'passport',title:'Verify a passport · Optional',detail:'Tap a compatible NFC passport for a private cryptographic proof. Book membership does not require a passport.',done:passportChecked,reward:onboardingRewards.passport,label:rewardLabel('passport',passportChecked,joined?`Earn another ${onboardingRewards.passport}`:'Join first'),action:joined&&!passportChecked?'passport':null},
  {id:'contacts',title:'Contact details · Optional',detail:'Verify an email address or phone number to earn this reward. Announcements keeps you informed even if you skip this step.',done:contactsAdded,reward:onboardingRewards.contacts,label:rewardLabel('contacts',contactsAdded,joined?'Verify a contact':'Join first'),action:joined?'contacts':null}
 ]};
}
export function nextSetupAction(state){
 if(!state.reference)return state.profileSetupStep===1&&String(state.name||'').trim()&&state.book!=='vouched'?'evidence':'join';
 if(state.status==='declined')return null;
 const progress=verificationProgress(state);
 return ['security','passport','contacts'].find(id=>!progress.stages.find(stage=>stage.id===id).done&&(id==='security'||!state.onboardingSkipped?.includes(id)))||null;
}
export function signupStages(state){
 const progress=verificationProgress(state),joined=Boolean(state.reference),vouched=state.book==='vouched';
 const joining=progress.stages.find(stage=>stage.id==='join'),book=progress.stages.find(stage=>stage.id==='book');
 const reward=joining.reward+(vouched?0:book.reward),done=hasMemberAccess(state)&&(vouched||book.done);
 const evidence=state.profileSetupStep===1&&String(state.name||'').trim()&&!vouched;
 const label=done?securityComplete(state)?`${reward} coins received`:'Verified · Coins waiting for wallet':joined?state.status==='declined'?'Contact support':'Book uploaded · Processing':evidence?'Photos and video':'Choose how to join';
 const detail=joined?(vouched?'You joined through a member’s invitation. No book photos or video are required.':book.detail):vouched?'Choose a display name or pseudonym and redeem a verified member’s invitation code.':'Choose your Green or Blue Book and a display name, then provide four book photos and a short video. Verification information is deleted after 60 days.';
 return [{id:'membership',title:'Join New Tibet',detail,done,reward,label,action:done?null:joined?'status':evidence?'evidence':'join'},...progress.stages.filter(stage=>!['join','book'].includes(stage.id))];
}
export function profileSetupStatus(state){
 const stages=signupStages(state),optional=['passport','contacts'];
 const completed=stages.filter(stage=>stage.done||optional.includes(stage.id)&&state.onboardingSkipped?.includes(stage.id)).length;
 const needsSetup=completed<stages.length;
 const waiting=Boolean(state.reference)&&state.status==='pending'&&nextSetupAction(state)===null;
 return {completed,total:stages.length,needsSetup,prompt:state.status==='declined'?'View status':waiting?'In review':'Finish setup'};
}
export function rewardLadder(state,{currentStage,expandNext=true}={}){
 const progress=verificationProgress(state),stageId=id=>['join','book','evidence'].includes(id)?'membership':id;
 currentStage=stageId(currentStage);const expanded=currentStage||(expandNext?stageId(nextSetupAction(state)):null);
 return `<section class="verification-ladder setup-journey" aria-labelledby="verification-ladder-title"><div class="ladder-heading"><div><h3 id="verification-ladder-title">${state.status==='declined'?'Setup paused':'Your signup steps'}</h3><p>Earn up to ${progress.available} $TIBET</p></div><span class="ladder-earned">${progress.earned}<small>$TIBET earned</small></span></div><div class="signup-stage-list">${signupStages(state).map((item,index)=>{
  const active=item.id===currentStage,skipped=item.id!=='security'&&!item.done&&state.onboardingSkipped?.includes(item.id),label=skipped?'Skipped · Available later':state.demoSimulatedStages?.includes(item.id)?'Simulated · '+item.label:item.label;
  const actionable=state.status!=='declined'&&item.action;
  return `<details class="signup-stage ${item.done?'complete':''} ${active?'current':''}" name="signup-stages" data-verification-stage="${item.id}" ${active?'aria-current="step"':''} ${item.id===expanded?'open':''}><summary><span class="ladder-number" aria-hidden="true">${item.done?'✓':index+1}</span><span class="signup-stage-heading"><strong>${item.title.replace(' · Optional','')}</strong><small>${index>1?'Optional · ':''}${label}</small></span><span class="signup-stage-reward">+${item.reward}<small>$TIBET reward</small></span><span class="accordion-chevron" aria-hidden="true"></span></summary><div class="signup-stage-body" ${active?`data-stage-form="${item.id}"`:''}>${active?'':`<p>${item.detail}</p>${actionable?`<button class="primary" type="button" data-profile-setup="${item.action}">${item.done?'Manage step':item.action==='status'?'Check verification status':item.id==='membership'?'Continue signup':item.id==='security'?'Set up wallet to receive $TIBET':`Continue · +${item.reward} $TIBET`}</button>`:''}`}</div></details>`;
 }).join('')}</div><p class="section-note">${progress.pending?`<strong>${progress.pending} $TIBET in setup rewards waiting for wallet setup.</strong> `:''}Rewards from the New Tibet Foundation are credited once your membership is accepted and your wallet is set up. Passport and contact verification are optional. ${state.demoMode?'Demo rewards only; no real tokens are issued.':'Token distribution is planned.'}</p></section>`;
}
const guestKey='new-tibet-explore-v1';
export const rememberExplorer=storage=>{try{storage.setItem(guestKey,'1');}catch{}};
export const restoreExplorer=storage=>{try{return storage.getItem(guestKey)==='1';}catch{return false;}};
export const clearExplorer=storage=>{try{storage.removeItem(guestKey);}catch{}};
