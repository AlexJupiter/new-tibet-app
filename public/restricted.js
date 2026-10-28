import {meshInfoControl,meshExplainerDialog,bindMeshExplainer} from './mesh-control.js';
import {walletExplainerNotice,walletExplainerDialog,bindWalletExplainer} from './wallet-explainer.js';
const lock='<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/></svg>';
const titles={chat:'Chat',wallet:'Wallet',announcements:'Announcements'};
const descriptions={chat:'Conversations are hidden until your membership is verified. No member names or messages are shown.',wallet:'Earn 100 $TIBET by completing book verification. After verification, set up your wallet to receive your rewards and unlock sending, swapping and withdrawals.',announcements:'New Tibet member announcements are hidden until verification. Your application updates will remain available while your application is reviewed.'};
export function renderRestricted(screen,state,unlock,closeAnnouncements){
 const tab=state.appTab,title=titles[tab];
 screen.innerHTML=`<section class="restricted-view ${tab==='chat'?'restricted-chat':''}"><div class="restricted-heading"><h2 id="screen-title" tabindex="-1">${title}</h2><span class="locked-label">${lock} Verification required</span>${tab==='announcements'?'<button class="text-button" id="close-announcements" type="button">Close</button>':''}</div>${tab==='wallet'?'<div class="locked-wallet-balance"><span>$TIBET balance</span><strong>— <small>$TIBET</small></strong><div><button class="secondary" disabled>Send</button><button class="secondary" disabled>Swap</button><button class="secondary" disabled>Withdraw</button></div></div>':''}<div class="restricted-content"><span class="restricted-lock">${lock}</span><h3>${tab==='chat'?'Your conversations will appear here':tab==='wallet'?'Your wallet is locked':'Member updates'}</h3><p>${descriptions[tab]}</p><button class="primary" id="unlock-profile" type="button">${state.reference?'View verification progress':'Get started on Profile'}</button>${tab==='chat'?'<p class="restricted-mesh-note">Messages in the native app travel over Bluetooth mesh, without a central messaging intermediary. Relays may take time.</p>':''}</div>${tab==='chat'?meshInfoControl('restricted-mesh-dialog'):''}</section>${tab==='chat'?meshExplainerDialog('restricted-mesh-dialog','restricted-mesh-close'):''}`;
 if(tab==='wallet'){
  screen.querySelector('.restricted-heading').insertAdjacentHTML('afterend',walletExplainerNotice());
  screen.insertAdjacentHTML('beforeend',walletExplainerDialog());bindWalletExplainer(screen);
 }
 screen.querySelector('#unlock-profile').onclick=unlock;
 screen.querySelector('#close-announcements')?.addEventListener('click',closeAnnouncements);
 if(tab==='chat')bindMeshExplainer(screen,'restricted-mesh-dialog');
}
