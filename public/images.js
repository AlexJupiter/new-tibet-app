// Wait for the image load event. Some WebKit versions reject decode() even
// when the same image can be displayed and drawn on a canvas.
export function loadImage(source){
 return new Promise((resolve,reject)=>{
  const image=new Image();
  const timer=setTimeout(()=>finish(new Error('The image took too long to load. Please try again.')),20000);
  function finish(error){clearTimeout(timer);image.onload=null;image.onerror=null;error?reject(error):resolve(image);}
  image.onload=()=>finish(image.naturalWidth&&image.naturalHeight?null:new Error('This photo could not be opened. Please choose another image.'));
  image.onerror=()=>finish(new Error('This photo could not be opened. Please choose another image.'));
  image.src=source;
 });
}
