import {build} from 'esbuild';
await build({entryPoints:['frontend/wallet-sdk.js'],bundle:true,format:'esm',platform:'browser',minify:true,outfile:'public/wallet-sdk.js',legalComments:'external'});
