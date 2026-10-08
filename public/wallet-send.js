import {demoSendGasUnits,findDemoRecipient,searchDemoRecipients,formatTokens,quoteDemoSend,sendDemoBalance} from './member-model.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const heading=(title,description)=>`<h2 id="screen-title" tabindex="-1">${title}</h2><p class="description">${description}</p>`;
const note='<p class="section-note">Demo transfer · Sample members. No real tokens are moved.</p>';
const recipientCard=recipient=>`<span class="wallet-member-avatar" aria-hidden="true">${recipient.initials}</span><span class="wallet-member-copy"><strong>${recipient.name}</strong><span>@${recipient.username}</span></span>`;
const amounts=quote=>`<div><dt>Recipient receives</dt><dd>${formatTokens(quote.tibetUnits)} $TIBET</dd></div><div><dt>Gas fee</dt><dd>${formatTokens(quote.gasUnits)} $TIBET</dd></div><div class="send-total"><dt>Total deducted</dt><dd>${formatTokens(quote.totalUnits)} $TIBET</dd></div>`;

export function renderWalletSend(screen,state,{notice,changeView}){
 const wallet=state.walletDemo;
 const cancel=()=>{state.walletQuote=null;state.walletSendRecipient='';state.walletSendSearch='';state.walletSendInput='';notice();changeView('home');};
 if(state.walletView==='send'){
  const recipient=findDemoRecipient(state.walletSendRecipient);
  screen.innerHTML=heading('Send $TIBET',recipient?'Enter the amount you want this member to receive.':'Find a member by their New Tibet username.')+note+`<form id="wallet-send-form">
   ${recipient?`<div class="wallet-selected-recipient">${recipientCard(recipient)}<button type="button" class="text-button" id="wallet-change-recipient">Change</button></div>`:`<label class="field"><span>Username</span><input id="wallet-recipient-search" type="search" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="40" placeholder="Search @username" value="${esc(state.walletSendSearch)}" aria-describedby="wallet-directory-note" aria-controls="wallet-recipient-results"/><small id="wallet-directory-note">Sample registered members in this demo.</small></label><p class="sr-only" id="wallet-search-status" role="status"></p><div id="wallet-recipient-results"></div>`}
   ${recipient?`<div class="amount-card"><div><label for="wallet-send-amount">Amount to send</label><button type="button" class="text-button" id="wallet-send-max">Max</button></div><div class="amount-input"><input id="wallet-send-amount" type="text" inputmode="decimal" autocomplete="off" maxlength="12" required placeholder="0.00" value="${esc(state.walletSendInput)}"/><span>$TIBET</span></div><small>Available: ${formatTokens(wallet.tibetUnits)} $TIBET</small></div><dl class="transaction-review send-estimate"><div><dt>Gas fee</dt><dd>${formatTokens(demoSendGasUnits)} $TIBET</dd></div><div class="send-total"><dt>Total deducted</dt><dd id="wallet-send-total">—</dd></div></dl><p class="section-note">The gas fee is paid from your $TIBET balance, on top of the amount sent. 0.25 $TIBET is an illustrative demo fee.</p>`:''}
   <div class="actions"><button class="secondary" id="wallet-send-cancel" type="button">Cancel</button><button class="primary" type="submit" ${!recipient?'disabled':''}>Review send</button></div>
  </form>`;
  screen.querySelector('#wallet-send-cancel').onclick=cancel;
  if(!recipient){
   const search=screen.querySelector('#wallet-recipient-search'),results=screen.querySelector('#wallet-recipient-results');
   const update=()=>{
    state.walletSendSearch=search.value;
    const matches=searchDemoRecipients(search.value);
    screen.querySelector('#wallet-search-status').textContent=matches.length===0?'No usernames found.':`${matches.length} sample ${matches.length===1?'member':'members'} found.`;
    results.innerHTML=matches.length?`<ul class="wallet-recipient-list">${matches.map(member=>`<li><button type="button" class="wallet-recipient" data-wallet-recipient="${member.username}" aria-label="Send to ${member.name}, @${member.username}">${recipientCard(member)}<span class="wallet-member-arrow" aria-hidden="true">→</span></button></li>`).join('')}</ul>`:'<p class="wallet-search-empty">No usernames found. Try another username.</p>';
    results.querySelectorAll('[data-wallet-recipient]').forEach(button=>button.onclick=()=>{
     state.walletSendRecipient=button.dataset.walletRecipient;state.walletQuote=null;notice();changeView('send');screen.querySelector('#wallet-send-amount').focus({preventScroll:true});
    });
   };
   search.oninput=update;update();
  }else{
   const input=screen.querySelector('#wallet-send-amount');
   const update=()=>{
    state.walletSendInput=input.value;let total='—';
    try{total=formatTokens(quoteDemoSend(state.walletDemo,recipient.username,input.value).totalUnits)+' $TIBET';}catch{}
    screen.querySelector('#wallet-send-total').textContent=total;
   };
   input.oninput=update;update();
   screen.querySelector('#wallet-send-max').onclick=()=>{input.value=(Math.max(0,state.walletDemo.tibetUnits-demoSendGasUnits)/100).toFixed(2);update();};
   screen.querySelector('#wallet-change-recipient').onclick=()=>{state.walletSendRecipient='';state.walletQuote=null;notice();changeView('send');screen.querySelector('#wallet-recipient-search').focus({preventScroll:true});};
  }
  screen.querySelector('#wallet-send-form').onsubmit=event=>{
   event.preventDefault();if(state.walletView!=='send')return;
   try{
    const quote=quoteDemoSend(state.walletDemo,state.walletSendRecipient,state.walletSendInput);
    state.walletQuote={...quote,id:crypto.randomUUID(),type:'send'};notice();changeView('send-review');
   }catch(error){notice(error.message);screen.querySelector('#wallet-send-amount')?.focus();}
  };return;
 }
 if(state.walletView==='send-review'){
  const quote=state.walletQuote;
  if(!quote||quote.type!=='send'){state.walletView='send';renderWalletSend(screen,state,{notice,changeView});return;}
  screen.innerHTML=heading('Review send','Check the username and total before confirming.')+note+`<dl class="transaction-review"><div><dt>To</dt><dd>${esc(quote.name)}<span class="send-review-username">@${esc(quote.username)}</span></dd></div>${amounts(quote)}<div><dt>Network</dt><dd>Ethereum · Demo</dd></div></dl><p class="section-note">The recipient receives the full amount. The gas fee comes from your remaining $TIBET balance.</p><div class="actions"><button class="secondary" id="wallet-send-back" type="button">Back</button><button class="primary" id="wallet-send-confirm" type="button">Confirm demo send</button></div>`;
  screen.querySelector('#wallet-send-back').onclick=()=>{state.walletQuote=null;changeView('send');};
  screen.querySelector('#wallet-send-confirm').onclick=()=>{
   if(state.walletView!=='send-review'||state.walletQuote?.id!==quote.id)return;
   try{
    state.walletDemo=sendDemoBalance(state.walletDemo,quote,quote.id);state.walletReceipt=quote;state.walletQuote=null;
    state.walletSendInput='';state.walletSendRecipient='';state.walletSendSearch='';notice();changeView('send-receipt');
   }catch(error){notice(error.message);}
  };return;
 }
 const receipt=state.walletReceipt;
 if(!receipt||receipt.type!=='send'){state.walletView='send';renderWalletSend(screen,state,{notice,changeView});return;}
 screen.innerHTML='<div class="success-icon" aria-hidden="true">✓</div>'+heading('Demo send complete',`${formatTokens(receipt.tibetUnits)} $TIBET credited to @${esc(receipt.username)} in this demo.`)+`<dl class="transaction-review"><div><dt>To</dt><dd>${esc(receipt.name)}<span class="send-review-username">@${esc(receipt.username)}</span></dd></div>${amounts(receipt)}</dl><p class="section-note">Simulation only. No Ethereum transaction has been sent.</p><div class="actions"><button class="primary" id="wallet-send-done" type="button">Back to wallet</button></div>`;
 screen.querySelector('#wallet-send-done').onclick=()=>changeView('home');
}
