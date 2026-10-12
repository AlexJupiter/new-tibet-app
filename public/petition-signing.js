import {canUsePetitions,petitionsFor,supportPetition} from './member-model.js';
const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function confirmPetitionSignature(state,id,{demo,notice,rerender,opener}){
 if(!demo||!canUsePetitions(state)||state.petitionSignatures.includes(id))return;
 const petition=petitionsFor(state).find(item=>item.id===id);
 if(!petition||document.querySelector('.petition-sign-dialog[open]'))return;
 const dialog=document.createElement('dialog');dialog.className='petition-sign-dialog';
 dialog.setAttribute('aria-labelledby','petition-sign-title');dialog.setAttribute('aria-describedby','petition-sign-note');
 dialog.innerHTML=`<button class="dialog-close" type="button" aria-label="Close confirmation">×</button><p class="dialog-eyebrow">NEW TIBET ID</p><h2 id="petition-sign-title">Sign this petition?</h2><p class="petition-sign-motion">${esc(petition.title)}</p><form id="petition-sign-form"><label class="checkbox petition-sign-consent"><input type="checkbox" id="petition-sign-consent" required/><span>I confirm I will sign this petition with my cryptographic New Tibet identity in a privacy-preserving way, in support of the motion “${esc(petition.title)}”.</span></label><p id="petition-sign-note">Demo confirmation only. No cryptographic signature is generated or submitted. Your support stays in this page.</p><div class="actions"><button class="secondary" id="petition-sign-cancel" type="button" autofocus>Cancel</button><button class="primary" id="petition-sign-confirm" type="submit" disabled>Confirm signature</button></div></form>`;
 const checkbox=dialog.querySelector('#petition-sign-consent'),confirm=dialog.querySelector('#petition-sign-confirm');
 checkbox.onchange=()=>{confirm.disabled=!checkbox.checked;};
 dialog.querySelector('.dialog-close').onclick=dialog.querySelector('#petition-sign-cancel').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{dialog.remove();if(opener.isConnected)opener.focus();else {const signed=document.querySelector(`[data-petition="${CSS.escape(id)}"]`);(signed?.disabled?document.querySelector('#screen-title'):signed)?.focus();}});
 dialog.querySelector('form').onsubmit=event=>{
  event.preventDefault();if(!checkbox.checked||confirm.disabled)return;
  confirm.disabled=true;
  try{if(supportPetition(state,id)){dialog.close();rerender();notice('Petition signed in this demo. No cryptographic signature has been submitted.');}}
  catch(error){notice(error.message);dialog.close();}
 };
 document.body.appendChild(dialog);dialog.showModal();
}
