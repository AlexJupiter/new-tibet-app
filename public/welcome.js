const slides=[
 {tab:'profile',title:'Your digital ID',description:'A New Tibet membership card, with a QR code for in-person checks.'},
 {tab:'wallet',title:'Your $TIBET wallet',description:'Hold, send and swap New Tibet Coin.'},
 {tab:'chat',title:'Community chat',description:'A preview of the planned Bluetooth mesh messenger.'},
 {tab:'petitions',title:'Community petitions',description:'Read proposals and results. Verified Green Book members can create and support petitions.'},
 {tab:'ecosystem',title:'Explore the ecosystem',description:'See examples of how New Tibet ID could connect with other Tibetan services.'},
 {tab:'announcements',title:'Updates in the app',description:'Application decisions and New Tibet announcements in one channel.'}
];
const arrow=direction=>`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${direction==='left'?'m15 5-7 7 7 7':'m9 5 7 7-7 7'}"/></svg>`;

export function mountWelcomeSlideshow(root){
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 let index=0,active=true,paused=reducedMotion.matches,hovered=false,timer,visible=true,pointerStart;
 root.innerHTML=`<div class="welcome-phone"><div class="welcome-phone-screen">${slides.map((slide,i)=>`<div class="welcome-slide" role="group" aria-roledescription="slide" aria-label="${i+1} of ${slides.length}: ${slide.title}" ${i?'hidden':''}><iframe title="${slide.title} · read-only sample app screen" data-showcase="${slide.tab}" tabindex="-1" aria-hidden="true" inert></iframe></div>`).join('')}</div></div><div class="welcome-slide-caption"><h2 id="welcome-slide-title">${slides[0].title}</h2><p id="welcome-slide-description">${slides[0].description}</p><span>Sample app screens</span></div><div class="welcome-slide-controls"><button type="button" id="welcome-previous" aria-label="Previous app screen">${arrow('left')}</button><div class="welcome-slide-dots" role="group" aria-label="Choose an app screen">${slides.map((slide,i)=>`<button type="button" data-welcome-slide="${i}" aria-label="Show ${slide.title}" ${i===0?'aria-current="true"':''}><span></span></button>`).join('')}</div><button type="button" id="welcome-next" aria-label="Next app screen">${arrow('right')}</button><button type="button" id="welcome-pause" aria-label="Pause slideshow"><span aria-hidden="true">Ⅱ</span></button></div><p class="sr-only" id="welcome-slide-status" role="status"></p>`;
 const screen=root.querySelector('.welcome-phone-screen'),frames=[...root.querySelectorAll('iframe')],panels=[...root.querySelectorAll('.welcome-slide')];
 const resize=()=>screen.style.setProperty('--preview-scale',String(screen.clientWidth/390));
 new ResizeObserver(resize).observe(screen);resize();
 const load=i=>{
  if(frames[i].hasAttribute('src'))return;
  const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('showcase',slides[i].tab);frames[i].src=url.href;
 };
 const rotation=()=>{
  clearTimeout(timer);
  const playing=active&&visible&&!document.hidden&&!paused&&!hovered;
  root.querySelector('#welcome-pause').setAttribute('aria-label',paused?'Play slideshow':'Pause slideshow');
  root.querySelector('#welcome-pause span').textContent=paused?'▷':'Ⅱ';
  if(playing)timer=setTimeout(()=>show(index+1),5500);
 };
 const show=(next,manual=false)=>{
  index=(next+slides.length)%slides.length;load(index);load((index+1)%slides.length);
  panels.forEach((panel,i)=>panel.hidden=i!==index);
  root.querySelector('#welcome-slide-title').textContent=slides[index].title;
  root.querySelector('#welcome-slide-description').textContent=slides[index].description;
  root.querySelectorAll('[data-welcome-slide]').forEach((button,i)=>{if(i===index)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');});
  if(manual){paused=true;root.querySelector('#welcome-slide-status').textContent=`${index+1} of ${slides.length}: ${slides[index].title}`;}
  rotation();
 };
 root.querySelector('#welcome-previous').onclick=()=>show(index-1,true);
 root.querySelector('#welcome-next').onclick=()=>show(index+1,true);
 root.querySelectorAll('[data-welcome-slide]').forEach(button=>button.onclick=()=>show(Number(button.dataset.welcomeSlide),true));
 root.querySelector('#welcome-pause').onclick=()=>{paused=!paused;rotation();};
 root.onkeydown=event=>{let next;if(event.key==='ArrowLeft')next=index-1;if(event.key==='ArrowRight')next=index+1;if(event.key==='Home')next=0;if(event.key==='End')next=slides.length-1;if(next!==undefined){event.preventDefault();show(next,true);}};
 root.addEventListener('focusin',event=>{if(event.target.closest('#welcome-pause')){clearTimeout(timer);return;}paused=true;rotation();});
 root.addEventListener('mouseenter',()=>{if(matchMedia('(hover: hover)').matches){hovered=true;rotation();}});root.addEventListener('mouseleave',()=>{hovered=false;rotation();});
 screen.addEventListener('pointerdown',event=>{pointerStart={x:event.clientX,y:event.clientY};});
 screen.addEventListener('pointerup',event=>{if(!pointerStart)return;const x=event.clientX-pointerStart.x,y=event.clientY-pointerStart.y;pointerStart=null;if(Math.abs(x)>40&&Math.abs(x)>Math.abs(y))show(index+(x<0?1:-1),true);});
 screen.addEventListener('pointercancel',()=>{pointerStart=null;});
 document.addEventListener('visibilitychange',rotation);
 reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)paused=true;rotation();});
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;rotation();},{threshold:.15}).observe(root);
 show(0);
 return {setActive(value){active=value;rotation();}};
}
