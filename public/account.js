const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const icon=(paths)=>`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const tabIcons={
 petitions:icon('<path d="M7 3h9l4 4v14H4V3Z"/><path d="M15 3v5h5M8 12h8m-8 4h5"/>'),
 chat:icon('<path d="M21 11a9 9 0 0 1-9 9 10 10 0 0 1-4-1l-5 2 2-5a9 9 0 1 1 16-5Z"/><path d="M8 10h8m-8 4h5"/>'),
 profile:icon('<rect x="2" y="4" width="20" height="16" rx="3"/><circle cx="8" cy="10" r="2"/><path d="M5 16v-1a3 3 0 0 1 6 0v1m4-7h4m-4 4h4"/>')
};

export function renderAccountTabs(selected){
 return `<nav class="app-tabs" role="tablist" aria-label="New Tibet app">${['petitions','chat','profile'].map(tab=>`<button type="button" role="tab" id="tab-${tab}" data-app-tab="${tab}" aria-selected="${selected===tab}" aria-controls="account-panel" tabindex="${selected===tab?'0':'-1'}">${tabIcons[tab]}<span>${{petitions:'Petitions',chat:'Chat',profile:'Profile'}[tab]}</span></button>`).join('')}</nav>`;
}

const petitions=[
 {id:'language',category:'Language',title:'Support Tibetan language education',summary:'Expand access to Tibetan language classes and learning materials for the next generation.',body:'This sample petition calls for more community-run classes, open learning resources, and support for teachers serving Tibetan communities.'},
 {id:'education',category:'Education',title:'Create more student scholarships',summary:'Help Tibetan students access further education and vocational training.',body:'This sample petition proposes a transparent community scholarship programme with published eligibility criteria and an annual report.'},
 {id:'heritage',category:'Culture',title:'Preserve Tibetan oral histories',summary:'Support a community archive of stories, language, and cultural knowledge.',body:'This sample petition asks for an accessible oral history archive with informed contributor consent and community oversight.'}
];

export function renderPetitions(screen,state,demo,notice,rerender){
 screen.innerHTML=`<h2 id="screen-title" tabindex="-1">Petitions</h2><p class="description">Community priorities, supported by members.</p>${demo?'<p class="section-note">Example petitions. Signatures stay in this demo.</p>':'<p class="section-note">Petitions will appear when they are published by New Tibet.</p>'}<div class="petition-list">${demo?petitions.map(p=>{
  const signed=state.petitionSignatures.includes(p.id);
  return `<article class="petition-card"><span class="petition-category">${p.category}</span><h3>${p.title}</h3><p>${p.summary}</p><details><summary>Read petition</summary><p>${p.body}</p></details><button class="${signed?'secondary':'primary'}" type="button" data-petition="${p.id}" ${signed?'disabled':''}>${signed?'✓ Signed in demo':'Sign petition'}</button></article>`;
 }).join(''):''}</div>`;
 screen.querySelectorAll('[data-petition]').forEach(button=>button.onclick=()=>{
  if(!demo||state.petitionSignatures.includes(button.dataset.petition))return;
  state.petitionSignatures.push(button.dataset.petition);rerender();notice('Signed in this demo. No signature has been submitted.');
 });
}

export function renderChat(screen,state,demo,rerender){
 const messages=demo?[
  {name:'Sonam',text:'Who’s joining the community meet-up?',own:false},
  {name:'Pema',text:'I can bring the Tibetan language learning materials.',own:false},
  ...state.chatMessages
 ]:[];
 screen.innerHTML=`<h2 id="screen-title" tabindex="-1">Chat</h2><p class="description">Connect with people nearby.</p>
 <div class="mesh-status">${icon('<path d="m7 7 10 10-5 4V3l5 4L7 17"/>')}<div><strong>BitChat · Bluetooth mesh</strong><span>Not connected</span></div></div>
 <p class="section-note" id="chat-mode-note">${demo?'This is a local demo room. Messages are not broadcast.':'Bluetooth mesh chat requires the native BitChat app.'} <a href="https://bitchat.free/" target="_blank" rel="noopener">Get BitChat ↗</a></p>
 <section class="chat-room" aria-label="Community demo room"><div class="chat-room-heading"><strong>Community</strong><span>${demo?'Demo room':'Native app required'}</span></div><div class="chat-messages" role="log" aria-live="polite" aria-relevant="additions">${messages.map(message=>`<div class="chat-message ${message.own?'own':''}"><span>${esc(message.name)}</span><p>${esc(message.text)}</p>${message.own?'<small>Only in this demo</small>':''}</div>`).join('')}</div>
 <form id="chat-compose" class="chat-compose"><label class="sr-only" for="chat-text">Message</label><textarea id="chat-text" rows="1" maxlength="1000" placeholder="Write a message…" aria-describedby="chat-mode-note" ${!demo?'disabled':''}>${esc(state.chatDraft||'')}</textarea><button type="submit" class="primary" aria-label="Send demo message" ${!demo?'disabled':''}>${icon('<path d="M12 20V4m-6 6 6-6 6 6"/>')}</button></form></section>
 <p class="under-button">Nearby mesh messaging uses Bluetooth in the native app. This web preview does not connect to the mesh.</p>`;
 const input=screen.querySelector('#chat-text');
 input.oninput=()=>{state.chatDraft=input.value;};
 screen.querySelector('#chat-compose').onsubmit=event=>{
  event.preventDefault();const text=input.value.trim();if(!demo||!text)return;
  state.chatMessages.push({name:state.name.trim()||'You',text,own:true});state.chatDraft='';rerender();
  screen.querySelector('#chat-text').focus({preventScroll:true});
  const log=screen.querySelector('.chat-messages');log.scrollTop=log.scrollHeight;
 };
 input.onkeydown=event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();screen.querySelector('#chat-compose').requestSubmit();}};
}

export function walletSummary(state,demo){
 if(!demo)return '';
 const ready=state.wallet?.ready;
 return `<section class="wallet-summary" aria-labelledby="wallet-summary-title"><div class="wallet-summary-top"><h3 id="wallet-summary-title">Ethereum wallet</h3><span>Demo</span></div><div class="wallet-token"><strong>$TIBET</strong><span>New Tibet Coin</span><em>Not active</em></div>${ready?`<p class="wallet-address">${esc(state.wallet.address)}</p><p class="section-note">${state.wallet.method==='passkey'?'Protected by your passkey':'Recovery phrase confirmed'} · Preview only</p>`:'<p class="section-note">Wallet setup was skipped.</p>'}<p class="section-note">Token access and transfers are not active in this demo. Do not send funds to this preview wallet.</p></section>`;
}
