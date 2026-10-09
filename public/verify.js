import {membershipLabel} from './invites.js';
const config=window.NEW_TIBET_CONFIG||{mode:'demo',apiBase:''};
const result=document.querySelector('#verification-result'),params=new URLSearchParams(location.hash.slice(1));
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function details(reference,book){return `<dl class="verification-details"><div><dt>Member reference</dt><dd>${esc(reference)}</dd></div><div><dt>Membership</dt><dd>${membershipLabel(book)}</dd></div></dl>`;}
async function check(){
 if(params.has('demo')){
  result.innerHTML='<div class="verification-status preview">Demo card · Preview only</div><p>This is a sample membership check. It does not confirm a real New Tibet membership.</p>'+details(/^NT-[A-Z0-9-]{4,60}$/.test(params.get('reference')||'')?params.get('reference'):'NT-DEMO-0001',params.get('demo'));return;
 }
 const token=params.get('card');
 if(!token||!/^[-_A-Za-z0-9]{43}$/.test(token)){result.innerHTML='<div class="verification-status invalid">Card not verified</div><p>Scan the QR code on a New Tibet membership card to check it.</p>';return;}
 if(config.mode!=='live'){result.innerHTML='<div class="verification-status invalid">Verification unavailable</div><p>This website is in demo mode. It cannot verify a real membership card.</p>';return;}
 try{
  const response=await fetch(config.apiBase.replace(/\/$/,'')+'/api/cards/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({card:token}),referrerPolicy:'no-referrer'});
  if(!response.ok)throw new Error('Check unavailable.');const data=await response.json();
  if(!data.valid){result.innerHTML='<div class="verification-status invalid">Card not verified</div><p>This card is invalid, expired, or no longer active. Ask the holder to open their current profile.</p>';return;}
  result.innerHTML='<div class="verification-status valid">Membership confirmed</div>'+details(data.reference,data.book)+`<p class="verification-date">Checked now · Valid until ${esc(new Date(data.expiresAt).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}))}</p><p>This confirms New Tibet membership. It is not a government identity document.</p>`;
 }catch{result.innerHTML='<div class="verification-status invalid">Unable to check this card</div><p>A connection is required to check current membership.</p><button class="secondary" id="retry-check" type="button">Try again</button>';document.querySelector('#retry-check').onclick=check;}
}
check();
