import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist/build/pdf.mjs';

GlobalWorkerOptions.workerSrc=new URL('./pdf-worker.js',import.meta.url).href;

export function loadLibraryPdf(source){
 const assets=new URL('./assets/pdfjs/',import.meta.url);
 return getDocument({...(typeof source==='string'?{url:source}:{data:source}),cMapUrl:new URL('cmaps/',assets).href,cMapPacked:true,standardFontDataUrl:new URL('standard_fonts/',assets).href,wasmUrl:new URL('wasm/',assets).href,useWasm:false,isEvalSupported:false,enableXfa:false,disableAutoFetch:true,disableStream:true});
}
