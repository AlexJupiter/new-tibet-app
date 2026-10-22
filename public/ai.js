import {initialAIState,aiCreditPacks,aiSuggestions,canBuyAICredits,buyDemoAICredits,sendDemoAIMessage} from './ai-model.js';
import {formatTokens} from './member-model.js';
import {securityComplete} from './onboarding-rewards.js';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const messageText=value=>esc(value).replace(/[\u0f00-\u0fff]+/gu,text=>`<span class="ai-tibetan">${text}</span>`);
const icon=paths=>`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const spark=icon('<path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6Z"/>');

export function renderAI(screen,state,{demo=false,showcase=false,rerender,openProfile,setupWallet}){
 if(!state.ai){
  state.ai=initialAIState();
  if(showcase)state.ai=sendDemoAIMessage({...state.ai,credits:21},'Help me learn a Tibetan greeting.','showcase-ai-greeting',{demo:true});
 }
 const ai=state.ai,chat=ai.conversations.find(item=>item.id===ai.activeId),eligible=canBuyAICredits(state);
 const newChat=()=>{state.ai={...state.ai,activeId:'',draft:'',notice:''};rerender();screen.querySelector('#ai-prompt')?.focus({preventScroll:true});};
 const unlock=()=>{if(state.status==='accepted'&&!securityComplete(state))setupWallet();else openProfile();};
 screen.innerHTML=`<section class="ai-app" aria-label="Tibetan AI conversation">
  <header class="ai-heading"><button type="button" class="ai-icon-button" id="ai-history" aria-label="Chat history" aria-haspopup="dialog">${icon('<path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5m4-1v5l3 2"/>')}</button><div class="ai-brand"><h2 id="screen-title" tabindex="-1">Tibetan AI</h2><p>Powered by <a href="https://monlam.ai/" target="_blank" rel="noopener noreferrer">Monlam.ai <span class="sr-only">(opens in a new tab)</span></a></p></div><button type="button" class="ai-credits" id="ai-add-credits" aria-label="AI credits, ${ai.credits} available. Add credits" aria-haspopup="dialog"><strong>${ai.credits}</strong> ${ai.credits===1?'credit':'credits'} <span aria-hidden="true">+</span></button><button type="button" class="ai-icon-button" id="ai-new-chat" aria-label="New chat">${icon('<path d="M13 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 3l5 5m-2-7 4 4L12 16l-5 1 1-5Z"/>')}</button></header>
  <div class="ai-messages ${chat?'':'ai-empty'}" ${chat?'role="log" aria-label="AI messages" aria-live="polite" aria-relevant="additions"':''}>
   ${chat?`<div class="ai-conversation">${chat.messages.map(message=>`<article class="ai-message ${message.role}">${message.role==='assistant'?`<div class="ai-answer-label"><span>${spark}</span><strong>Tibetan AI</strong><small>Sample answer</small></div>`:'<span class="sr-only">You</span>'}<p>${messageText(message.text)}</p></article>`).join('')}</div>`:`<div class="ai-welcome"><span class="ai-welcome-mark" aria-hidden="true">${spark}</span><span class="ai-preview-label">Integration preview</span><h3>How can I help?</h3><p>A Tibetan AI for language,<br/>culture and everyday questions.</p><div class="ai-suggestions">${aiSuggestions.map((item,index)=>`<button type="button" data-ai-suggestion="${index}"><strong>${item.title}</strong><span>${esc(item.text)}</span></button>`).join('')}</div><p class="ai-welcome-credit">AI credits are paid in <strong>$TIBET</strong>.</p></div>`}
  </div>
  <div class="ai-compose-area"><p class="ai-status" id="ai-status" role="status" ${!ai.notice?'hidden':''}>${esc(ai.notice||'')}</p><form id="ai-compose" class="ai-compose"><label class="sr-only" for="ai-prompt">Message Tibetan AI</label><textarea id="ai-prompt" rows="1" maxlength="4000" placeholder="Message Tibetan AI…" aria-describedby="ai-disclosure" ${!demo?'disabled':''}>${esc(ai.draft)}</textarea><button type="submit" class="ai-send" aria-label="Send demo AI message" ${!demo||!ai.draft.trim()?'disabled':''}>${icon('<path d="M12 19V5m-6 6 6-6 6 6"/>')}</button></form><div class="ai-compose-meta"><span>${demo?'1 credit per demo message':'Credits paid in $TIBET'}</span>${demo&&!eligible?`<button type="button" class="ai-setup-link" id="ai-unlock">${state.status==='accepted'?'Set up wallet':'Join to get credits'} <span aria-hidden="true">↗</span></button>`:demo?'<button type="button" class="ai-setup-link" id="ai-credit-link">Add credits with $TIBET <span aria-hidden="true">↗</span></button>':''}</div><p class="ai-disclosure" id="ai-disclosure">${demo?'Integration preview · Prepared sample replies. Monlam.ai is not connected.':'Monlam.ai is not connected yet. AI chat and credit payments are unavailable.'}</p></div>
 </section>`;
 const log=screen.querySelector('.ai-messages'),input=screen.querySelector('#ai-prompt'),send=screen.querySelector('.ai-send');
 const sizeInput=()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,132)+'px';};
 input.oninput=()=>{state.ai.draft=input.value;send.disabled=!demo||!input.value.trim();sizeInput();};
 requestAnimationFrame(()=>{if(input.isConnected)sizeInput();if(log.isConnected&&chat)log.scrollTop=log.scrollHeight;});
 screen.querySelector('#ai-new-chat').onclick=newChat;
 screen.querySelector('#ai-history').onclick=()=>openHistory(screen,state,{rerender,newChat});
 const addCredits=()=>openCredits(screen,state,{demo,rerender,unlock});
 screen.querySelector('#ai-add-credits').onclick=addCredits;
 screen.querySelector('#ai-credit-link')?.addEventListener('click',addCredits);
 screen.querySelector('#ai-unlock')?.addEventListener('click',unlock);
 screen.querySelectorAll('[data-ai-suggestion]').forEach(button=>button.onclick=()=>{if(!demo)return;input.value=aiSuggestions[Number(button.dataset.aiSuggestion)].text;input.dispatchEvent(new Event('input'));input.focus();});
 screen.querySelector('#ai-compose').onsubmit=event=>{
  event.preventDefault();if(!demo||!input.value.trim())return;
  state.ai.draft=input.value;
  if(!eligible||state.ai.credits<1)return addCredits();
  try{state.ai={...sendDemoAIMessage(state.ai,input.value,crypto.randomUUID(),{demo}),notice:''};rerender();screen.querySelector('#ai-prompt').focus({preventScroll:true});}
  catch(error){const status=screen.querySelector('#ai-status');status.hidden=false;status.textContent=error.message;}
 };
 input.onkeydown=event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();screen.querySelector('#ai-compose').requestSubmit();}};
}

function mountDialog(screen,{id,title,opener}){
 const dialog=document.createElement('dialog');dialog.id=id;dialog.className='ai-dialog';dialog.setAttribute('aria-labelledby',id+'-title');
 dialog.innerHTML=`<button class="dialog-close" type="button" aria-label="Close ${esc(title.toLowerCase())}">×</button><h2 id="${id}-title">${title}</h2><div class="ai-dialog-content"></div>`;
 screen.appendChild(dialog);dialog.querySelector('.dialog-close').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{dialog.remove();if(opener?.isConnected)opener.focus({preventScroll:true});},{once:true});
 dialog.showModal();return dialog;
}
function openCredits(screen,state,{demo,rerender,unlock}){
 if(screen.querySelector('#ai-credits-dialog'))return;
 const eligible=canBuyAICredits(state),dialog=mountDialog(screen,{id:'ai-credits-dialog',title:'Buy AI credits',opener:document.activeElement}),content=dialog.querySelector('.ai-dialog-content');
 const balance=state.walletDemo?.tibetUnits||0,purchaseId=crypto.randomUUID();
 content.innerHTML=`<p>Use $TIBET from your New Tibet wallet to add AI credits.</p><p class="ai-example-rate">Example pricing · 1 $TIBET = 10 credits</p><form id="ai-credit-form"><fieldset class="ai-credit-packs"><legend>Choose a credit pack</legend>${aiCreditPacks.map((pack,index)=>`<label><input type="radio" name="ai-pack" value="${pack.id}" ${index===0?'checked':''}/><span><strong>${pack.credits} credits</strong><small>${formatTokens(pack.tibetUnits)} $TIBET</small></span></label>`).join('')}</fieldset><dl class="ai-purchase-summary"><div><dt>Wallet balance</dt><dd>${eligible?formatTokens(balance)+' $TIBET':'Wallet setup required'}</dd></div><div><dt>You pay</dt><dd id="ai-credit-total">1.00 $TIBET</dd></div></dl><p id="ai-purchase-error" class="ai-error" role="alert" hidden></p>${demo&&eligible?'<button class="primary" id="ai-credit-confirm" type="submit">Confirm demo purchase</button>':demo?`<button class="primary" id="ai-credit-unlock" type="button">${state.status==='accepted'?'Set up your wallet':'Verify your membership'}</button>`:'<p class="ai-example-rate">Credit payments will become available after the Monlam.ai integration is connected.</p>'}</form><p class="ai-dialog-note">${demo?'Demo purchase only. No $TIBET is transferred, and no request is sent to Monlam.ai. Credits and chats stay in this page and reset on reload.':'This is an integration preview. No tokens can be spent here.'}</p>`;
 const form=dialog.querySelector('form'),error=dialog.querySelector('#ai-purchase-error');
 const update=()=>{
  const pack=aiCreditPacks.find(item=>item.id===form.elements['ai-pack'].value);
  dialog.querySelector('#ai-credit-total').textContent=formatTokens(pack.tibetUnits)+' $TIBET';
  const insufficient=demo&&eligible&&balance<pack.tibetUnits;
  error.hidden=!insufficient;error.textContent=insufficient?'Not enough $TIBET in your demo wallet. Choose a smaller pack or complete more setup rewards.':'';
  const confirm=dialog.querySelector('#ai-credit-confirm');if(confirm)confirm.disabled=insufficient;
 };
 form.onchange=update;update();
 dialog.querySelector('#ai-credit-unlock')?.addEventListener('click',()=>{dialog.close();unlock();});
 form.onsubmit=event=>{
  event.preventDefault();if(!demo||!eligible)return;
  try{
   const tx=buyDemoAICredits(state,form.elements['ai-pack'].value,purchaseId,{demo});
   state.ai.notice=`${tx.credits} demo AI credits added for ${formatTokens(tx.tibetUnits)} $TIBET.`;
   dialog.close();rerender();screen.querySelector('#ai-prompt').focus({preventScroll:true});
  }catch(failure){error.hidden=false;error.textContent=failure.message;}
 };
}
function openHistory(screen,state,{rerender,newChat}){
 if(screen.querySelector('#ai-history-dialog'))return;
 const dialog=mountDialog(screen,{id:'ai-history-dialog',title:'Your AI chats',opener:document.activeElement});
 dialog.querySelector('.ai-dialog-content').innerHTML=`<button class="primary" id="ai-history-new" type="button">New chat</button>${state.ai.conversations.length?`<ul class="ai-history-list">${state.ai.conversations.map(chat=>`<li><button type="button" data-ai-chat="${esc(chat.id)}" ${chat.id===state.ai.activeId?'aria-current="true"':''}>${esc(chat.title)}</button></li>`).join('')}</ul>`:'<p>Your conversations will appear here.</p>'}<p class="ai-dialog-note">Demo conversations stay in this page and are cleared on reload.</p>`;
 dialog.querySelector('#ai-history-new').onclick=()=>{dialog.close();newChat();};
 dialog.querySelectorAll('[data-ai-chat]').forEach(button=>button.onclick=()=>{state.ai.activeId=button.dataset.aiChat;state.ai.draft='';state.ai.notice='';dialog.close();rerender();screen.querySelector('#ai-prompt').focus({preventScroll:true});});
}
