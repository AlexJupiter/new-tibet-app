// Photorealistic, fictional sample booklets. Never use these as identity evidence.
export async function samplePhoto(book,kind,code){
 if(!['green','blue'].includes(book)||!['front','back','identity','challenge'].includes(kind))throw new Error('This sample is not available.');
 const image=new Image();
 image.src=new URL(`./assets/demo/${book}-${kind}.jpg`,import.meta.url).href;
 await image.decode();
 const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=900;
 const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,1200,900);
 if(kind==='challenge'){
  // The changing challenge is rendered on the blank paper card in the sample photo.
  ctx.fillStyle='#23304a';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='500 54px "IBM Plex Mono", monospace';ctx.fillText(String(code),1020,495);
 }
 return canvas.toDataURL('image/jpeg',.84);
}
export async function sampleVideo(){
 const response=await fetch(new URL('./assets/demo/sample-video.mp4',import.meta.url));
 if(!response.ok)throw new Error('Unable to load the sample video. Please try again.');
 return new Blob([await response.arrayBuffer()],{type:'video/mp4'});
}
