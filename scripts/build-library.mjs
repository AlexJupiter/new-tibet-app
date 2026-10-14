import {build} from 'esbuild';
import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';

await build({entryPoints:['frontend/library-pdf.js'],bundle:true,format:'esm',platform:'browser',minify:true,outfile:'public/library-pdf.js',legalComments:'external'});
await cp('node_modules/pdfjs-dist/build/pdf.worker.min.mjs','public/pdf-worker.js');
await mkdir('public/assets/pdfjs',{recursive:true});
for(const directory of ['cmaps','standard_fonts','wasm'])await cp('node_modules/pdfjs-dist/'+directory,'public/assets/pdfjs/'+directory,{recursive:true});
await writeFile('public/library-pdf.js.LEGAL.txt',await readFile('node_modules/pdfjs-dist/LICENSE'));
