// Synthetic placeholders for presentations. These are not identity documents or evidence.
export function samplePhoto(book,kind,code){
 const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=900;
 const ctx=canvas.getContext('2d');
 const title={front:'Front cover',back:'Back cover',identity:'Identity page',challenge:'Verification code'}[kind];
 ctx.fillStyle='#f5f5f7';ctx.fillRect(0,0,1200,900);
 ctx.fillStyle='#1b2a5b';ctx.font='500 28px sans-serif';ctx.textAlign='center';
 ctx.fillText('NEW TIBET · DEMO SAMPLE',600,65);
 const left=kind==='challenge'?100:250,width=kind==='challenge'?560:700;
 ctx.fillStyle=book==='green'?'#315f4b':'#1b2a5b';ctx.fillRect(left,115,width,620);
 ctx.strokeStyle='#ffffff50';ctx.lineWidth=2;ctx.strokeRect(left+24,139,width-48,572);
 ctx.fillStyle='#fff';ctx.font='600 42px sans-serif';
 ctx.fillText(book==='green'?'GREEN BOOK':'BLUE BOOK',left+width/2,235);
 ctx.font='30px sans-serif';ctx.fillText(title,left+width/2,300);
 if(kind==='identity'){
  ctx.fillStyle='#ffffff20';ctx.fillRect(left+60,355,150,185);
  ctx.fillStyle='#fff';ctx.font='500 46px sans-serif';ctx.fillText('TD',left+135,465);
  ctx.textAlign='left';ctx.font='30px sans-serif';ctx.fillText('DEMO APPLICANT',left+250,410);
  ctx.font='24px sans-serif';ctx.fillText('Sample page',left+250,465);ctx.textAlign='center';
 }
 ctx.fillStyle='#fff';ctx.font='24px sans-serif';ctx.fillText('SAMPLE · NOT A VALID DOCUMENT',left+width/2,665);
 if(kind==='challenge'){
  ctx.fillStyle='#fff';ctx.fillRect(705,290,395,245);
  ctx.fillStyle='#6e6e73';ctx.font='24px sans-serif';ctx.fillText('VERIFICATION CODE',902,355);
  ctx.fillStyle='#1b2a5b';ctx.font='600 64px monospace';ctx.fillText(code,902,455);
 }
 ctx.fillStyle='#6e6e73';ctx.font='24px sans-serif';ctx.fillText('For interface demonstrations only',600,820);
 return canvas.toDataURL('image/jpeg',.85);
}
export async function sampleVideo(){
 const response=await fetch(new URL('./assets/demo/sample-video.mp4',import.meta.url));
 if(!response.ok)throw new Error('Unable to load the sample video. Please try again.');
 return new Blob([await response.arrayBuffer()],{type:'video/mp4'});
}
