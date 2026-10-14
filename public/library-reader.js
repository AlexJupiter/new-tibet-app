import {librarySocial,toggleLibraryLike,addLibraryComment,canContribute} from './library-model.js';
import {esc,uploaderMarkup,likeMarkup,commentIcon} from './library-ui.js';

export function openLibraryReader(item,state,opener,{demo,rerender,notice,openProfile,comments=false}){
 const dialog=document.createElement('dialog');dialog.className='library-reader-dialog';dialog.setAttribute('aria-labelledby','library-reader-title');
 dialog.innerHTML=`<header class="library-reader-header"><div><span>${esc(item.category)} · ${esc(item.language)}</span><h2 id="library-reader-title">${esc(item.title)}</h2></div><button class="dialog-close" type="button" aria-label="Close document reader">×</button></header><div class="library-reader-body"><section class="library-document" aria-label="Document reader"><div class="library-reader-tools" hidden><div class="library-page-controls"><button type="button" data-pdf-previous aria-label="Previous page">‹</button><label><span class="sr-only">Page number</span><input type="number" min="1" value="1" inputmode="numeric" data-pdf-page/></label><span data-pdf-total></span><button type="button" data-pdf-next aria-label="Next page">›</button></div><div class="library-zoom-controls"><button type="button" data-pdf-zoom-out aria-label="Zoom out">−</button><button type="button" data-pdf-fit>Fit</button><button type="button" data-pdf-zoom-in aria-label="Zoom in">+</button><button type="button" data-pdf-text aria-pressed="false">Text</button></div></div><div class="library-document-stage" tabindex="0"><p class="library-document-status" role="status">Opening document…</p><div class="library-page-surface" hidden><canvas role="img"></canvas><pre class="library-page-text" hidden tabindex="0"></pre></div></div><p class="library-reader-page-note" hidden>Text view uses the document’s embedded text or OCR, which may contain errors.</p></section><aside class="library-reader-details"><section class="library-document-info">${uploaderMarkup(item.uploader)}<p>${esc(item.description)}</p><dl><dt>Original author / publisher</dt><dd>${esc(item.credit)}</dd>${item.edition?`<dt>Edition</dt><dd>${esc(item.edition)}</dd>`:''}${item.pages?`<dt>Document</dt><dd>${item.pages.toLocaleString()} pages · Complete PDF</dd>`:''}${item.rights?`<dt>Rights / provenance</dt><dd>${esc(item.rights)}</dd>`:''}</dl><div class="library-document-links">${item.source?`<a href="${esc(item.source)}" target="_blank" rel="noopener noreferrer">Original source ↗</a>`:''}${item.document||item.file?'<a id="library-reader-download" download>Download file ↓</a>':''}</div></section><section class="library-community" aria-labelledby="library-comments-title"></section></aside></div>`;
 document.body.append(dialog);
 const stage=dialog.querySelector('.library-document-stage'),status=dialog.querySelector('.library-document-status'),surface=dialog.querySelector('.library-page-surface'),community=dialog.querySelector('.library-community');
 let disposed=false,loadingTask,pdf,renderTask,observer,resizeTimer,blobURL,changed=false,commentDraft='',pageNumber=item.startPage||1,zoom=1,textMode=false,version=0;
 const fail=message=>{if(disposed)return;status.hidden=false;status.textContent=message;surface.hidden=true;};
 const close=()=>dialog.close();dialog.querySelector('.dialog-close').onclick=close;
 dialog.addEventListener('close',()=>{
  disposed=true;version++;clearTimeout(resizeTimer);observer?.disconnect();renderTask?.cancel();loadingTask?.destroy().catch(()=>{});if(blobURL)URL.revokeObjectURL(blobURL);dialog.remove();
  if(changed){rerender();const replacement=document.querySelector(`[data-library-open="${CSS.escape(item.id)}"]`);replacement?.focus({preventScroll:true});}else if(opener?.isConnected)opener.focus({preventScroll:true});
 },{once:true});
 const renderCommunity=()=>{
  const social=librarySocial(state,item),allowed=canContribute(state);
  community.innerHTML=`<div class="library-community-heading">${likeMarkup(item,social)}<h3 id="library-comments-title">${commentIcon} Comments <span>${social.comments.length}</span></h3></div><p class="section-note">Demo activity · Likes and comments stay in this browser session.</p><ol class="library-comment-list">${social.comments.map(comment=>`<li><div class="library-comment-author"><strong>${esc(comment.author)}</strong><span>${comment.sample?'Sample curator note':'Just now · Demo'}</span></div><p>${esc(comment.body)}</p></li>`).join('')||'<li class="library-no-comments">Start a conversation about this document.</li>'}</ol>${allowed?`<form class="library-comment-form"><label for="library-comment-input">Add a comment</label><textarea id="library-comment-input" name="comment" rows="3" maxlength="1500" required placeholder="Share a thought or useful context…"></textarea><p class="library-comment-error" role="alert"></p><button class="primary compact" type="submit">Post comment</button></form>`:'<p>Verified members can like and comment.</p><button class="secondary" data-library-community-join type="button">Verify on Profile</button>'}`;
  community.querySelector('[data-library-like]').onclick=()=>{
   if(!allowed){community.querySelector('[data-library-community-join]').focus({preventScroll:true});return;}
   try{toggleLibraryLike(state,item.id,{demo});changed=true;renderCommunity();community.querySelector('[data-library-like]').focus({preventScroll:true});}catch(error){notice(error.message);}
  };
  community.querySelector('[data-library-community-join]')?.addEventListener('click',()=>{close();openProfile();});
  const form=community.querySelector('form');if(form){form.elements.comment.value=commentDraft;form.elements.comment.oninput=event=>commentDraft=event.target.value;form.onsubmit=event=>{
   event.preventDefault();try{addLibraryComment(state,item.id,form.elements.comment.value,{demo});changed=true;commentDraft='';renderCommunity();community.querySelector('.library-comment-list li:last-child').scrollIntoView({block:'nearest'});community.querySelector('textarea').focus({preventScroll:true});}
   catch(error){form.querySelector('[role="alert"]').textContent=error.message;}
  };}
 };
 renderCommunity();dialog.showModal();
 if(comments)requestAnimationFrame(()=>{community.scrollIntoView({block:'start'});community.querySelector('textarea,[data-library-community-join]')?.focus({preventScroll:true});});
 const download=dialog.querySelector('#library-reader-download');
 if(item.file){blobURL=URL.createObjectURL(item.file);if(download){download.href=blobURL;download.download=item.file.name;}}
 else if(download){download.href=new URL(item.document,import.meta.url).href;download.download=item.id+'.pdf';}

 const renderPage=async()=>{
  if(disposed||!pdf)return;const current=++version;renderTask?.cancel();
  dialog.querySelector('[data-pdf-page]').value=pageNumber;dialog.querySelector('[data-pdf-total]').textContent='/ '+pdf.numPages;
  dialog.querySelector('[data-pdf-previous]').disabled=pageNumber<=1;dialog.querySelector('[data-pdf-next]').disabled=pageNumber>=pdf.numPages;
  dialog.querySelector('[data-pdf-zoom-out]').disabled=zoom<=1;dialog.querySelector('[data-pdf-zoom-in]').disabled=zoom>=3;
  stage.setAttribute('aria-busy','true');status.hidden=false;status.textContent='Loading page '+pageNumber+'…';
  try{
   const page=await pdf.getPage(pageNumber);if(disposed||current!==version)return;
   const viewport=page.getViewport({scale:1}),width=Math.max(180,stage.clientWidth-24),scale=width/viewport.width*zoom,view=page.getViewport({scale});
   const canvas=surface.querySelector('canvas'),density=Math.min(devicePixelRatio||1,2,Math.sqrt(6000000/(view.width*view.height)));
   const temporary=document.createElement('canvas');temporary.width=Math.floor(view.width*density);temporary.height=Math.floor(view.height*density);
   renderTask=page.render({canvasContext:temporary.getContext('2d'),viewport:view,transform:density!==1?[density,0,0,density,0,0]:null});await renderTask.promise;
   if(disposed||current!==version)return;
   canvas.width=temporary.width;canvas.height=temporary.height;canvas.style.width=view.width+'px';canvas.style.height=view.height+'px';canvas.getContext('2d').drawImage(temporary,0,0);canvas.setAttribute('aria-label',`${item.title}, page ${pageNumber} of ${pdf.numPages}`);
   const content=await page.getTextContent();if(disposed||current!==version)return;
   const text=surface.querySelector('pre');text.textContent=content.items.map(part=>part.str+(part.hasEOL?'\n':' ')).join('')||'No embedded text is available for this scanned page. Read the original page image.';
   canvas.hidden=textMode;text.hidden=!textMode;surface.hidden=false;status.hidden=true;stage.setAttribute('aria-busy','false');
  }catch(error){if(disposed||current!==version||error.name==='RenderingCancelledException')return;stage.setAttribute('aria-busy','false');fail('This page could not be displayed. Try another page or download the original file.');}
 };
 const setPage=value=>{if(!pdf)return;const next=Number(value);if(!Number.isInteger(next)||next<1||next>pdf.numPages){dialog.querySelector('[data-pdf-page]').value=pageNumber;return;}pageNumber=next;stage.scrollTop=0;stage.scrollLeft=0;renderPage();};
 dialog.querySelector('[data-pdf-previous]').onclick=()=>setPage(pageNumber-1);dialog.querySelector('[data-pdf-next]').onclick=()=>setPage(pageNumber+1);
 dialog.querySelector('[data-pdf-page]').onchange=event=>setPage(event.target.value);
 dialog.querySelector('[data-pdf-zoom-in]').onclick=()=>{zoom=Math.min(3,zoom+.5);renderPage();};dialog.querySelector('[data-pdf-zoom-out]').onclick=()=>{zoom=Math.max(1,zoom-.5);renderPage();};dialog.querySelector('[data-pdf-fit]').onclick=()=>{zoom=1;stage.scrollLeft=0;renderPage();};
 dialog.querySelector('[data-pdf-text]').onclick=event=>{textMode=!textMode;event.currentTarget.setAttribute('aria-pressed',String(textMode));surface.querySelector('canvas').hidden=textMode;surface.querySelector('pre').hidden=!textMode;dialog.querySelector('.library-reader-page-note').hidden=!textMode;};
 stage.onkeydown=event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();setPage(pageNumber+(event.key==='ArrowRight'?1:-1));}};
 (async()=>{
  try{
   const extension=item.file?.name.split('.').at(-1).toLowerCase();
   if(!item.document&&extension!=='pdf'){
    if(!item.file)return fail('This contribution has a source link, but no document attached for in-app reading.');
    surface.hidden=false;status.hidden=true;surface.innerHTML='';
    if(extension==='txt'){const text=await item.file.slice(0,1024*1024).text();if(disposed)return;const pre=document.createElement('pre');pre.className='library-page-text library-uploaded-text';pre.textContent=text;surface.append(pre);if(item.file.size>1024*1024){status.hidden=false;status.textContent='Showing the first 1 MB. Download the file to read the remainder.';}}
    else if(['jpg','jpeg','png'].includes(extension)){const image=new Image();image.alt=item.title;image.src=blobURL;image.onerror=()=>fail('This image could not be decoded. Choose a valid JPG or PNG file.');surface.append(image);}
    else{const media=document.createElement(extension==='mp3'?'audio':'video');media.controls=true;media.setAttribute('playsinline','');media.src=blobURL;media.onerror=()=>fail('This media file could not be played in this browser. You can download the original.');surface.append(media);}
    return;
   }
   const {loadLibraryPdf}=await import('./library-pdf.js');if(disposed)return;
   const source=item.document?new URL(item.document,import.meta.url).href:new Uint8Array(await item.file.arrayBuffer());if(disposed)return;
   loadingTask=loadLibraryPdf(source);pdf=await loadingTask.promise;if(disposed)return;
   pageNumber=Math.min(pageNumber,pdf.numPages);dialog.querySelector('[data-pdf-page]').max=pdf.numPages;dialog.querySelector('.library-reader-tools').hidden=false;await renderPage();if(disposed)return;
   let lastWidth=stage.clientWidth;observer=new ResizeObserver(()=>{if(stage.clientWidth===lastWidth)return;lastWidth=stage.clientWidth;clearTimeout(resizeTimer);resizeTimer=setTimeout(renderPage,150);});observer.observe(stage);
  }catch(error){if(!disposed)fail('We could not open this document. Download the file to read it, or try again.');}
 })();
}
