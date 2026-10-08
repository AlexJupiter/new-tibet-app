import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
await build({entryPoints:['frontend/card-qr.js'],bundle:true,format:'esm',platform:'browser',minify:true,outfile:'public/card-qr.js',legalComments:'external'});
await writeFile('public/card-qr.js.LEGAL.txt',await readFile('node_modules/qrcode/license'));
