import {sampleApplicant} from './demo-profile.js';
import {loadImage} from './images.js';
import {cardControls,mountProfileCard} from './card.js';
import {passportDiagram,walletDiagram} from './diagrams.js';
import {renderAccountTabs,renderPetitions,renderChat} from './account.js';
import {renderWallet} from './wallet.js';
import {initialDemoBalances,applyDemoOnboardingRewards,walletRewardUnread} from './member-model.js';
import {onboardingRewards,rememberDemoOnboardingStages,securityComplete,contactsComplete} from './onboarding-rewards.js';
import {claimStageCelebration,claimApprovalCelebration,showRewardCelebration} from './reward-celebration.js';
import {renderAnnouncements} from './announcements.js';
import {renderEcosystem} from './ecosystem.js';
import {mountWelcomeSlideshow} from './welcome.js';
import {canInvite,membershipLabel,createDemoInvite,redeemDemoInvite,clearDemoInvites,invitationMessage} from './invites.js';
import {hasMemberAccess,rewardLadder,setupProgress,rememberExplorer,restoreExplorer,clearExplorer} from './profile-progress.js';
import {renderRestricted} from './restricted.js';
import {recordApplicationEvent,inboxItems,unreadCount,saveDemoInbox,restoreDemoInbox,clearDemoInbox} from './inbox-model.js';
const config = window.NEW_TIBET_CONFIG || {mode:'demo',apiBase:''};
const showcaseTab=new URLSearchParams(location.search).get('showcase');
const showcase=['profile','wallet','petitions','chat','ecosystem','announcements'].includes(showcaseTab);
const demo = showcase || config.mode !== 'live';
const steps=Object.freeze({document:0,photos:1,video:2,passport:3,security:4,contacts:5,account:6});
const initialState = () => ({step:-1,book:'green',name:'',email:'',whatsapp:'',country:'',countryConsent:false,countryStatsCounted:false,verified:{},codes:{},photo:null,photos:{},photoKind:'front',evidenceView:'photos',demoPassportTier:false,passportTierAt:'',rewardDays:{},challenge:null,video:null,videoURL:'',passport:null,passportRequest:null,passkey:null,consent:false,reference:'',status:'pending',messages:[],demoSkipped:{contacts:false,passport:false},demoSampleApplicant:false,demoVideo:false,appTab:'announcements',lastAppTab:'profile',applicationCreatedAt:'',inboxEvents:[],inboxItems:[],inboxRead:[],inboxExpanded:'',inboxLoading:false,inboxError:'',petitionSignatures:[],createdPetitions:[],petitionView:'list',petitionDraft:{title:'',body:'',goal:'1000'},chatMessages:[],chatDrafts:{},chatConversation:'community',chatOpen:false,chatSearch:'',wallet:null,walletMethod:'passkey',recoveryStage:'',walletPrfSalt:'',walletDemo:null,walletRewardRead:false,walletView:'home',walletQuote:null,walletReceipt:null,walletSwapInput:'',walletWithdrawInput:'',walletSendInput:'',walletSendSearch:'',walletSendRecipient:''});
const state = initialState();
state.inviteCode='';state.invitation=null;
state.guest=false;state.profileSetup=false;state.profileSetupStep=null;
state.demoOnboardingStages={};state.walletRewardReadIds=[];
state.onboardingSkipped=[];
state.rewardCelebrations=[];
const invitationCode=new URLSearchParams(location.search).get('invite')||'';
const accountLayout=matchMedia('(min-width: 900px)');
accountLayout.addEventListener('change',()=>document.querySelector('.app-tabs')?.setAttribute('aria-orientation',accountLayout.matches?'vertical':'horizontal'));
let recorder, recordingTimer, passportClient, passportGeneration=0,welcomeSlideshow;
let stream, busy = false, sessionToken = '';
const screen = document.querySelector('#screen');
const icons = {
 trust:'<circle cx="12" cy="12" r="3"/><circle cx="4" cy="4" r="2"/><circle cx="20" cy="4" r="2"/><circle cx="4" cy="20" r="2"/><circle cx="20" cy="20" r="2"/><path d="m5.5 5.5 4.4 4.4m4.2 0 4.4-4.4m-13 13 4.4-4.4m4.2 0 4.4 4.4M6 4h12M4 6v12m2 2h12M20 6v12"/>',
 check:'<path d="m5 12 4 4L19 6"/>', shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>', camera:'<path d="M4 7h4l2-3h4l2 3h4v13H4z"/><circle cx="12" cy="13" r="4"/>', key:'<circle cx="8" cy="8" r="5"/><path d="m12 12 9 9m-5-5 3-3m-6 0 3-3"/>', info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>', arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>'
};
const svg=(name)=>`<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const esc=(value)=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bookLabel=()=>state.book==='vouched'?'Vouched by a member':state.book==='green'?'Green Book':'Blue Book';
const notice=(message='')=>{document.querySelector('#notice').textContent=message;};
const b64=(bytes)=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const from64=(str)=>Uint8Array.from(atob(str.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-str.length%4)%4)),c=>c.charCodeAt(0));
async function api(path, body){const res=await fetch(config.apiBase.replace(/\/$/,'')+'/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(sessionToken?{Authorization:'Bearer '+sessionToken}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await res.json();if(!res.ok)throw new Error(data.error||'Something went wrong. Please try again.');return data;}
async function session(){if(!sessionToken){const data=await api('session',{});sessionToken=data.token;if(!demo)try{sessionStorage.setItem('new-tibet-session-v1',sessionToken);}catch{}}}
function stopCamera(){if(recorder?.state==='recording'){recorder.onstop=null;recorder.stop();}recorder=null;clearInterval(recordingTimer);if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;}
function restartDemo(){
 if(!demo||showcase)return;
 stopCamera();passportGeneration++;passportClient?.clearAllRequests();
 state.wallet?.words?.fill('');
 if(state.videoURL)URL.revokeObjectURL(state.videoURL);
 try{clearDemoInbox(localStorage);clearExplorer(localStorage);clearDemoInvites(localStorage);}catch{}
 // A fresh document also discards pending demo operations, drafts and dialog state.
 location.replace(new URL('./',location.href).href);
}
function navigate(step){if(step===steps.video){step=steps.photos;state.evidenceView="video";}else if(step===steps.photos){state.evidenceView="photos";}if(state.step===steps.security&&step!==steps.security&&state.wallet?.words){state.wallet.words.fill('');state.wallet=null;state.recoveryStage='';}stopCamera();if(state.step===steps.passport&&step!==steps.passport){passportGeneration++;passportClient?.clearAllRequests();state.passportRequest=null;}if(step===steps.account)state.profileSetup=false;state.step=step;notice();render();window.scrollTo(0,0);document.querySelector(step===-1?'#splash-title':'#screen-title')?.focus({preventScroll:true});}
function explore(startJoining=false){
 if(busy)return;
 if(state.reference){state.appTab='profile';return navigate(steps.account);}
 state.guest=true;state.status='guest';state.appTab='profile';state.lastAppTab='profile';rememberExplorer(localStorage);
 if(startJoining)return startProfileSetup(steps.document);
 navigate(steps.account);
}
function startProfileSetup(step){if(busy)return;state.appTab='profile';state.profileSetup=true;state.profileSetupStep=step;navigate(step);}
function presentReward(reward,continuation){
 if(!reward||showcase){continuation?.();return;}
 if(demo){rememberDemoOnboardingStages(state);state.walletDemo=applyDemoOnboardingRewards(state.walletDemo||initialDemoBalances(),state);}
 persistInbox();showRewardCelebration(reward,{demo,onContinue:continuation});
}
function celebrateStage(stage,continuation){if(showcase){continuation?.();return;}presentReward(claimStageCelebration(state,stage),continuation);}
function celebrateApproval(continuation){if(showcase){continuation?.();return;}presentReward(claimApprovalCelebration(state),continuation);}
function completeWalletSetup(){setSetupSkipped('security',false);celebrateStage('security',()=>navigate(steps.passport));}
function continueAfterVerification(){
 state.appTab='profile';
 if(!securityComplete(state)&&!state.onboardingSkipped.includes('security')){
  state.profileSetup=true;state.profileSetupStep=steps.security;return navigate(steps.security);
 }
 navigate(steps.account);
}
function closeProfileSetup(){if(busy)return;state.profileSetupStep=state.step;state.appTab='profile';navigate(steps.account);}
function setSetupSkipped(id,skipped){state.onboardingSkipped=(state.onboardingSkipped||[]).filter(item=>item!==id);if(skipped)state.onboardingSkipped.push(id);persistInbox();}
function showProfileSetup(){
 state.profileSetupStep=state.step;
 if(state.step===steps.document)renderBooks();else if(state.step===steps.photos)renderPhoto();else if(state.step===steps.passport)renderPassport();else if(state.step===steps.security)renderSecurity();else if(state.step===steps.contacts)renderContacts();
 screen.insertAdjacentHTML('afterbegin',`${state.reference?'<button class="text-button profile-back" id="profile-setup-close" type="button">← Back to Profile</button>':''}${setupProgress(state,state.step)}`);
 screen.querySelector('#profile-setup-close')?.addEventListener('click',closeProfileSetup);
}
function render(){
 document.querySelector('#mode-banner').hidden=!demo;document.querySelector('#mode-banner').textContent=demo?'Demo':'';
 document.querySelector('#splash').hidden=state.step!==-1;
 document.querySelector('#signup').hidden=state.step===-1;
 document.body.classList.toggle('showing-splash',state.step===-1);
 document.body.classList.toggle('demo-mode',demo);
 const inApp=state.step===steps.account||state.profileSetup;
 document.body.classList.toggle('showing-account',inApp);
 document.body.classList.toggle('exploring',state.guest);
 document.querySelector('#announcements-button').hidden=!inApp;
 document.body.classList.toggle('showing-onboarding',!state.profileSetup&&state.step>=0&&state.step<=1&&!state.reference);
 document.body.dataset.appTab=state.appTab;
 if(state.step===-1&&!showcase){welcomeSlideshow||=mountWelcomeSlideshow(document.querySelector('#welcome-slideshow'));welcomeSlideshow.setActive(true);}else welcomeSlideshow?.setActive(false);
 renderDemoFooter();
 document.querySelector('.surface-top').hidden=inApp;
 document.querySelector('#signup').classList.toggle('profile-view',inApp);
 document.querySelector('.onboarding-nav')?.remove();
 if(!state.profileSetup&&state.step>=0&&state.step<=1&&!state.reference){
  document.querySelector('#signup').insertAdjacentHTML('afterbegin',`<nav class="onboarding-nav" aria-label="Application steps"><a class="sidebar-brand" href="./" data-demo-home aria-label="New Tibet home"><img src="${new URL('./assets/new-tibet-logo-blue.svg',import.meta.url).href}" alt=""/></a><h3>Join New Tibet</h3>${(state.book==='vouched'?['Join with an invitation']:['Choose how to join','Verify your book']).map((label,index)=>`<button type="button" data-step="${index}" ${index===state.step?'aria-current="step"':''} ${index>state.step?'disabled':''}><span>${index<state.step?'✓':index+1}</span>${label}</button>`).join('')}<span class="sidebar-note">${demo?'Demo · Nothing is uploaded.':'Your application is private.'}</span></nav>`);
  document.querySelectorAll('[data-step]').forEach(button=>button.onclick=()=>{if(busy)return;const step=Number(button.dataset.step);if(step<=state.step)navigate(step);});
 }
 if(state.step===-1)return;
 if(state.profileSetup){renderAcceptedAccount();return;}
 document.querySelector('#step-label').textContent=state.step===6?'Complete':state.reference?'Optional setup':state.book==='vouched'?'Join with an invitation':`Step ${state.step+1} of 2`;document.querySelector('#progress').hidden=Boolean(state.reference)||state.book==='vouched';
 const completed=Math.min(state.step,2);document.querySelector('#progress').setAttribute('aria-valuemax','2');document.querySelector('#progress').setAttribute('aria-valuenow',String(completed));document.querySelector('#progress').setAttribute('aria-valuetext',state.step===6?'Application complete':`Step ${state.step+1} of 2`);document.querySelector('#progress-fill').style.width=`${completed/2*100}%`;
 if(state.step===0)renderBooks();if(state.step===1)renderPhoto();if(state.step===2)renderVideo();if(state.step===steps.passport)renderPassport();if(state.step===steps.security)renderSecurity();if(state.step===steps.contacts)renderContacts();if(state.step===6)renderSuccess();
}
function heading(title,desc){return `<h2 id="screen-title" tabindex="-1">${title}</h2><p class="description">${desc}</p>`;}
function renderDemoFooter(){
 const footer=document.querySelector('#demo-footer');
 footer.hidden=!demo;
 if(!demo)return;
 const button=document.querySelector('#demo-next');
 button.disabled=false;
 button.textContent=state.step===0&&state.book==='vouched'?'Use sample invitation':state.step===1&&!photoKinds.every(kind=>state.photos[kind])?'Upload sample photos'
  :state.step===1&&!state.video?'Upload sample video'
  :state.step===6&&state.guest?'Start verification':state.step===6&&state.status==='accepted'?'Restart demo':'Skip';
}
async function demoNext(){
 if(!demo||busy)return;
 if(state.step===-1)return explore(true);
 if(state.step===steps.document){state.name=state.name.trim()||sampleApplicant.name;if(state.book==='vouched'){state.inviteCode=(await createDemoInvite({status:'accepted',book:'green'})).code;render();return notice('Fictional sample invitation added. Choose Join New Tibet to continue.');}state.consent=true;return celebrateStage('join',()=>navigate(steps.photos));}
 if(state.step===1){
  if(photoKinds.every(kind=>state.photos[kind])&&state.video){state.consent=true;return submit();}
  return uploadDemoSamples();
 }
 if(state.step===2){
  if(state.video)return navigate(steps.security);
  return uploadDemoSamples();
 }
 if(state.step===steps.contacts){
  state.demoSkipped.contacts=!contactsReady();
  // Unverified optional contacts are omitted instead of inventing a recipient.
  for(const factor of ['email','whatsapp'])if(state.verified[factor]!==normalize(factor,state[factor])){state[factor]='';delete state.verified[factor];delete state.codes[factor];}
  return submit();
 }
 if(state.step===steps.passport){
  if(!state.passport?.verified){state.demoSkipped.passport=true;state.passport={verified:false,preview:true};}
  setSetupSkipped('passport',!state.passport?.verified&&!state.demoPassportTier);return navigate(steps.contacts);
 }
 if(state.step===steps.security){if(securityComplete(state))return completeWalletSetup();setSetupSkipped('security',true);return navigate(steps.passport);}
 if(state.step===6){
  if(state.guest)return startProfileSetup(state.profileSetupStep??steps.document);
  if(state.status!=='accepted')return simulateReview('accepted');
  return restartDemo();
 }
}
async function uploadDemoSamples(){
 if(!demo||busy||state.step!==steps.photos)return;
 const step=state.step;
 stopCamera();busy=true;notice();
 const button=document.querySelector('#demo-next');button.disabled=true;button.textContent='Loading sample…';
 try{
  const {samplePhoto,sampleVideo}=await import('./demo-media.js');
  if(state.step!==step)return;
  if(!photoKinds.every(kind=>state.photos[kind])){
   await ensureChallenge();
   if(state.step!==step)return;
   // Complete sample sets share the recorded clip's clearly labeled example code.
   if(Object.keys(state.photos).length===0)state.challenge={code:sampleApplicant.challengeCode};
   const book=state.book;
   const samples=await Promise.all(photoKinds.filter(kind=>!state.photos[kind]).map(async kind=>[kind,await samplePhoto(book,kind,state.challenge.code)]));
   if(state.step!==step||state.book!==book)return;
   for(const [kind,photo] of samples)if(!state.photos[kind])state.photos[kind]=photo;
   state.demoSampleApplicant=true;
   for(const factor of ['name']){if(!state[factor].trim())state[factor]=sampleApplicant[factor];}
   render();notice('Sample photos added for this demo.');
  }else{
   state.evidenceView='video';
   const video=await sampleVideo(state.book);
   if(state.step!==step)return;
   await loadVideo(video);
   if(state.step===step&&state.video){state.demoVideo=true;render();notice('Narrated fictional sample added. Its example code is '+sampleApplicant.challengeCode+'.');}
  }
 }catch(error){notice(error.message||'Unable to load the sample. Please try again.');}
 finally{busy=false;renderDemoFooter();}
}
function selectMembershipRoute(book){
 if(state.book!==book){
  state.book=book;state.photo=null;state.photos={};state.video=null;state.demoVideo=false;
  if(state.videoURL)URL.revokeObjectURL(state.videoURL);state.videoURL='';
 }
 if(book!=='vouched')state.inviteCode='';
}
function renderBooks(){
 const emblem='<svg viewBox="0 0 40 40" fill="none" stroke="currentColor"><circle cx="20" cy="18" r="10"/><path d="M20 5v26M7 18h26M11 9l18 18M11 27 29 9M5 34h30"/></svg>';
 const vouched=state.book==='vouched';
 screen.innerHTML=heading('Join New Tibet.','Choose your membership and a display name.')+`<form id="document-form">
  <div class="book-grid membership-options" role="group" aria-label="Choose how to join">${['green','blue','vouched'].map(book=>`<button type="button" class="book-card ${book==='vouched'?'code-choice ':''}${state.book===book?'selected':''}" data-book="${book}" aria-pressed="${state.book===book}"><span class="radio" aria-hidden="true">${state.book===book?'✓':''}</span>${book==='vouched'?`<div class="vouch-symbol" aria-hidden="true">${svg('trust')}</div>`:`<div class="book ${book}" aria-hidden="true">${emblem}</div>`}<h3>${book==='vouched'?'Use a verification code':book==='green'?'Green Book':'Blue Book'}</h3>${book==='vouched'?'<p>Vouched by a member · No book needed</p>':''}</button>`).join('')}</div>
  ${vouched?`<label class="field"><span>Member verification code · Required</span><input id="invite-code" value="${esc(state.inviteCode||'')}" maxlength="64" autocomplete="off" autocapitalize="characters" spellcheck="false" required placeholder="Paste your verification code" aria-describedby="invite-hint"/><small id="invite-hint">Ask a verified member to generate a code using Invite on their profile.${demo?' Use a DEMO-NT code in this demo.':''}</small></label>`:''}
  <label class="field"><span>Display name · Required</span><input id="name" autocomplete="nickname" value="${esc(state.name)}" maxlength="100" required aria-describedby="name-hint" placeholder="Choose a display name"/><small id="name-hint">You can use a pseudonym instead of your real name. This name appears in the app.</small></label>
  <div class="helper">${svg('info')}<span>${vouched?'Join with your code, without book photos or a video. The book reward and petition voting require book verification.':'Next: four book photos and a short video. Verification information is deleted after 60 days.'}</span></div><div class="actions"><button class="primary" id="continue" type="submit" ${!documentReady()?'disabled':''}>${vouched?'Join New Tibet':'Continue to verification'}</button></div></form>
  <button class="text-button signup-sign-in" id="profile-sign-in" type="button">Already a member? Sign in</button><p id="profile-signin-status" role="status"></p>`;
 screen.querySelectorAll('[data-book]').forEach(button=>button.onclick=()=>{if(busy)return;selectMembershipRoute(button.dataset.book);render();if(state.book==='vouched')document.querySelector('#invite-code').focus();});
 document.querySelector('#name').oninput=event=>{state.name=event.target.value;document.querySelector('#continue').disabled=!documentReady();};
 document.querySelector('#invite-code')?.addEventListener('input',event=>{state.inviteCode=event.target.value;document.querySelector('#continue').disabled=!documentReady();});
 document.querySelector('#document-form').onsubmit=event=>{event.preventDefault();if(documentReady()){state.name=state.name.trim();if(state.book==='vouched')joinWithInvite();else celebrateStage('join',()=>navigate(steps.photos));}};
 document.querySelector('#profile-sign-in').onclick=signIn;
}
async function joinWithInvite(){
 if(busy||!documentReady())return;busy=true;notice();const button=screen.querySelector('#continue'),code=state.inviteCode,name=state.name;button.disabled=true;button.textContent='Joining…';
 screen.querySelectorAll('#document-form input').forEach(input=>input.readOnly=true);screen.querySelectorAll('[data-book]').forEach(button=>button.disabled=true);
 try{
  if(demo){await redeemDemoInvite(code,localStorage);state.name=name;state.reference='NT-'+crypto.randomUUID().slice(0,8).toUpperCase();state.applicationCreatedAt=new Date().toISOString();recordApplicationEvent(state,'pending');state.status='accepted';recordApplicationEvent(state,'accepted');persistInbox();}
  else{await session();const result=await api('invites/redeem',{code,name});applyInboxData({items:[],application:result.application});}
  state.guest=false;clearExplorer(localStorage);state.profileSetupStep=null;state.inviteCode='';state.appTab='profile';const url=new URL(location.href);url.searchParams.delete('invite');history.replaceState(null,'',url);celebrateStage('join',continueAfterVerification);if(!demo)await refreshInbox();
 }catch(error){notice(error.message);if(button.isConnected){button.disabled=false;button.textContent='Join New Tibet';}}
 finally{busy=false;if(button.isConnected){screen.querySelectorAll('#document-form input').forEach(input=>input.readOnly=false);screen.querySelectorAll('[data-book]').forEach(button=>button.disabled=false);}}
}
const photoKinds=['front','back','identity','challenge'];
const photoNames={front:'Front cover',back:'Back cover',identity:'Photo / identity page',challenge:'Book + verification code'};
async function ensureChallenge(){if(state.challenge)return;try{if(demo)state.challenge={code:String(crypto.getRandomValues(new Uint32Array(1))[0]%900000+100000)};else{await session();state.challenge=await api('media/challenge',{});}if(state.step===1)render();}catch(e){notice(e.message);}}
function evidenceReady(){return photoKinds.every(k=>state.photos[k])&&Boolean(state.video)&&state.consent;}
function renderPhoto(){
 if(demo&&!state.challenge)state.challenge={code:String(crypto.getRandomValues(new Uint32Array(1))[0]%900000+100000)};
 if(state.evidenceView==='video')renderVideo();else renderPhotoCapture();
 screen.querySelector('#screen-title').textContent='Verify your book.';
 screen.querySelector('.description').textContent='Provide four book photos and a short video. No passport or contact details are required to join.';
 const nav=document.createElement('div');nav.className='evidence-nav';nav.setAttribute('role','group');nav.setAttribute('aria-label','Verification evidence');
 nav.innerHTML=`<button type="button" data-evidence="photos" aria-pressed="${state.evidenceView==='photos'}">Book photos ${Object.keys(state.photos).length===4?'✓':''}</button><button type="button" data-evidence="video" ${!photoKinds.every(kind=>state.photos[kind])&&!state.video?'disabled':''} aria-pressed="${state.evidenceView==='video'}">Video ${state.video?'✓':''}</button>`;
 screen.querySelector('.description').after(nav);
 nav.querySelectorAll('button').forEach(button=>button.onclick=()=>{stopCamera();state.evidenceView=button.dataset.evidence;render();});
 screen.querySelector('#back')?.remove();
 if(state.evidenceView==='video'){screen.querySelector('#video-next').hidden=true;}else{screen.insertAdjacentHTML('beforeend','<button class="text-button evidence-step-back" id="evidence-back" type="button">← Back to membership</button>');screen.querySelector('#evidence-back').onclick=()=>navigate(steps.document);return;}
 screen.insertAdjacentHTML('beforeend',`<section class="evidence-submit"><div class="evidence-checks"><span>${Object.keys(state.photos).length===4?'✓':'○'} 4 book photos</span><span>${state.video?'✓':'○'} Short video</span></div><p class="retention-note"><strong>Your verification information is deleted after 60 days.</strong><br/>Book photos, video and personal information collected for verification are removed 60 days after submission. Your display name, membership status and account credentials remain to operate your account.</p><label class="checkbox"><input id="review-consent" type="checkbox" ${state.consent?'checked':''}/><span>I agree to New Tibet reviewing my book photos and video under this 60-day policy.</span></label><div class="actions"><button class="secondary" id="evidence-back" type="button">Back</button><button class="primary" id="next" type="button" ${evidenceReady()?'':'disabled'}>Submit application</button></div></section>`);
 screen.querySelector('#evidence-back').onclick=()=>navigate(steps.document);
 screen.querySelector('#review-consent').onchange=event=>{state.consent=event.target.checked;screen.querySelector('#next').disabled=!evidenceReady();};
 screen.querySelector('#next').onclick=submit;
}
function renderPhotoCapture(){
 const kind=state.photoKind,photo=state.photos[kind];
 screen.innerHTML=heading('Photograph your book.','Take four clear photos of your '+bookLabel()+'.')+`<div class="photo-tabs" role="group" aria-label="Required book photos">${photoKinds.map(k=>`<button class="secondary ${kind===k?'active':''}" data-photo="${k}" aria-pressed="${kind===k}">${state.photos[k]?'✓ ':''}${({front:'Front',back:'Back',identity:'Photo page',challenge:'Code'})[k]}</button>`).join('')}</div><h3>${photoNames[kind]}</h3>${kind==='challenge'?`<div class="challenge-card"><small>${demo&&state.demoSampleApplicant&&state.challenge?.code===sampleApplicant.challengeCode?"SAMPLE VERIFICATION CODE":"YOUR RANDOM VERIFICATION CODE"}</small><strong>${state.challenge?esc(state.challenge.code):'Preparing…'}</strong><p>Write this code on paper. Photograph it beside your open book, with both clearly readable.</p></div>`:`<p class="description">${kind==='identity'?'Open the page showing your photograph, name, and book number.':'Photograph the '+(kind==='front'?'front':'back')+' cover, including all four corners.'}</p>`}<div class="capture" id="capture">${photo?`<img src="${photo}" alt="${photoNames[kind]}"/>`:`<div class="empty">${svg('camera')}<p>Keep the whole page in view.</p></div>`}</div><div class="capture-label">${Object.keys(state.photos).length} of 4 required photos ready${demo&&state.demoSampleApplicant?'<br/>Sample applicant: Tenzin Dolma · Fictional':''}</div><div class="capture-actions"><button class="${photo?'secondary':'primary'}" id="camera">${svg('camera')} ${photo?'Retake photo':'Turn on camera'}</button><button class="text-button" id="upload">Choose a photo instead</button></div><input type="file" id="file" accept="image/jpeg,image/png,image/webp" hidden/><div class="actions navigation"><button class="secondary" id="back">Back</button><button class="primary" id="use-photo" ${!photo?'hidden':''}>${photoKinds.every(k=>state.photos[k])?'Continue to video →':'Next photo →'}</button></div>`;
 screen.querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>{stopCamera();state.photoKind=b.dataset.photo;render();});
 document.querySelector('#back').onclick=()=>navigate(0);document.querySelector('#camera').onclick=startCamera;document.querySelector('#upload').onclick=()=>document.querySelector('#file').click();document.querySelector('#file').onchange=e=>loadPhoto(e.target.files[0]);document.querySelector('#use-photo').onclick=()=>{if(!state.photos[kind])return;if(photoKinds.every(k=>state.photos[k]))return navigate(2);state.photoKind=photoKinds.find(k=>!state.photos[k]);render();};ensureChallenge();
}
async function startCamera(){notice();stopCamera();try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera access needs HTTPS and a supported browser. You can choose a photo instead.');stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1600}},audio:false});document.querySelector('#capture').innerHTML='<video autoplay playsinline muted aria-label="Live camera preview"></video><div class="camera-guide"></div>';const video=screen.querySelector('video');video.srcObject=stream;await video.play();const button=document.querySelector('#camera');button.innerHTML='Take photo';button.onclick=()=>{if(!video.videoWidth)return notice('Wait for the camera to finish starting.');const canvas=document.createElement('canvas');const scale=Math.min(1,1600/video.videoWidth);canvas.width=video.videoWidth*scale;canvas.height=video.videoHeight*scale;canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);state.photos[state.photoKind]=canvas.toDataURL('image/jpeg',.85);stopCamera();render();};}catch(e){notice(e.name==='NotAllowedError'?'Camera permission was denied. Allow the camera in your browser settings, or choose a photo.':e.name==='NotFoundError'?'No camera was found. You can choose an existing photo.':e.message);}}
async function loadPhoto(file){if(!file)return;if(file.size>8*1024*1024)return notice('Choose a photo smaller than 8 MB.');if(!['image/jpeg','image/png','image/webp'].includes(file.type))return notice('Choose a JPEG, PNG, or WebP image.');stopCamera();const url=URL.createObjectURL(file),kind=state.photoKind,book=state.book;try{const img=await loadImage(url);const scale=Math.min(1,1600/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=img.width*scale;c.height=img.height*scale;c.getContext('2d').drawImage(img,0,0,c.width,c.height);const photo=c.toDataURL('image/jpeg',.85);if(photo.length>4*1024*1024)throw new Error('This photo is too large. Try a smaller image.');if(state.step!==1||state.book!==book)return;state.photos[kind]=photo;notice();render();}catch(e){notice(e.message||'This photo could not be opened. Please try another image.');}finally{URL.revokeObjectURL(url);}}
function setVideo(blob){if(state.videoURL)URL.revokeObjectURL(state.videoURL);state.video=blob;state.videoURL=URL.createObjectURL(blob);state.demoVideo=false;}
function renderVideo(){screen.innerHTML=heading('Video verification.','Hold your book and code, keep your face visible, and read this aloud.')+`<div class="challenge-card"><small>YOUR VIDEO MESSAGE</small><p>“I am applying for New Tibet. My verification code is <strong class="inline-code">${esc(state.challenge?.code||'')}</strong>.”</p></div><div class="capture" id="capture">${state.video?`<video controls playsinline src="${state.videoURL}" aria-label="Your recorded video">${state.demoVideo?`<track kind="captions" src="${new URL(`./assets/demo/sample-video-${state.book}.vtt`,import.meta.url).href}" srclang="en" label="English" default/>`:""}</video>`:`<div class="empty">${svg('camera')}<strong>Camera + microphone</strong><p>Good light, a quiet place, and your book ready.</p></div>`}</div><p class="capture-label" id="recording-status">${state.video?(state.demoVideo?'Narrated fictional sample · Example code 534216':'Watch your video before continuing.'):'Your browser will ask for camera and microphone permission.'}</p><div class="capture-actions"><button class="${state.video?'secondary':'primary'}" id="record">${state.video?'Record again':'Record video'}</button><button class="text-button" id="video-upload">Choose a video instead</button></div><input type="file" id="video-file" accept="video/webm,video/mp4,video/quicktime" hidden/><p class="under-button">WebM or MP4 · 5–30 seconds · Maximum 20 MB</p><div class="actions navigation"><button class="secondary" id="back">Back</button><button class="primary" id="video-next" ${!state.video?'hidden':''}>Continue →</button></div>`;document.querySelector('#back').onclick=()=>navigate(1);document.querySelector('#record').onclick=startVideo;document.querySelector('#video-next').onclick=()=>navigate(steps.photos);document.querySelector('#video-upload').onclick=()=>document.querySelector('#video-file').click();document.querySelector('#video-file').onchange=e=>loadVideo(e.target.files[0]);}
async function loadVideo(file){if(!file)return;try{if(file.size>20*1024*1024)throw new Error('Choose a video smaller than 20 MB.');if(!['video/webm','video/mp4','video/quicktime'].includes(file.type))throw new Error('Choose a WebM or MP4 video.');const url=URL.createObjectURL(file);const v=document.createElement('video');try{v.src=url;await new Promise((r,j)=>{v.onloadedmetadata=r;v.onerror=()=>j(new Error('This video could not be opened.'));});if(!Number.isFinite(v.duration)||v.duration<5||v.duration>30.5)throw new Error('Choose a video lasting 5–30 seconds.');}finally{URL.revokeObjectURL(url);}if(state.step!==steps.photos||state.evidenceView!=='video')return false;setVideo(file);render();notice();return true;}catch(e){notice(e.message);return false;}}

async function startVideo(){stopCamera();notice();try{if(!window.MediaRecorder||!navigator.mediaDevices?.getUserMedia)throw new Error('Recording is unavailable in this browser. Record a video on your phone and choose that file.');stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:true});const capture=document.querySelector('#capture');capture.innerHTML='<video autoplay playsinline muted aria-label="Video recording preview"></video>';const preview=capture.querySelector('video');preview.srcObject=stream;await preview.play();const mime=['video/webm;codecs=vp8,opus','video/webm','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t));if(!mime)throw new Error('This browser cannot record WebM or MP4. Choose a video file instead.');const chunks=[];let bytes=0,tooLarge=false;const started=Date.now();const activeRecorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:1200000});recorder=activeRecorder;activeRecorder.ondataavailable=e=>{bytes+=e.data.size;if(bytes>20*1024*1024){tooLarge=true;if(activeRecorder.state==='recording')activeRecorder.stop();}else chunks.push(e.data);};activeRecorder.onstop=()=>{clearInterval(recordingTimer);stream?.getTracks().forEach(t=>t.stop());stream=null;recorder=null;if(state.step!==steps.photos||state.evidenceView!=='video')return;if(tooLarge){render();return notice('The video exceeded 20 MB. Try again.');}if(Date.now()-started<5000){render();return notice('Record at least 5 seconds so the reviewer can hear your message.');}setVideo(new Blob(chunks,{type:mime.split(';')[0]}));render();};activeRecorder.start(500);const button=document.querySelector('#record');button.textContent='Stop recording';button.disabled=true;button.onclick=()=>activeRecorder.stop();document.querySelector('#video-next').disabled=true;document.querySelector('#video-upload').disabled=true;recordingTimer=setInterval(()=>{const seconds=Math.floor((Date.now()-started)/1000);document.querySelector('#recording-status').textContent=`Recording · ${seconds} / 30 seconds`;button.disabled=seconds<5;if(seconds>=30&&activeRecorder.state==='recording')activeRecorder.stop();},250);}catch(e){stopCamera();render();notice(e.name==='NotAllowedError'?'Allow both camera and microphone access in your browser, or choose a video.':e.message);}}
function renderPassport(){
 const verified=state.passport?.verified||state.demoPassportTier;
 screen.innerHTML=heading('Optional passport upgrade.','Add an NFC passport check for a higher verification tier and another 100 $TIBET.')+passportDiagram()+`
 <div class="privacy-note">${svg('shield')}<div><strong>Passport details stay on your phone.</strong><p>No passport scan, name, number, date of birth, or face image is sent to New Tibet. We receive only cryptographic proofs and a private identifier for duplicate-passport checks.</p></div></div>
 <p class="retention-note">No biometric passport? You can still join with a book or a member’s invitation. NFC support for Tibetan Identity Certificates is not confirmed; check for a chip symbol and supported document before trying.</p><details class="details"><summary>How it works</summary><p>Open ZKPassport on an NFC-enabled phone. Scan your passport’s photo page, hold the phone against its chip, and complete the face check. Your phone generates a proof that you are 18 or older without sharing your date of birth.</p><p>New Tibet verifies the proof and checks whether the same passport has already been registered. Your book photos and contact details are collected separately for application review.</p></details>
 ${verified?`<span class="tag">✓ ${demo?'NFC tier preview · Not a verified proof':'Passport proof verified'}</span>`:''}
 ${state.passportRequest?`<div class="passport-qr"><img src="${state.passportRequest.qr}" alt="Scan to open ZKPassport" width="256" height="256"/><p id="passport-progress" role="status">Open the link on your phone or scan this code with ZKPassport.</p><a class="primary" href="${esc(state.passportRequest.url)}" target="_blank" rel="noopener">Open ZKPassport ↗</a></div>`:''}
 ${!verified?`<div class="actions"><button class="primary" id="start-passport">${state.passportRequest?'Start a new passport check':'Verify with ZKPassport'}</button></div>`:''}
 ${demo&&!verified?'<button class="secondary" id="demo-passport-upgrade" type="button">Simulate NFC upgrade · +100 $TIBET</button><p class="under-button">Simulation only. No cryptographic proof is verified.</p>':''}
 <div class="actions"><button class="secondary" id="back">Back</button><button class="${verified?'primary':'secondary'}" id="passport-next">${verified?'Continue to contacts':'Skip for now'}</button></div>`;
 document.querySelector('#back').onclick=()=>navigate(steps.security);
 if(!verified)document.querySelector('#start-passport').onclick=startPassport;
 document.querySelector('#passport-next').onclick=()=>{if(busy)return;setSetupSkipped('passport',!verified);navigate(steps.contacts);};
 document.querySelector('#demo-passport-upgrade')?.addEventListener('click',()=>{if(!demo||!state.reference)return;state.demoPassportTier=true;state.passportTierAt=new Date().toISOString();persistInbox();render();notice(state.status==='accepted'?'Another 100 $TIBET credited in the demo. No real passport proof or token transfer occurred.':'NFC preview completed. The extra 100 $TIBET will be credited after membership approval.');celebrateStage('passport',()=>{setSetupSkipped('passport',false);navigate(steps.contacts);});});
}
async function startPassport(){if(busy)return;busy=true;notice();const generation=++passportGeneration;const button=document.querySelector('#start-passport');button.disabled=true;button.textContent='Preparing secure request…';try{const {ZKPassport,NullifierType,qr}=await import('./passport-sdk.js');let challenge;if(demo)challenge={nonce:crypto.randomUUID(),domain:location.hostname,scope:'new-tibet-identity-v1'};else{await session();challenge=await api('passport/challenge',{});}if(generation!==passportGeneration||state.step!==steps.passport)return;passportClient?.clearAllRequests();passportClient=new ZKPassport(challenge.domain);const builder=await passportClient.request({name:'New Tibet Identity',logo:new URL('./assets/new-tibet-symbol.svg',import.meta.url).href,purpose:'Prove age 18+ and prevent duplicate passport registration. No passport details are disclosed.',scope:challenge.scope,devMode:false,validity:3600,uniqueIdentifierType:NullifierType.NON_SALTED});const request=builder.gte('age',18).bind('custom_data',challenge.nonce).facematch('strict').done();const image=await qr(request.url);if(generation!==passportGeneration||state.step!==steps.passport){passportClient.clearAllRequests();return;}state.passportRequest={url:request.url,qr:image};render();const progress=text=>{if(generation===passportGeneration&&state.step===steps.passport){const p=document.querySelector('#passport-progress');if(p)p.textContent=text;}};request.onRequestReceived(()=>progress('Request opened. Follow the instructions on your phone.'));request.onGeneratingProof(()=>progress('Generating your private proofs on your phone…'));request.onReject(()=>progress('You declined the request. Start a new check when ready.'));request.onError(()=>progress('The passport check could not complete. Start a new check and try again.'));request.onSuccess(async({proofs,result})=>{if(generation!==passportGeneration||state.step!==steps.passport)return false;if(demo){progress('Proofs received. This preview has no backend to verify them; your passport is still unverified. Nothing has been stored.');return false;}try{progress('Checking cryptographic proofs and duplicate-passport protection…');await api('passport/verify',{proofs,result});if(generation!==passportGeneration||state.step!==steps.passport)return false;state.passport={verified:true};render();notice('Your age and passport proofs were verified.');celebrateStage('passport',()=>{setSetupSkipped('passport',false);navigate(steps.contacts);});return true;}catch(e){progress(e.message);return false;}});}catch(e){notice('Unable to start ZKPassport. '+e.message);}finally{busy=false;if(state.step===steps.passport)document.querySelector('#start-passport')?.removeAttribute('disabled');}}
const countryOptions={DE:'Germany',IN:'India',NP:'Nepal',BT:'Bhutan',GB:'United Kingdom',US:'United States',CA:'Canada',AU:'Australia',FR:'France',CH:'Switzerland',AT:'Austria',IT:'Italy',SE:'Sweden',ZZ:'Other'};
function renderContacts(){
 screen.innerHTML=heading('Contact details (optional).',`Verify an email address or phone number to earn ${onboardingRewards.contacts} free $TIBET. You can still skip this step and receive updates in Announcements.`)+`<div class="privacy-note">${svg('shield')}<div><strong>Updates are already available in the app.</strong><p>Your application updates and important New Tibet announcements arrive in Announcements. You can leave both contact fields blank.</p></div></div>${contactField('email','Email address · Optional','email','you@example.com','Add an email only if you want to verify it.')}${contactField('whatsapp','WhatsApp number · Optional','tel','+91 98765 43210','Add a number only if you also want WhatsApp application updates.')}${state.countryStatsCounted?'<p class="section-note">You have already contributed to the country-level totals. No country is stored on your profile.</p>':`<label class="field"><span>Country of residence · Optional</span><select id="signup-country"><option value="">Prefer not to say</option>${Object.entries(countryOptions).map(([code,label])=>`<option value="${code}" ${state.country===code?'selected':''}>${label}</option>`).join('')}</select><small>Contribute to country-level totals. Your country is not saved on your profile, and counts below 10 are not shown publicly. Passport nationality is not used to infer where you live.</small></label><label class="checkbox"><input id="country-consent" type="checkbox" ${state.countryConsent?'checked':''}/><span>I agree to contributing my selected country to these totals.</span></label>`}<button class="text-button" id="omit-details" type="button">Leave contact details blank</button><p class="section-note">By requesting a code, you agree to receive verification messages. A verified WhatsApp number also receives application updates.</p><div class="actions"><button class="secondary" id="back">Back</button><button class="primary" id="next" ${!contactsReady()?'disabled':''}>Finish setup ${svg('arrow')}</button></div>`;
 document.querySelector('#signup-country')?.addEventListener('change',event=>{state.country=event.target.value;});document.querySelector('#country-consent')?.addEventListener('change',event=>{state.countryConsent=event.target.checked;});
 document.querySelector('#omit-details').onclick=()=>{state.email='';state.whatsapp='';state.country='';state.countryConsent=false;state.verified={};state.codes={};render();notice('Contact details left blank. Your display name is kept and updates will arrive in the app.');};
 for(const factor of ['email','whatsapp']){
  document.querySelector('#'+factor).oninput=event=>{state[factor]=event.target.value;if(state.verified[factor]!==normalize(factor,state[factor])){delete state.verified[factor];document.querySelector('#verified-'+factor)?.remove();document.querySelector('#send-'+factor)?.removeAttribute('disabled');}updateNext();};
  document.querySelector('#send-'+factor).onclick=()=>sendCode(factor);document.querySelector('#verify-'+factor)?.addEventListener('click',()=>verifyCode(factor));
 }
 document.querySelector('#back').onclick=()=>navigate(steps.passport);document.querySelector('#next').onclick=()=>{if(contactsReady())submit();};
}
async function saveContacts(){
 if(busy||!contactsReady())return;busy=true;notice();
 try{if(!demo)await api('account/contacts',{email:normalize('email',state.email),whatsapp:normalize('whatsapp',state.whatsapp),country:state.countryConsent?state.country:'',countryConsent:state.countryConsent});if(state.countryConsent&&state.country){state.countryStatsCounted=true;state.country='';state.countryConsent=false;}setSetupSkipped('contacts',!contactsComplete(state));state.appTab='profile';celebrateStage('contacts',()=>{navigate(steps.account);notice(demo?'Contact preferences updated in this demo.':'Contact preferences saved.');});}catch(error){notice(error.message);}finally{busy=false;}
}
function contactField(f,label,type,placeholder,hint){const ok=Boolean(state[f].trim())&&state.verified[f]===normalize(f,state[f]);return `<label class="field"><span>${label}</span><input id="${f}" type="${type}" autocomplete="${type==='tel'?'tel':'email'}" value="${esc(state[f])}" placeholder="${placeholder}" maxlength="254"/><small>${hint}</small></label><div class="verification-row"><button class="secondary" id="send-${f}" ${ok?'disabled':''}>${state.codes[f]?'Resend code':'Send code'}</button>${ok?`<span class="tag" id="verified-${f}">✓ Verified</span>`:state.codes[f]?`<input id="code-${f}" inputmode="numeric" autocomplete="one-time-code" maxlength="6" aria-label="${label} verification code" placeholder="000000"/><button class="secondary" id="verify-${f}">Verify</button>${demo?`<small>Test code: <strong>${state.codes[f].code}</strong></small>`:''}`:''}</div>`;}
const normalize=(f,v)=>f==='email'?v.trim().toLowerCase():v.replace(/[\s()-]/g,'');
function nameReady(){const length=state.name.trim().length;return length>0&&length<=100;}
function documentReady(){return nameReady()&&(state.book!=='vouched'||Boolean(state.inviteCode?.trim()));}
function contactsReady(){return ['email','whatsapp'].every(f=>!state[f].trim()||state.verified[f]===normalize(f,state[f]));}
function updateNext(){document.querySelector('#next').disabled=!contactsReady();}
async function sendCode(f){if(busy)return;const value=normalize(f,state[f]);if(f==='email'?!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value):!/^\+[1-9]\d{7,14}$/.test(value))return notice(f==='email'?'Enter a valid email address.':'Enter your WhatsApp number with a country code, for example +919876543210.');busy=true;const button=document.querySelector('#send-'+f);button.disabled=true;button.textContent='Sending…';try{if(demo){const code=String(crypto.getRandomValues(new Uint32Array(1))[0]%900000+100000);state.codes[f]={code,value,expires:Date.now()+600000,attempts:0};}else{await session();await api('otp/send',{factor:f,value,consent:true});state.codes[f]={value};}render();notice(demo?'A test code is shown below the field. No message was sent.':'Your verification code has been sent. It expires in 10 minutes.');}catch(e){notice(e.message);button.disabled=false;button.textContent='Send code';}finally{busy=false;}}
async function verifyCode(f){if(busy)return;const code=document.querySelector('#code-'+f).value;if(!/^\d{6}$/.test(code))return notice('Enter the 6-digit code.');busy=true;try{const value=normalize(f,state[f]);if(demo){const challenge=state.codes[f];challenge.attempts++;if(challenge.attempts>5||Date.now()>challenge.expires)throw new Error('This code expired. Request a new code.');if(challenge.value!==value||challenge.code!==code)throw new Error('That code does not match. Please try again.');}else await api('otp/verify',{factor:f,value,code});state.verified[f]=value;render();notice();}catch(e){notice(e.message);}finally{busy=false;}}
function renderSecurity(){
 const ready=state.wallet?.ready;
 if(state.walletMethod==='recovery-phrase'&&state.wallet?.words){renderRecoveryWords();return;}
 screen.innerHTML=heading('Set up your wallet.',`Set up an Ethereum wallet for your free $TIBET after membership approval. Protect it with a passkey or confirmed 12-word backup to earn ${onboardingRewards.security} more free $TIBET.`)+walletDiagram()+`
 <div class="wallet-explanation"><h3>What is a passkey?</h3><p>A key in your device or password manager, unlocked with Face ID, a fingerprint, or PIN.</p></div>
 ${ready?`<div class="wallet-setup-ready"><span class="tag">✓ ${state.wallet.method==='passkey'?'Passkey wallet protected':'12-word backup confirmed'}</span><p class="wallet-address">${esc(state.wallet.address)}</p>${state.wallet.method==='recovery-phrase'&&!state.passkey?'<button class="secondary" id="passkey">Add an account passkey</button>':''}</div>`:`${state.passkey?'<p class="section-note">✓ Passkey added for account sign-in.</p>':''}<div class="capture-actions">${!state.passkey||demo?`<button class="primary" id="passkey">${state.passkey?'Protect wallet with passkey':'Create with a passkey'}</button>`:''}<button class="text-button" id="use-words" ${!demo?'disabled':''}>Record 12 recovery words instead</button></div>`}
 <p class="section-note">A passkey also lets you return to your application and Announcements without an email address or phone number. The 12 words restore the wallet; they do not sign you into this inbox.</p>
 <p class="under-button">Ethereum · ${demo?'Demo wallet, no funds or transfers':'Wallet activation not available yet'}</p>
 <details class="details"><summary>How passkeys help prevent lost access</summary><p>On a supported device the passkey encrypts your wallet key. Your biometrics stay on your device. A synced passkey can be recovered through your password manager, reducing reliance on handwritten words. Wallet recovery also needs its encrypted backup and depends on your passkey provider.</p><p>You can record 12 recovery words instead. Anyone with the phrase can restore the wallet; losing it can mean losing access.</p><p>The demo holds wallet material only in this page’s memory. Reloading clears it. Token access and transfers are unavailable.</p></details>
 ${!securityComplete(state)?'<button class="text-button" id="security-skip" type="button">Skip for now</button>':''}<div class="actions"><button class="secondary" id="back">Back</button><button class="primary" id="security-next" style="flex:1" ${securityComplete(state)?'':'disabled'}>Continue to passport check</button></div>`;
 document.querySelector('#back').onclick=()=>{state.appTab='profile';navigate(steps.account);};
 document.querySelector('#passkey')?.addEventListener('click',addPasskey);
 document.querySelector('#use-words')?.addEventListener('click',startRecoveryWallet);
 document.querySelector('#security-next').onclick=()=>{if(busy||!securityComplete(state))return;completeWalletSetup();};document.querySelector('#security-skip')?.addEventListener('click',()=>{if(busy)return;setSetupSkipped('security',true);navigate(steps.passport);});
}
async function startRecoveryWallet(){
 if(!demo||busy)return;
 busy=true;notice();
 const button=document.querySelector('#use-words');button.disabled=true;button.textContent='Preparing wallet…';
 try{
  const {createRecoveryWallet}=await import('./wallet-sdk.js');
  if(state.step!==steps.security)return;
  state.wallet=createRecoveryWallet();state.walletMethod='recovery-phrase';state.recoveryStage='words';render();
 }catch(error){notice(error.message);button.disabled=false;button.textContent='Record 12 recovery words instead';}
 finally{busy=false;}
}
function renderRecoveryWords(){
 const confirming=state.recoveryStage==='confirm';
 screen.innerHTML=heading(confirming?'Confirm your backup.':'Record your 12 words.',confirming?'Enter the requested words from your written backup.':'Write these words down in order and keep them private.')+`
 <p class="section-note">Demo Ethereum wallet · No funds or token transfers.</p>
 ${confirming?`<form id="confirm-recovery">${[2,6,10].map(index=>`<label class="field"><span>Word ${index+1}</span><input id="recovery-${index}" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" required/></label>`).join('')}<div class="actions"><button type="button" class="secondary" id="show-words">Back</button><button class="primary" type="submit">Confirm backup</button></div></form>`:`<ol class="recovery-words">${state.wallet.words.map((word,index)=>`<li><span>${index+1}</span><strong>${esc(word)}</strong></li>`).join('')}</ol><p class="description recovery-description">These words restore this Ethereum wallet without a passkey. Losing the backup can mean losing access; anyone with it can access the wallet.</p><div class="actions"><button class="secondary" id="use-passkey">Use a passkey</button><button class="primary" id="recorded-words">I recorded these words</button></div>`}`;
 document.querySelector('#use-passkey')?.addEventListener('click',()=>{state.wallet.words.fill('');state.wallet=null;state.walletMethod='passkey';state.recoveryStage='';render();notice();});
 document.querySelector('#recorded-words')?.addEventListener('click',()=>{state.recoveryStage='confirm';notice();render();window.scrollTo(0,0);screen.querySelector('#screen-title').focus({preventScroll:true});});
 document.querySelector('#show-words')?.addEventListener('click',()=>{state.recoveryStage='words';render();notice();});
 document.querySelector('#confirm-recovery')?.addEventListener('submit',event=>{
  event.preventDefault();
  const wrong=[2,6,10].find(index=>document.querySelector('#recovery-'+index).value.trim().toLowerCase()!==state.wallet.words[index]);
  if(wrong!==undefined){notice('Word '+(wrong+1)+' does not match your backup.');document.querySelector('#recovery-'+wrong).focus();return;}
  state.wallet.words.fill('');delete state.wallet.words;state.wallet.ready=true;state.recoveryStage='done';render();notice('Recovery backup confirmed. These words are no longer kept in this page.');window.scrollTo(0,0);completeWalletSetup();
 });
}
async function addPasskey(){
 if(busy)return;
 busy=true;const button=document.querySelector('#passkey');button.disabled=true;notice();
 try{
  if(!window.PublicKeyCredential||!window.isSecureContext)throw new Error('Passkeys need HTTPS and a supported browser. You can choose 12 recovery words in the demo instead.');
  const {createPasskeyWallet,publicCredentialExtensions}=await import('./wallet-sdk.js');
  state.walletPrfSalt||=b64(crypto.getRandomValues(new Uint8Array(32)));
  let cred,extensions;
  if(demo&&state.passkey){
   cred=await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),allowCredentials:[{type:'public-key',id:from64(state.passkey.id)}],userVerification:'required',extensions:{prf:{eval:{first:from64(state.walletPrfSalt)}}}}});
   extensions=cred?.getClientExtensionResults();
  }else{
   let options;
   if(demo)options={challenge:b64(crypto.getRandomValues(new Uint8Array(32))),rp:{name:'New Tibet'},user:{id:b64(crypto.getRandomValues(new Uint8Array(32))),name:state.email||'member-'+crypto.randomUUID().slice(0,8),displayName:state.name||'New Tibet member'},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{residentKey:'required',userVerification:'required'},attestation:'none',timeout:60000};
   else{await session();options=await api('passkey/options',{});}
   cred=await navigator.credentials.create({publicKey:{...options,challenge:from64(options.challenge),user:{...options.user,id:from64(options.user.id)},extensions:{...options.extensions,prf:{eval:{first:from64(state.walletPrfSalt)}}}}});
   if(!cred)throw new Error('Passkey creation was cancelled.');
   extensions=cred.getClientExtensionResults();
   const credential={id:cred.id,rawId:b64(cred.rawId),type:cred.type,response:{clientDataJSON:b64(cred.response.clientDataJSON),attestationObject:b64(cred.response.attestationObject),transports:cred.response.getTransports?.()||[]},clientExtensionResults:publicCredentialExtensions(extensions)};
   if(!demo)await api('passkey/verify',{credential});
   state.passkey={id:cred.id,prfSupported:Boolean(extensions.prf?.enabled)};
  }
  if(!cred)throw new Error('Passkey setup was cancelled.');
  if(state.step!==steps.security)return;
  if(demo&&!(state.wallet?.ready&&state.wallet.method==='recovery-phrase')){
   const prf=extensions?.prf?.results?.first;
   if(!prf){render();notice('Passkey added for sign-in. To protect this demo wallet, try a passkey with encryption support or choose 12 recovery words.');return;}
   const wallet=await createPasskeyWallet(prf);
   if(state.step!==steps.security||state.passkey?.id!==cred.id)return;
   state.wallet=wallet;state.walletMethod='passkey';state.wallet.credentialId=cred.id;state.wallet.prfSalt=state.walletPrfSalt;
  }
  render();notice(demo?(state.wallet?.method==='recovery-phrase'?'Account passkey added. Your wallet still uses its 12-word backup.':'Demo Ethereum wallet protected by your passkey. No funds or token transfers are enabled.'):'Your account passkey has been registered securely.');completeWalletSetup();
 }catch(error){if(state.step===steps.security){render();notice(error.name==='NotAllowedError'?'Passkey setup was cancelled or unavailable. Try again or choose 12 recovery words.':error.message);}}
 finally{busy=false;}
}
async function uploadMedia(kind,blob){const response=await fetch(config.apiBase.replace(/\/$/,'')+'/api/media/upload?kind='+encodeURIComponent(kind)+'&book='+state.book,{method:'POST',headers:{'Content-Type':blob.type,Authorization:'Bearer '+sessionToken,'X-Review-Consent':'2026-10-09'},body:blob});const data=await response.json();if(!response.ok)throw new Error(data.error||'Media upload failed. Please try again.');}
async function submit(){if(busy)return;if(state.reference)return saveContacts();if(!nameReady()||!state.consent){navigate(steps.document);return notice('Enter a display name and agree to book and video review. A pseudonym is welcome.');}if(!contactsReady())return navigate(steps.contacts);if(!photoKinds.every(k=>state.photos[k]))return navigate(1);if(!state.video)return navigate(2);busy=true;const button=document.querySelector('#next')||document.querySelector('#demo-next');button.disabled=true;button.textContent='Submitting…';try{if(demo){state.status='pending';state.reference='NT-'+crypto.randomUUID().slice(0,8).toUpperCase();state.applicationCreatedAt=new Date().toISOString();recordApplicationEvent(state,'pending');persistInbox();if(state.whatsapp)state.messages.push(`New Tibet: Your application ${state.reference} has been received and is awaiting review.`);}else{for(const kind of photoKinds){button.textContent='Uploading '+photoNames[kind].toLowerCase()+'…';const blob=await(await fetch(state.photos[kind])).blob();await uploadMedia(kind,blob);}button.textContent='Uploading video…';await uploadMedia('video',state.video);button.textContent='Submitting application…';const data=await api('applications',{name:state.name,email:normalize('email',state.email),whatsapp:normalize('whatsapp',state.whatsapp),book:state.book,consent:true,consentVersion:'2026-10-09'});state.reference=data.reference;state.status=data.status;state.notification=data.notification;}state.guest=false;clearExplorer(localStorage);state.profileSetupStep=null;state.appTab='profile';state.photos={};state.video=null;URL.revokeObjectURL(state.videoURL);state.videoURL='';celebrateStage('book',continueAfterVerification);if(!demo)refreshInbox();}catch(e){notice(e.message);button.disabled=false;button.textContent='Submit application →';}finally{busy=false;}}
function reviewPreviewControls(){
 if(!demo)return '';
 const selected=state.status;
 const messages=state.messages.filter(Boolean).map(message=>`<div class="message-preview">${esc(message)}</div>`).join('');
 return `<section class="demo-review" aria-label="Demo review controls">
  <p class="demo-review-label">Review preview</p>
  <p>Preview a decision. No application is approved and no message is sent.</p>
  <div class="actions">
   <button type="button" class="secondary" id="accept" ${selected==='accepted'?'disabled':''}>${selected==='accepted'?'Acceptance shown':'Simulate acceptance'}</button>
   <button type="button" class="secondary" id="decline" ${selected==='declined'?'disabled':''}>${selected==='declined'?'Decline shown':'Simulate decline'}</button>
  </div>
  ${state.whatsapp&&messages?`<details class="details"><summary>WhatsApp message previews</summary>${messages}</details>`:''}
 </section>`;
}
function bindReviewControls(){
 document.querySelector('#accept')?.addEventListener('click',()=>simulateReview('accepted'));
 document.querySelector('#decline')?.addEventListener('click',()=>simulateReview('declined'));
 document.querySelector('#back-review')?.addEventListener('click',()=>{
  if(!demo)return;
  state.status='pending';state.messages=state.messages.slice(0,1);navigate(6);
 });
}
function renderSuccess(){renderAcceptedAccount();}
function renderApplicationDetails(){
 const declined=state.status==='declined';
 const title=declined?'Application declined.':'Application received.';
 const description=declined
  ?(demo?'This is a decline preview. You can return to your application or preview acceptance below.':'Your application could not be approved. Contact New Tibet with your reference for help.')
  :(demo?'Your demo application is ready. Preview a review decision below.':'We’ll review your book photos and video. Your decision will appear in Announcements.');
 screen.innerHTML=`<div class="success-icon ${declined?'declined-icon':''}">${svg(declined?'info':'check')}</div>`+heading(title,description)+`
  <div class="summary">
   <div><span>Reference</span><strong>${esc(state.reference)}</strong></div>
   <div><span>Document</span><strong>${bookLabel()}</strong></div>
   <div><span>Status</span><strong>${declined?(demo?'Decline preview':'Declined'):(demo?'Awaiting demo review':'Awaiting review')}</strong></div>
  </div>
  ${declined?`<div class="actions">${demo?'<button class="primary" id="back-review">Back to review</button>':`<a class="primary" href="mailto:hello@newtibet.com?subject=${encodeURIComponent('Application '+state.reference)}">Contact support</a>`}</div>`:''}
  ${!demo&&!declined?`<div class="actions"><button id="refresh-status" class="secondary">Check application status</button></div><p class="under-button">${state.notification==='queued'?'Your registration message is queued for delivery.':state.notification==='sent'?'Your registration message has been sent to WhatsApp.':'Application updates are available in Announcements.'}</p>`:''}
  <div class="actions"><button class="secondary" id="pending-security">Set up account security</button><button class="text-button" id="pending-contacts">Optional contacts</button></div>${reviewPreviewControls()}`;
 screen.querySelector('#pending-security').onclick=()=>navigate(steps.security);screen.querySelector('#pending-contacts').onclick=()=>navigate(steps.contacts);
 if(demo){bindReviewControls();return;}
 document.querySelector('#refresh-status')?.addEventListener('click',async()=>{
  if(busy)return;
  const button=document.querySelector('#refresh-status');
  busy=true;button.disabled=true;button.textContent='Checking…';
  try{
   const data=await api('applications/status');
   state.status=data.status;
   if(state.status==='pending')notice('Your application is still awaiting review.');
   else navigate(6);
  }catch(error){notice(error.message);}
  finally{busy=false;if(button.isConnected){button.disabled=false;button.textContent='Check application status';}}
 });
}
function profileInitials(name){
 const parts=String(name).trim().split(/\s+/u).filter(Boolean);
 return (parts.length>1?[parts[0],parts.at(-1)]:parts).map(part=>Array.from(part)[0]).join('').toLocaleUpperCase()||'NT';
}
function persistInbox(){if(demo&&!showcase)try{saveDemoInbox(localStorage,state);}catch{}}
function selectAppTab(tab){if(busy)return;if(tab!=='announcements')state.lastAppTab=tab;state.appTab=tab;if(state.profileSetup){state.profileSetupStep=state.step;return navigate(steps.account);}notice();renderAcceptedAccount();window.scrollTo(0,0);screen.querySelector('#screen-title')?.focus({preventScroll:true});}
function closeAnnouncements(){selectAppTab(state.lastAppTab||'profile');document.querySelector('#announcements-button').focus({preventScroll:true});}
document.querySelector('#announcements-button').onclick=()=>{if(state.step!==steps.account&&!state.profileSetup)return;if(state.appTab==='announcements')closeAnnouncements();else selectAppTab('announcements');};
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&state.step===steps.account&&state.appTab==='announcements'&&!document.querySelector('dialog[open]')){event.preventDefault();closeAnnouncements();}});
function applyInboxData(data){
 state.inboxItems=(Array.isArray(data.items)?data.items:[]).filter(item=>['application','announcement'].includes(item.kind)&&typeof item.id==='string'&&Number.isFinite(Date.parse(item.createdAt)));
 state.inboxRead=state.inboxItems.filter(item=>item.read).map(item=>item.id);
 if(data.application){const app=data.application;state.guest=false;clearExplorer(localStorage);Object.assign(state,{reference:app.reference,status:app.status,book:app.book,name:app.name||'',email:app.email||'',whatsapp:app.whatsapp||'',applicationCreatedAt:app.createdAt,countryStatsCounted:app.countryStatsCounted===true,passport:{verified:app.passportVerified},passkey:app.passkeyId?{id:app.passkeyId}:null,verified:Object.fromEntries(['email','whatsapp'].filter(factor=>app[factor]).map(factor=>[factor,app[factor]]))});}
}
async function refreshInbox(){
 if(state.inboxLoading)return;
 if(demo){persistInbox();state.inboxError='';if(state.step===6)renderAcceptedAccount();return;}
 const previousStatus=state.status;state.inboxLoading=true;state.inboxError='';
 if(state.step===6&&state.appTab==='announcements')renderAcceptedAccount();
 try{applyInboxData(await api('notifications'));}catch(error){state.inboxError=error.message;}
 finally{state.inboxLoading=false;if(state.step===steps.account){if(previousStatus!==state.status&&state.status==='accepted')celebrateApproval(()=>{if(!securityComplete(state)&&!state.onboardingSkipped.includes('security'))continueAfterVerification();else render();});else if(state.appTab==='announcements'||state.appTab==='profile'&&state.status!==previousStatus)render();else updateInboxBadge();}}
}
function updateInboxBadge(){
 const button=document.querySelector('#announcements-button');
 const count=unreadCount(state,demo);button.querySelector('.notification-unread')?.remove();
 button.setAttribute('aria-label',count?`Announcements, ${count} unread`:'Announcements');button.setAttribute('aria-expanded',String(state.appTab==='announcements'));
 if(count){const badge=document.createElement('span');badge.className='notification-unread';badge.setAttribute('aria-hidden','true');badge.textContent=count>99?'99+':count;button.appendChild(badge);}
}
function readOpenInbox(){
 if(state.step!==6||state.appTab!=='announcements'||document.hidden)return;
 const ids=inboxItems(state,demo).filter(item=>!state.inboxRead.includes(item.id)).map(item=>item.id);
 if(!ids.length)return;
 // Clear the badge immediately; save the same read state to the member's inbox.
 state.inboxRead=[...new Set([...state.inboxRead,...ids])];persistInbox();
 if(!demo){
  const reference=state.reference;
  api('notifications/read',{ids}).catch(error=>{
   if(state.reference!==reference)return;
   state.inboxError=error.message;
   if(state.step===6&&state.appTab==='announcements')renderAcceptedAccount();
  });
 }
}
async function markInboxRead(ids){
 if(!ids.length)return;
 try{
  if(!demo)await api('notifications/read',{ids});
  state.inboxRead=[...new Set([...state.inboxRead,...ids])];state.inboxError='';persistInbox();renderAcceptedAccount();
  if(state.inboxExpanded)screen.querySelector(`[data-notification="${CSS.escape(state.inboxExpanded)}"]`)?.focus({preventScroll:true});
 }catch(error){state.inboxError=error.message;renderAcceptedAccount();}
}
async function signIn(){
 if(busy)return;
 const button=document.querySelector('#profile-sign-in')||document.querySelector('#sign-in'),status=document.querySelector('#profile-signin-status')||document.querySelector('#signin-status');status.textContent='';
 if(demo){let saved;try{saved=restoreDemoInbox(localStorage);}catch{}if(!saved){status.textContent='No saved demo application on this browser yet.';return;}Object.assign(state,saved,{step:6,guest:false,appTab:'announcements'});clearExplorer(localStorage);navigate(6);return;}
 busy=true;button.disabled=true;
 try{
  if(!window.PublicKeyCredential||!window.isSecureContext)throw new Error('Passkey sign-in needs HTTPS and a supported browser.');
  await session();const options=await api('auth/options',{});
  const cred=await navigator.credentials.get({publicKey:{...options,challenge:from64(options.challenge),allowCredentials:(options.allowCredentials||[]).map(item=>({...item,id:from64(item.id)}))}});
  if(!cred)throw new Error('Sign-in was cancelled.');
  const credential={id:cred.id,rawId:b64(cred.rawId),type:cred.type,response:{clientDataJSON:b64(cred.response.clientDataJSON),authenticatorData:b64(cred.response.authenticatorData),signature:b64(cred.response.signature),userHandle:cred.response.userHandle?b64(cred.response.userHandle):null},clientExtensionResults:{}};
  const data=await api('auth/verify',{credential});applyInboxData({items:[],application:data.application});state.appTab='announcements';navigate(6);await refreshInbox();
 }catch(error){status.textContent=error.name==='NotAllowedError'?'Sign-in was cancelled or no matching passkey was available.':error.message;}
 finally{busy=false;button.disabled=false;}
}
async function resumeLiveSession(){
 if(demo||invitationCode)return;
 try{sessionToken=sessionStorage.getItem('new-tibet-session-v1')||'';}catch{}
 if(!sessionToken)return;
 try{const data=await api('notifications');if(data.application){applyInboxData(data);state.appTab='announcements';navigate(6);}}
 catch{sessionToken='';try{sessionStorage.removeItem('new-tibet-session-v1');}catch{}document.querySelector('#signin-status').textContent='Sign in with your passkey to return to your application.';}
}
function renderAcceptedAccount(){
 if(state.appTab==='profile'&&!state.reference&&!state.profileSetup){
  state.profileSetup=true;state.step=state.profileSetupStep===steps.photos&&nameReady()&&state.book!=='vouched'?steps.photos:steps.document;
  renderDemoFooter();
 }
 if(demo){
  const completed=rememberDemoOnboardingStages(state);
  if(!Array.isArray(state.walletRewardReadIds))state.walletRewardReadIds=state.walletRewardRead?[state.reference+':verification-reward',state.reference+':passport-reward']:[];
  const previous=state.walletDemo||initialDemoBalances();state.walletDemo=applyDemoOnboardingRewards(previous,state);
  if(completed||state.walletDemo!==previous)persistInbox();
  if(state.appTab==='wallet'&&!document.hidden&&walletRewardUnread(state)){
   state.walletRewardRead=true;state.walletRewardReadIds=state.walletDemo.transactions.filter(tx=>['reward','passport-reward','onboarding-reward'].includes(tx.type)).map(tx=>tx.id);persistInbox();
  }
 }
 readOpenInbox();
 if(state.appTab==='profile'&&state.profileSetup)showProfileSetup();
 else if(state.appTab==='announcements'&&state.reference)renderAnnouncements(screen,state,demo,{refresh:refreshInbox,markRead:markInboxRead,close:closeAnnouncements});
 else if(!hasMemberAccess(state)&&['wallet','chat','announcements'].includes(state.appTab))renderRestricted(screen,state,()=>selectAppTab('profile'),closeAnnouncements);
 else if(state.appTab==='petitions')renderPetitions(screen,state,demo,notice,renderAcceptedAccount);
 else if(state.appTab==='chat')renderChat(screen,state,demo,renderAcceptedAccount);
 else if(state.appTab==='wallet')renderWallet(screen,state,demo,notice,renderAcceptedAccount);
 else if(state.appTab==='ecosystem')renderEcosystem(screen,state,demo,renderAcceptedAccount,notice);
 else if(hasMemberAccess(state))renderProfile();else renderUnverifiedProfile();
 document.body.dataset.appTab=state.appTab;
 const panel=document.createElement('section');panel.id='account-panel';panel.setAttribute('role',state.appTab==='announcements'?'region':'tabpanel');panel.setAttribute('aria-labelledby',state.appTab==='announcements'?'screen-title':'tab-'+state.appTab);
 while(screen.firstChild)panel.appendChild(screen.firstChild);
 screen.appendChild(panel);screen.insertAdjacentHTML('beforeend',renderAccountTabs(state.appTab,demo?walletRewardUnread(state):0));
 updateInboxBadge();
 const tabs=[...screen.querySelectorAll('[data-app-tab]')];
 screen.querySelector('.app-tabs').setAttribute('aria-orientation',accountLayout.matches?'vertical':'horizontal');
 const select=selectAppTab;
 tabs.forEach((button,index)=>{
  button.onclick=()=>select(button.dataset.appTab);
  button.onkeydown=event=>{
   let next;
   if(event.key==='ArrowRight'||event.key==='ArrowDown')next=(index+1)%tabs.length;
   if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=(index+tabs.length-1)%tabs.length;
   if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;
   if(next!==undefined){event.preventDefault();const tab=tabs[next].dataset.appTab;select(tab);screen.querySelector('#tab-'+tab).focus();}
  };
 });
}
function bindProfileLadder(){
 screen.querySelectorAll('[data-profile-setup]').forEach(button=>button.onclick=()=>{
  const action=button.dataset.profileSetup;
  if(action==='invitation'){if(busy||state.reference)return;selectMembershipRoute('vouched');startProfileSetup(steps.document);document.querySelector('#invite-code')?.focus();return;}
  if(action==='status')return checkProfileStatus();
  const next={join:state.profileSetupStep===steps.photos?steps.photos:steps.document,evidence:steps.photos,passport:steps.passport,security:steps.security,contacts:steps.contacts}[action];
  if(next!==undefined)startProfileSetup(next);
 });
}
async function checkProfileStatus(){
 if(state.status==='declined'&&!demo){location.href='mailto:hello@newtibet.com?subject='+encodeURIComponent('Application '+state.reference);return;}
 if(demo)return notice('Use the review preview below to simulate acceptance or decline. A submitted application does not unlock member content until accepted.');
 if(busy)return;busy=true;try{await refreshInbox();notice(state.status==='pending'?'Your application is still awaiting review.':'Your verification status has been updated.');}finally{busy=false;}
}
function renderUnverifiedProfile(){
 const declined=state.status==='declined';
 screen.innerHTML=heading(declined?'Application update.':'Application submitted.',declined?'Contact New Tibet for help with your application.':'Your book photos and video are awaiting review. You can continue with optional setup below.')+`<div class="profile-membership-state"><span>${declined?'Verification declined':'Awaiting verification'}</span><strong>${esc(state.name||'Your application')}</strong><p>Application ${esc(state.reference)}</p></div>${declined?`<a class="text-button" href="mailto:hello@newtibet.com?subject=${encodeURIComponent('Application '+state.reference)}">Contact New Tibet</a>`:''}${rewardLadder({...state,demoMode:demo})}${reviewPreviewControls()}`;
 bindProfileLadder();bindReviewControls();
}
function renderProfile(){
 const name=state.name.trim()||'Member '+state.reference.slice(-6);
 const portrait=demo&&state.demoSampleApplicant&&name===sampleApplicant.name;
 const providedContacts=['email','whatsapp'].filter(factor=>state[factor].trim());
 const contactsVerified=providedContacts.length>0&&providedContacts.every(factor=>state.verified[factor]===normalize(factor,state[factor]));
 const passportText=state.demoPassportTier?'Enhanced tier · Demo preview':state.passport?.verified?'Verified · 18+':demo&&state.demoSkipped.passport?'Skipped in demo':demo?'Not verified in this demo':'Not verified';
 screen.innerHTML=`<div class="profile-status">${svg('check')}<span>${demo?'Acceptance preview':'Application accepted'}</span></div>`+
 heading('Identity profile.',state.book==='vouched'?'You joined through a member’s invitation.':demo?'Example of an accepted New Tibet application.':'Your application has been approved.')+rewardLadder({...state,demoMode:demo})+`${canInvite(state)?'<button class="secondary profile-invite" id="profile-invite" type="button" aria-haspopup="dialog">Invite</button>':''}
 <article class="identity-card" aria-label="New Tibet digital identity profile">
  <div class="identity-card-top">
   <img src="${new URL('./assets/new-tibet-logo-blue.svg',import.meta.url).href}" width="152" height="64" alt="New Tibet"/>
   <span class="identity-card-kind">${demo?'Demo profile':'Digital identity'}</span>
  </div>
  <div class="identity-card-holder">
   <div class="identity-portrait" ${portrait?'':`role="img" aria-label="Profile initials ${esc(profileInitials(name))}"`}>${portrait?`<img src="${sampleApplicant.portrait}" alt="Fictional demo applicant Tenzin Dolma"/>`:esc(profileInitials(name))}</div>
   <div class="identity-holder-name"><p class="identity-label">${state.name.trim()?"Display name":"Member name"}</p><h3>${esc(name)}</h3><p class="identity-holder-type">${membershipLabel(state.book)}</p></div>
  </div>
  <div class="identity-card-details"><dl class="identity-fields">
   <div class="identity-reference"><dt>Profile reference</dt><dd>${esc(state.reference)}</dd></div>
   <div><dt>${state.book==='vouched'?'Membership basis':'Document'}</dt><dd>${bookLabel()}</dd></div>
   <div><dt>Status</dt><dd>${demo?'Accepted · preview':'Accepted'}</dd></div>
  </dl><button class="identity-qr" id="identity-qr" type="button" aria-label="Show membership QR code" disabled><span>Preparing QR…</span></button></div>
  <div class="identity-card-bottom"><span>NEW TIBET IDENTITY</span><span>${demo?'PREVIEW ONLY':'DIGITAL PROFILE'}</span></div>
 </article>
 ${demo?'<p class="identity-preview-note">Demo profile · No identity document has been issued.</p>':''}
 ${cardControls(demo)}
 <section class="profile-details" aria-labelledby="profile-details-title">
  <h3 id="profile-details-title">Profile details</h3>
  <dl>
   <div><dt>Email</dt><dd>${esc(state.email||'Not provided')}</dd></div>
   <div><dt>WhatsApp</dt><dd>${esc(state.whatsapp||'Not provided')}</dd></div>
   <div><dt>Contact verification</dt><dd>${providedContacts.length===0?'Not provided · In-app updates':contactsVerified?(demo?'Verified in demo':'Verified'):'Not verified'}</dd></div>
   <div><dt>Passport check</dt><dd>${esc(passportText)}</dd></div>
   <div><dt>Account security</dt><dd>${state.passkey?(demo?'Demo passkey':'Passkey'):state.demoOnboardingStages?.security?'Completed in demo · Reconnect wallet':contactsVerified?'Verified optional contact':'Not set up'}</dd></div>
  </dl>
 </section>
 <p class="retention-note">Verification information is deleted 60 days after submission. Account details used to provide membership and sign-in remain until your account is deleted.</p>${reviewPreviewControls()}`;
 bindReviewControls();
 bindProfileLadder();
 screen.querySelector('#profile-invite')?.addEventListener('click',openInvite);
 mountProfileCard({root:screen,state,demo,api,config});
}
async function openInvite(){
 if(!canInvite(state)||showcase)return;
 const opener=screen.querySelector('#profile-invite'),dialog=document.createElement('dialog');dialog.className='invite-dialog';dialog.setAttribute('aria-labelledby','invite-title');
 dialog.innerHTML='<button class="dialog-close" aria-label="Close invitation">×</button><h2 id="invite-title">Invite someone.</h2><p>Vouch for someone who doesn’t have a Green or Blue Book.</p><div id="invite-content"><p role="status">Preparing your invitation…</p></div>';
 document.body.appendChild(dialog);dialog.querySelector('.dialog-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{dialog.remove();if(opener.isConnected)opener.focus();});dialog.showModal();
 async function prepareInvitation(){
 dialog.querySelector('#invite-content').innerHTML='<p role="status">Preparing your invitation…</p>';
 try{
  if(!state.invitation||state.invitation.ownerReference!==state.reference||state.invitation.expiresAt&&Date.parse(state.invitation.expiresAt)<=Date.now()){
   const ownerReference=state.reference,issued=demo?await createDemoInvite(state):await api('invites',{});
   if(ownerReference!==state.reference)throw new Error('Membership changed. Open Invite again to create a new invitation.');
   state.invitation={...issued,ownerReference};
  }
  if(!dialog.isConnected)return;
  const message=invitationMessage(state.invitation,location.href,demo);
  dialog.querySelector('#invite-content').innerHTML=`<p class="invite-code-display">${esc(state.invitation.code)}</p><label class="field"><span>Message to share</span><textarea id="invite-message" rows="8" readonly>${esc(message)}</textarea></label><p>${demo?'Demo invitation · This previews vouching. Codes are not authenticated on this demo website.':'This code can be used once within seven days.'}</p><button class="primary" id="copy-invitation" type="button">Copy invitation</button><button class="text-button" id="new-invitation" type="button">Generate a new code</button><p id="invite-copy-status" role="status"></p>`;
  dialog.querySelector('#new-invitation').onclick=()=>{state.invitation=null;prepareInvitation();};
  dialog.querySelector('#copy-invitation').onclick=async()=>{const status=dialog.querySelector('#invite-copy-status');try{await navigator.clipboard.writeText(message);status.textContent='Copied. Paste it into WhatsApp, an email or a message.';}catch{const text=dialog.querySelector('#invite-message');text.focus();text.select();status.textContent='Select and copy the message, then paste it into WhatsApp or an email.';}};
 }catch(error){if(dialog.isConnected)dialog.querySelector('#invite-content').textContent=error.message;}
 }
 await prepareInvitation();
}
function simulateReview(status){
 if(!demo||state.step!==6||!state.reference||!['accepted','declined'].includes(status))return;
 state.status=status;
 state.appTab='profile';recordApplicationEvent(state,status);persistInbox();
 const registration=state.messages[0]||`New Tibet: We received demo application ${state.reference}.`;
 const decision=`New Tibet: Your application ${state.reference} has been ${status}. ${status==='accepted'?'Your identity profile is ready.':'Please contact hello@newtibet.com for support.'}`;
 state.messages=[registration,decision];
 if(status==='accepted')celebrateApproval(continueAfterVerification);else navigate(steps.account);
}
document.querySelector('#explore-now').onclick=()=>explore();
document.querySelector('#sign-in').onclick=signIn;
document.querySelector('#demo-next').onclick=demoNext;
document.addEventListener('click',event=>{
 if(!demo||showcase||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 if(event.target.closest?.('[data-demo-home]')){event.preventDefault();restartDemo();}
});
// Demo-only entry points let the profile and review states be inspected without new media captures.
const preview=new URLSearchParams(location.search).get('preview');
let savedInbox=null;if(demo&&!preview&&!showcase&&!invitationCode)try{savedInbox=restoreDemoInbox(localStorage);}catch{}
if(savedInbox)Object.assign(state,savedInbox,{step:6,appTab:'announcements',demoSkipped:{contacts:true,passport:true}});
if(!savedInbox&&!preview&&!showcase&&!invitationCode&&restoreExplorer(localStorage))Object.assign(state,{step:6,guest:true,status:'guest',appTab:'profile'});
if(invitationCode&&!showcase)Object.assign(state,{step:0,guest:true,status:'guest',profileSetup:true,book:'vouched',appTab:'profile',inviteCode:invitationCode.slice(0,64)});
if(demo&&!showcase&&['profile','review','announcements'].includes(preview)){
 Object.assign(state,{step:6,name:sampleApplicant.name,email:sampleApplicant.email,whatsapp:sampleApplicant.whatsapp,demoSampleApplicant:true,reference:'NT-DEMO-0001',status:preview==='review'?'pending':'accepted',appTab:preview==='profile'?'profile':'announcements',passport:{verified:false,preview:true},messages:['New Tibet: We received demo application NT-DEMO-0001.']});recordApplicationEvent(state,'pending');if(state.status==='accepted')recordApplicationEvent(state,'accepted');
}
if(showcase){
 Object.assign(state,{step:6,name:sampleApplicant.name,demoSampleApplicant:true,reference:'NT-SHOWCASE-0001',status:'accepted',appTab:showcaseTab,chatOpen:true,passport:{verified:false,preview:true}});
 recordApplicationEvent(state,'pending');recordApplicationEvent(state,'accepted');
 document.body.classList.add('showcase-mode');document.body.inert=true;
}
window.addEventListener('pagehide',stopCamera);document.querySelector('#year').textContent=new Date().getFullYear();document.querySelector('#privacy').onclick=()=>document.querySelector('#privacy-dialog').showModal();document.querySelector('#close-privacy').onclick=()=>document.querySelector('#privacy-dialog').close();render();resumeLiveSession();
setInterval(()=>{if(!demo&&state.step===6&&state.reference&&!document.hidden)refreshInbox();},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.step===6&&state.reference){if(['announcements','wallet'].includes(state.appTab))renderAcceptedAccount();if(!demo)refreshInbox();}});
