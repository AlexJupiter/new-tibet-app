const contents=document.querySelector('.docs-contents');
const mobile=matchMedia('(max-width: 959px)');
function syncContents(){contents.open=!mobile.matches;}
syncContents();mobile.addEventListener('change',syncContents);
const links=[...contents.querySelectorAll('a')];
links.forEach(link=>link.addEventListener('click',()=>{if(mobile.matches)contents.open=false;}));
const observer=new IntersectionObserver(entries=>{
 const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];
 if(!visible)return;
 links.forEach(link=>{if(link.hash==='#'+visible.target.id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
},{rootMargin:'-112px 0px -65% 0px'});
document.querySelectorAll('.docs-section').forEach(section=>observer.observe(section));

const status=document.querySelector('#docs-copy-status');
await Promise.allSettled([...document.querySelectorAll('[data-code-file]')].map(async code=>{
 try{
  const response=await fetch(new URL('./assets/integration/'+code.dataset.codeFile,import.meta.url));
  if(!response.ok)throw new Error('Example unavailable');
  code.textContent=(await response.text()).trimEnd();
  const button=document.querySelector(`[data-copy="${code.id}"]`);button.hidden=false;
  button.addEventListener('click',async()=>{
   try{
    await navigator.clipboard.writeText(code.textContent);
    button.textContent='Copied';status.textContent='Example copied to clipboard.';
    setTimeout(()=>{button.textContent='Copy';},2000);
   }catch{
    const selection=getSelection(),range=document.createRange();range.selectNodeContents(code);selection.removeAllRanges();selection.addRange(range);
    code.parentElement.focus();status.textContent='Example selected. Use your device’s copy command.';
   }
  });
 }catch{code.textContent='The example could not be loaded. Use the download link or reload the page.';}
}));
