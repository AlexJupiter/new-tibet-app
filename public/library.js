import {libraryReward,libraryCategories,libraryLanguages,canContribute,searchLibrary,findLibraryItem,librarySocial,toggleLibraryLike,submitDemoContribution,approveDemoContribution,validateLibraryFile} from './library-model.js';
import {securityComplete} from './onboarding-rewards.js';
import {showRewardCelebration} from './reward-celebration.js';
import {esc,archiveIcon as icon,uploaderMarkup,likeMarkup,commentIcon} from './library-ui.js';
import {openLibraryReader} from './library-reader.js';
const options=(values,selected)=>values.map(value=>`<option ${value===selected?'selected':''}>${esc(value)}</option>`).join('');
const blankDraft=()=>({title:'',description:'',credit:'',source:'',category:'History',language:'Tibetan',permission:false});

export function renderLibrary(screen,state,{demo,showcase,rerender,notice,openProfile,setupWallet,persist}){
 const query=state.librarySearch||'',category=state.libraryCategory||'',items=searchLibrary(state,query,category),contributions=state.libraryContributions||[];
 screen.innerHTML=`<div class="account-heading library-heading"><h2 id="screen-title" tabindex="-1">Library</h2><button class="primary compact" id="library-upload" type="button">Upload information</button></div><p class="description">A cultural archive of Tibetan documents, language and living history.</p>
 <section class="library-reward-note"><span aria-hidden="true">${icon}</span><div><strong>Preserve knowledge. Earn ${libraryReward} $TIBET.</strong><p>Approved contributions receive a reward from the New Tibet Foundation. Verification and wallet setup are required to receive it.</p></div></section>
 <div class="library-filters"><label><span class="sr-only">Search Library</span><input id="library-search" type="search" placeholder="Search the archive" value="${esc(query)}"/></label><label><span class="sr-only">Filter by category</span><select id="library-category"><option value="">All categories</option>${options(libraryCategories,category)}</select></label></div>
 ${contributions.length?`<section class="library-contributions"><h3>Your contributions</h3>${contributions.map(item=>`<article><div><strong>${esc(item.title)}</strong><span>${item.status==='pending'?'Awaiting review':securityComplete(state)?'Approved · '+libraryReward+' $TIBET earned':'Approved · Set up wallet to receive '+libraryReward+' $TIBET'}</span></div>${item.status==='pending'&&demo?`<button class="secondary" type="button" data-library-approve="${item.id}">Simulate approval</button>`:`<button class="text-button" type="button" data-library-open="${item.id}">View</button>`}</article>`).join('')}<p class="section-note">Demo contributions · Review and rewards are simulated. Files and contribution details clear on reload.</p></section>`:''}
 <div class="library-results"><h3>Browse the archive</h3><span role="status">${items.length} ${items.length===1?'item':'items'}</span></div><div class="library-grid">${items.map(item=>{
  const social=librarySocial(state,item),image=item.image?new URL(item.image,import.meta.url).href:'';
  return `<article class="library-card" data-library-item="${esc(item.id)}"><button class="library-cover" type="button" data-library-open="${esc(item.id)}" aria-label="Preview ${esc(item.title)}">${image?`<img src="${esc(image)}" alt="${esc(item.imageAlt)}" loading="lazy" width="600" height="400"/>`:`<span class="library-file-cover">${icon}<span>${esc(item.kind)}</span></span>`}</button><div class="library-card-content"><div class="library-card-top"><span>${esc(item.category)}</span><span>${item.pages?item.pages.toLocaleString()+' pages':esc(item.language)}</span></div><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p><div class="library-card-meta"><span>${esc(item.edition||item.kind+' · '+item.language)}</span></div>${uploaderMarkup(item.uploader)}<div class="library-card-actions"><button class="text-button library-read-button" type="button" data-library-open="${esc(item.id)}">${item.document||item.file?'Read document':'Preview'} <span aria-hidden="true">→</span></button>${likeMarkup(item,social)}<button class="library-comment-button" type="button" data-library-comments="${esc(item.id)}" aria-label="Read ${social.comments.length} comments on ${esc(item.title)}">${commentIcon}<span>${social.comments.length}</span></button></div></div></article>`;
 }).join('')||'<p class="library-empty">No items match. Try another search or category.</p>'}</div><p class="section-note library-sources-note">Read original documents here, with their authors and sources credited. Initial entries are curated by the New Tibet Foundation. Community activity is illustrative; your demo likes and comments clear on reload.</p>`;
 screen.querySelector('#library-search').oninput=event=>{state.librarySearch=event.target.value;rerender();screen.querySelector('#library-search').focus({preventScroll:true});};
 screen.querySelector('#library-category').onchange=event=>{state.libraryCategory=event.target.value;rerender();screen.querySelector('#library-category').focus({preventScroll:true});};
 screen.querySelector('#library-upload').onclick=()=>{
  if(showcase)return;
  if(!canContribute(state))return openJoinPrompt(screen,openProfile);
  if(!demo)return notice('Library publishing and rewards will be available when the archive services are connected.');
  openContributionForm(screen,state,{rerender,notice});
 };
 const read=(id,button,comments=false)=>{if(showcase)return;const item=findLibraryItem(state,id);if(item)openLibraryReader(item,state,button,{demo,rerender,notice,openProfile,comments});};
 screen.querySelectorAll('[data-library-open]').forEach(button=>button.onclick=()=>read(button.dataset.libraryOpen,button));
 screen.querySelectorAll('[data-library-comments]').forEach(button=>button.onclick=()=>read(button.dataset.libraryComments,button,true));
 screen.querySelectorAll('[data-library-like]').forEach(button=>button.onclick=()=>{
  if(showcase)return;if(!canContribute(state))return read(button.dataset.libraryLike,button,true);
  try{toggleLibraryLike(state,button.dataset.libraryLike,{demo});const id=button.dataset.libraryLike;rerender();screen.querySelector(`[data-library-like="${CSS.escape(id)}"]`)?.focus({preventScroll:true});}catch(error){notice(error.message);}
 });
 // Uploaded images use short-lived blob URLs; revoke them when this view is replaced.
 const grid=screen.querySelector('.library-grid'),urls=[];
 for(const item of items){if(item.file&&/\.(jpe?g|png)$/i.test(item.file.name)){const image=new Image();image.alt=item.title;image.loading='lazy';const url=URL.createObjectURL(item.file);urls.push(url);image.src=url;image.onerror=()=>image.replaceWith(Object.assign(document.createElement('span'),{textContent:'Image preview unavailable'}));grid.querySelector(`[data-library-item="${CSS.escape(item.id)}"] .library-cover`).replaceChildren(image);}}
 if(urls.length){const observer=new MutationObserver(()=>{if(!grid.isConnected){urls.forEach(url=>URL.revokeObjectURL(url));observer.disconnect();}});observer.observe(screen,{childList:true});}
 screen.querySelectorAll('[data-library-approve]').forEach(button=>button.onclick=()=>{
  if(!demo||showcase)return;
  try{
   if(!approveDemoContribution(state,button.dataset.libraryApprove,{demo}))return;
   persist();
   rerender();
   const walletReady=securityComplete(state);
   showRewardCelebration({items:[{stage:'library',amount:libraryReward,label:'Cultural archive contribution'}],amount:libraryReward,accepted:true,walletReady,credited:walletReady},{demo,onContinue:walletReady?()=>screen.querySelector('#screen-title')?.focus({preventScroll:true}):setupWallet});
  }catch(error){notice(error.message);}
 });
}

function createDialog(title,opener){
 const dialog=document.createElement('dialog');dialog.className='library-dialog';dialog.setAttribute('aria-labelledby','library-dialog-title');
 dialog.innerHTML=`<div class="library-dialog-header"><h2 id="library-dialog-title">${title}</h2><button class="dialog-close" type="button" aria-label="Close Library dialog">×</button></div>`;
 dialog.querySelector('button').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{dialog.remove();if(opener?.isConnected)opener.focus({preventScroll:true});});document.body.append(dialog);return dialog;
}
function openJoinPrompt(screen,openProfile){
 const dialog=createDialog('Contribute to Library',screen.querySelector('#library-upload'));
 dialog.insertAdjacentHTML('beforeend',`<p>Everyone can browse the archive. Verify your New Tibet membership to upload information, and set up a wallet to receive ${libraryReward} $TIBET for each approved contribution.</p><button class="primary" id="library-join" type="button">Continue on Profile</button>`);
 dialog.querySelector('#library-join').onclick=()=>{dialog.close();openProfile();};dialog.showModal();
}
function openContributionForm(screen,state,{rerender}){
 const draft=state.libraryDraft||=blankDraft(),dialog=createDialog('Upload information',screen.querySelector('#library-upload'));let file=state.libraryFile||null,busy=false;
 dialog.insertAdjacentHTML('beforeend',`<p class="library-upload-reward">Earn <strong>${libraryReward} $TIBET</strong> when your contribution is approved.</p><form id="library-form"><label class="field"><span>Title</span><input name="title" minlength="6" maxlength="120" required value="${esc(draft.title)}" placeholder="What are you sharing?"/></label><div class="library-form-row"><label class="field"><span>Category</span><select name="category">${options(libraryCategories,draft.category)}</select></label><label class="field"><span>Language</span><select name="language">${options(libraryLanguages,draft.language)}</select></label></div><label class="field"><span>Description</span><textarea name="description" rows="3" minlength="20" maxlength="2000" required placeholder="Describe the material and why it matters.">${esc(draft.description)}</textarea></label><label class="field"><span>Credit / original source</span><input name="credit" minlength="3" maxlength="160" required value="${esc(draft.credit)}" placeholder="Author, collection or publisher"/></label><label class="library-file-label"><span>Attach a file</span><input id="library-file" type="file" accept=".pdf,.jpg,.jpeg,.png,.txt,.mp3,.mp4"/><small id="library-file-status">${file?esc(file.name):'PDF, JPG, PNG, TXT, MP3 or MP4 · Up to 25 MB'}</small></label><label class="field"><span>Or add a source URL</span><input name="source" type="url" maxlength="2000" value="${esc(draft.source)}" placeholder="https://"/></label><label class="checkbox"><input name="permission" type="checkbox" ${draft.permission?'checked':''} required/><span>I have permission to share this material and have credited its source.</span></label><p class="library-form-error" id="library-form-error" role="alert"></p><div class="actions"><button class="secondary" type="button" id="library-sample">Use sample information</button><button class="primary" type="submit">Submit for review</button></div><p class="section-note">Demo upload · Nothing is sent to a server. Files and contribution details clear on reload. Approval and rewards are simulated.</p></form>`);
 const form=dialog.querySelector('form'),error=dialog.querySelector('#library-form-error');
 const readDraft=()=>{for(const key of ['title','description','credit','source','category','language'])draft[key]=form.elements[key].value;draft.permission=form.elements.permission.checked;};
 form.oninput=readDraft;form.onchange=readDraft;
 dialog.querySelector('#library-file').onchange=event=>{file=event.target.files[0]||null;state.libraryFile=file;dialog.querySelector('#library-file-status').textContent=file?.name||'No file selected';};
 dialog.querySelector('#library-sample').onclick=()=>{
  Object.assign(draft,{title:'Losar family record · Fictional sample',description:'A fictional example showing how a family can preserve a record of its Losar celebrations. This sample illustrates an archive contribution; it is not a historical source.',credit:'Fictional New Tibet demo collection',source:'',category:'Heritage',language:'English',permission:true});
  for(const key of ['title','description','credit','source','category','language'])form.elements[key].value=draft[key];form.elements.permission.checked=true;
  file=new File([draft.title+'\n\n'+draft.description],'losar-family-record-demo.txt',{type:'text/plain'});state.libraryFile=file;dialog.querySelector('#library-file-status').textContent=file.name;error.textContent='';
 };
 form.onsubmit=async event=>{
  event.preventDefault();if(busy)return;busy=true;error.textContent='';const submit=form.querySelector('[type="submit"]');submit.disabled=true;readDraft();
  try{
   validateLibraryFile(file);
   const submittedFile=file,submittedDraft={...draft};
   const fingerprint=file?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),byte=>byte.toString(16).padStart(2,'0')).join(''):'';
   if(!dialog.isConnected||state.appTab!=='library')return;
   submitDemoContribution(state,submittedDraft,{demo:true,file:submittedFile,fingerprint});
   state.libraryDraft=blankDraft();state.libraryFile=null;dialog.close();rerender();screen.querySelector('.library-contributions')?.scrollIntoView({block:'center'});
  }catch(failure){error.textContent=failure.message;error.scrollIntoView({block:'nearest'});submit.disabled=false;}
  finally{busy=false;}
 };
 dialog.showModal();
}
