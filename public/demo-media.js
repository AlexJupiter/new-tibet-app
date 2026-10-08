// Photorealistic, fictional sample booklets. Never use these as identity evidence.
import {loadImage} from './images.js';
async function sampleFile(path,type){
 // Revalidate the asset, then retry without the cached response. A Pages
 // deployment or stale browser cache must never be passed to an image decoder.
 for(let attempt=0;attempt<2;attempt++){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
   const response=await fetch(new URL(path,import.meta.url),{cache:attempt?'reload':'no-cache',signal:controller.signal});
   if(!response.ok)throw new Error('Sample unavailable.');
   const bytes=new Uint8Array(await response.arrayBuffer());
   const valid=type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[bytes.length-2]===255&&bytes[bytes.length-1]===217:bytes.length>12&&String.fromCharCode(...bytes.slice(4,8))==='ftyp';
   if(!valid||bytes.length>8*1024*1024)throw new Error('Invalid sample response.');
   return new Blob([bytes],{type});
  }catch{if(attempt===1)throw new Error('Unable to load the sample '+(type==='image/jpeg'?'photos':'video')+'. Check your connection and tap Upload sample again.');}
  finally{clearTimeout(timer);}
 }
}
export async function samplePhoto(book,kind,code){
 if(!['green','blue'].includes(book)||!['front','back','identity','challenge'].includes(kind))throw new Error('This sample is not available.');
 const blob=await sampleFile(`./assets/demo/${book}-${kind}.jpg`,'image/jpeg');
 const url=URL.createObjectURL(blob);
 try{
 const image=await loadImage(url);
 const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=900;
 const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,1200,900);
 if(kind==='challenge'){
  await document.fonts.load('500 54px "IBM Plex Mono"').catch(()=>{});
  // The changing challenge is rendered on the blank paper card in the sample photo.
  ctx.fillStyle='#23304a';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='500 54px "IBM Plex Mono", monospace';ctx.fillText(String(code),book==='blue'?996:1020,495);
 }
 return canvas.toDataURL('image/jpeg',.84);
 }finally{URL.revokeObjectURL(url);}
}
export async function sampleVideo(book='green'){
 if(!['green','blue'].includes(book))throw new Error('This sample video is unavailable.');
 return sampleFile(book==='blue'?'./assets/demo/sample-video-blue.mp4':'./assets/demo/sample-video.mp4','video/mp4');
}
