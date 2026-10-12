import {membershipLabel} from './invites.js';
import {loadImage} from './images.js';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function profileInitials(name){
 const parts=String(name).trim().split(/\s+/u).filter(Boolean);
 return (parts.length>1?[parts[0],parts.at(-1)]:parts).map(part=>Array.from(part)[0]).join('').toLocaleUpperCase()||'NT';
}
export function profileIdentityCard(state,{demo=false,portrait=''}={}){
 const processing=state.status==='pending',declined=state.status==='declined',accepted=state.status==='accepted'&&Boolean(state.reference);
 const name=String(state.name||'').trim()||'Member '+String(state.reference||'').slice(-6);
 const book=state.book==='vouched'?'Vouched by a member':state.book==='green'?'Green Book':'Blue Book';
 const status=processing?'Processing':declined?'Not approved':accepted?(demo?'Accepted · preview':'Accepted'):'Not verified';
 return `<article class="identity-card ${processing?'identity-processing':''}" data-identity-status="${processing?'processing':accepted?'accepted':'unverified'}" aria-label="${processing?'New Tibet ID preview · Processing':'New Tibet digital identity profile'}">
  <div class="identity-card-top">
   <img src="${new URL('./assets/new-tibet-logo-blue.svg',import.meta.url).href}" width="152" height="64" alt="New Tibet"/>
   ${processing?'<span class="identity-processing-status"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>Processing</span>':`<span class="identity-card-kind">${demo?'Demo profile':'Digital identity'}</span>`}
  </div>
  <div class="identity-card-holder">
   <div class="identity-portrait" ${portrait?'':`role="img" aria-label="Profile initials ${esc(profileInitials(name))}"`}>${portrait?`<img src="${esc(portrait)}" alt="Fictional demo applicant portrait"/>`:esc(profileInitials(name))}</div>
   <div class="identity-holder-name"><p class="identity-label">${String(state.name||'').trim()?'Display name':'Member name'}</p><h3>${esc(name)}</h3><p class="identity-holder-type">${processing?`${book} application`:membershipLabel(state.book)}</p></div>
  </div>
  <div class="identity-card-details"><dl class="identity-fields">
   <div class="identity-reference"><dt>${accepted?'Profile':'Application'} reference</dt><dd>${esc(state.reference||'Not submitted')}</dd></div>
   <div><dt>${state.book==='vouched'?'Membership basis':'Document'}</dt><dd>${book}</dd></div>
   <div><dt>Status</dt><dd>${status}</dd></div>
  </dl>${accepted?'<button class="identity-qr" id="identity-qr" type="button" aria-label="Show membership QR code" disabled><span>Preparing QR…</span></button>':'<div class="identity-qr-placeholder"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/></svg><span>QR available<br/>after verification</span></div>'}</div>
  <div class="identity-card-bottom"><span>NEW TIBET IDENTITY</span><span>${accepted?(demo?'PREVIEW ONLY':'DIGITAL PROFILE'):'AWAITING VERIFICATION'}</span></div>
 </article>`;
}
export function cardControls(demo){
 return `<section class="card-wallet" aria-labelledby="card-wallet-title"><h3 id="card-wallet-title">Use your card in person.</h3><p>Keep your membership card in Apple Wallet or Google Wallet to present at participating physical locations. Staff can scan the QR code to check your membership.</p><p class="card-wallet-note" id="card-wallet-status" role="status">${demo?'Demo previews · Wallet saving is not enabled in this demo.':'Preparing your membership card…'}</p><div class="card-wallet-actions">${['apple','google'].map(provider=>{const platform=provider==='apple'?'Apple Wallet':'Google Wallet';return `<div class="wallet-provider"><button class="wallet-badge" type="button" data-card-provider="${provider}" aria-label="Preview ${platform} membership card"><img src="${new URL(`./assets/wallet/add-to-${provider}-wallet.svg`,import.meta.url).href}" alt="Add to ${platform}"/></button><span class="wallet-provider-note">${demo?'Demo preview':'Preview'}</span></div>`;}).join('')}</div></section><dialog id="card-wallet-dialog"><button class="dialog-close" id="close-card-wallet" aria-label="Close">×</button><div id="card-wallet-dialog-content"></div></dialog>`;
}
export async function mountProfileCard({root,state,demo,api,config}){
 const qr=root.querySelector('#identity-qr'),status=root.querySelector('#card-wallet-status'),dialog=root.querySelector('#card-wallet-dialog');
 const reference=state.reference,book=state.book,alias='Member '+reference.slice(-6);
 const current=()=>qr.isConnected&&state.reference===reference&&state.status==='accepted';
 let card,qrImage;
 const report=message=>{if(current())status.textContent=message;};
 root.querySelector('#close-card-wallet').onclick=()=>dialog.close();
 const preview=provider=>{
  const platform=provider==='apple'?'Apple Wallet':'Google Wallet';
  root.querySelector('#card-wallet-dialog-content').innerHTML=`<p class="eyebrow">${esc(platform.toUpperCase())}</p><h2>Membership card.</h2><div class="wallet-pass-preview ${provider}"><img class="pass-preview-logo" src="${new URL('./assets/new-tibet-logo-blue.svg',import.meta.url).href}" alt="New Tibet"/><p class="pass-preview-label">MEMBER</p><h3>${esc(alias)}</h3><div class="pass-preview-fields"><div><span>MEMBERSHIP</span><strong>${membershipLabel(book)}</strong></div><div><span>STATUS</span><strong>${demo?'Accepted · preview':'Accepted'}</strong></div></div>${qrImage?`<img class="pass-preview-qr" src="${qrImage}" alt="${demo?'Demo':'Membership'} QR code"/>`:''}<p class="pass-preview-reference">${esc(reference)}</p><span class="pass-preview-demo">${demo?'DEMO · PREVIEW ONLY':'LAYOUT PREVIEW'}</span></div><p>${demo?'This is a preview. It cannot be added to a device wallet and is not a valid membership card.':'Wallet saving is not available yet. This shows how your membership pass will look.'}</p><p class="card-wallet-note">Wallet passes use your member reference. Name, contact details and passport data are not included.</p>${demo&&qrImage?'<button class="secondary" id="download-card" type="button">Download demo card image</button><p class="card-wallet-note">Saves a PNG image, not a wallet pass.</p>':''}`;
  const download=root.querySelector('#download-card');if(download)download.onclick=async()=>{
   download.disabled=true;try{await downloadDemoCard({reference,book,name:state.name.trim()||alias,qrImage});}catch{report('The image could not be saved. Please try again.');}finally{download.disabled=false;}
  };
  dialog.showModal();
 };
 for(const button of root.querySelectorAll('[data-card-provider]'))button.onclick=async()=>{
  const provider=button.dataset.cardProvider;
  if(demo||!card?.[provider])return preview(provider);
  button.disabled=true;report('Preparing '+(provider==='apple'?'Apple Wallet':'Google Wallet')+'…');
  try{
   const result=await api('cards/'+provider,{});if(!current())return;
   if(provider==='google'){
    const url=new URL(result.url);if(url.origin!=='https://pay.google.com'||!url.pathname.startsWith('/gp/v/save/'))throw new Error('Invalid Wallet link.');location.assign(url.href);
   }else{
    if(!/^\/api\/cards\/apple\/download\/[-_A-Za-z0-9]{43}$/.test(result.path))throw new Error('Invalid Wallet download.');
    const link=document.createElement('a');link.href=new URL(result.path,config.apiBase||location.origin).href;link.rel='noreferrer';document.body.appendChild(link);link.click();link.remove();
   }
   report('Follow your device’s instructions to add the membership pass.');
  }catch(error){report(error.message||'The Wallet pass could not be prepared. Please try again.');}finally{if(current())button.disabled=false;}
 };
 qr.onclick=()=>{if(!qrImage)return;root.querySelector('#card-wallet-dialog-content').innerHTML=`<h2>${demo?'Demo QR code.':'Membership QR code.'}</h2><img class="card-qr-expanded" src="${qrImage}" alt="Scan this QR code to ${demo?'open the clearly marked demo check':'check current membership'}"/><p>${demo?'Scanning opens an example membership check. This demo card does not verify a real membership.':'Present this QR code at a participating physical location. The check shows your member reference, book type and current membership status.'}</p><a class="text-button" href="${esc(card.verificationURL)}" target="_blank" rel="noopener noreferrer">Open membership check ↗</a>`;dialog.showModal();};
 try{
  if(demo){const url=new URL('./verify.html',import.meta.url);url.hash=new URLSearchParams({demo:book,reference}).toString();card={verificationURL:url.href,apple:false,google:false};}
  else card=await api('cards/profile');
  const {cardQR}=await import('./card-qr.js');qrImage=await cardQR(card.verificationURL);
  if(!current())return;
  qr.innerHTML=`<img src="${qrImage}" width="128" height="128" alt="${demo?'Demo':'Membership verification'} QR code"/><span>${demo?'Demo QR · tap to view':'Scan to check membership'}</span>`;
  qr.disabled=false;
  if(!demo){
   for(const button of root.querySelectorAll('[data-card-provider]')){const provider=button.dataset.cardProvider,platform=provider==='apple'?'Apple Wallet':'Google Wallet';button.setAttribute('aria-label',card[provider]?'Add to '+platform:'Preview '+platform+' membership card');button.parentElement.querySelector('.wallet-provider-note').textContent=card[provider]?'Save membership card':'Preview · Saving unavailable';}
   report(card.apple||card.google?'Present your saved card at participating locations. Name and contacts are not included in wallet passes.':'Wallet saving is not enabled yet. You can present the QR code in the app.');
  }
 }catch(error){if(current()){qr.innerHTML='<span>QR unavailable</span>';report(error.message||'The membership card could not be loaded. Please try again.');}}
}
async function downloadDemoCard({reference,book,name,qrImage}){
 await document.fonts.ready;
 const [logo,qr]=await Promise.all([loadImage(new URL('./assets/new-tibet-logo-blue.svg',import.meta.url).href),loadImage(qrImage)]);
 const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=760;const ctx=canvas.getContext('2d');
 ctx.fillStyle='#edf1f7';ctx.fillRect(0,0,1200,760);ctx.fillStyle='#1b2a5b';ctx.fillRect(0,0,1200,10);ctx.drawImage(logo,60,50,240,101);
 ctx.font='500 22px Inter, sans-serif';ctx.fillStyle='#1b2a5b';ctx.textAlign='right';ctx.fillText('DEMO MEMBERSHIP CARD',1140,100);ctx.textAlign='left';
 ctx.font='500 20px Inter, sans-serif';ctx.fillText('DISPLAY NAME',60,235);ctx.fillStyle='#1b2a5b';ctx.font='600 54px Inter, sans-serif';while(ctx.measureText(name).width>1020){name=name.slice(0,-2)+'…';}ctx.fillText(name,60,302);
 ctx.fillStyle='#1b2a5b';ctx.font='500 20px Inter, sans-serif';ctx.fillText('MEMBERSHIP',60,398);ctx.fillText('STATUS',430,398);ctx.fillText('MEMBER REFERENCE',60,530);
 ctx.fillStyle='#1b2a5b';ctx.font='500 30px Inter, sans-serif';ctx.fillText(membershipLabel(book),60,446);ctx.fillText('Accepted · preview',430,446);ctx.font='400 24px "IBM Plex Mono", monospace';ctx.fillText(reference,60,575);
 ctx.imageSmoothingEnabled=false;ctx.drawImage(qr,865,350,275,275);ctx.fillStyle='#1b2a5b';ctx.font='400 18px Inter, sans-serif';ctx.textAlign='center';ctx.fillText('DEMO QR CODE',1002,650);
 ctx.textAlign='left';ctx.fillStyle='#1b2a5b';ctx.fillRect(60,687,1080,1);ctx.font='500 20px Inter, sans-serif';ctx.fillText('NEW TIBET',60,728);ctx.textAlign='right';ctx.fillText('DEMO · PREVIEW ONLY',1140,728);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('Image unavailable.');
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='new-tibet-demo-card.png';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
