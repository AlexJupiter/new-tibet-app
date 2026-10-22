const icon=paths=>`<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const privacyIcon=icon('<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>');
const restartIcon=icon('<path d="M3 11a9 9 0 1 1 2.6 7.4M3 4v7h7"/>');
export function mountNavigationUtilities({demo,onRestart}){
 const profile=document.querySelector('#profile-button'),privacy=document.querySelector('#privacy-dialog');
 const trigger=document.createElement('button');trigger.id='app-options-button';trigger.className='app-options-button';trigger.type='button';trigger.hidden=true;trigger.setAttribute('aria-label','More app options');trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls','app-options-dialog');
 trigger.setAttribute('aria-expanded','false');trigger.innerHTML=icon('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>');
 profile.before(trigger);
 const sidebar=document.createElement('nav');sidebar.className='sidebar-utilities';sidebar.setAttribute('aria-label','App options');sidebar.hidden=true;
 const actions=`<button type="button" data-nav-privacy>${privacyIcon}<span>Privacy</span></button>${demo?`<button type="button" data-nav-restart>${restartIcon}<span>Restart demo</span></button>`:''}`;
 sidebar.innerHTML=actions;document.body.appendChild(sidebar);
 const menu=document.createElement('dialog');menu.id='app-options-dialog';menu.className='app-options-dialog';menu.setAttribute('aria-labelledby','app-options-title');
 menu.innerHTML=`<div class="app-options-heading"><h2 id="app-options-title">App options</h2><button type="button" class="app-options-close" aria-label="Close app options">×</button></div>${actions}`;document.body.appendChild(menu);
 let opener;
 trigger.onclick=()=>{opener=trigger;menu.showModal();trigger.setAttribute('aria-expanded','true');};
 menu.querySelector('.app-options-close').onclick=()=>menu.close();
 menu.addEventListener('click',event=>{if(event.target!==menu)return;const r=menu.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)menu.close();});
 menu.addEventListener('close',()=>{trigger.setAttribute('aria-expanded','false');if(opener?.isConnected&&!privacy.open)opener.focus({preventScroll:true});});
 for(const container of [sidebar,menu]){
  container.querySelector('[data-nav-privacy]').onclick=event=>{
   opener=container===menu?trigger:event.currentTarget;
   if(menu.open)menu.close();privacy.showModal();
  };
  container.querySelector('[data-nav-restart]')?.addEventListener('click',()=>{if(menu.open)menu.close();onRestart();});
 }
 privacy.addEventListener('close',()=>{if(opener?.isConnected)opener.focus({preventScroll:true});opener=null;});
 const wide=matchMedia('(min-width: 900px)');
 wide.addEventListener('change',()=>{if(menu.open)menu.close();});
 return {update({inApp,showShortcut=false}){
  trigger.hidden=!inApp;sidebar.hidden=!inApp;
  document.body.classList.toggle('onboarding-shortcuts-visible',inApp&&demo&&showShortcut);
  if(!inApp&&menu.open)menu.close();
 }};
}
