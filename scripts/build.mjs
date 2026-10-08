import './build-passport.mjs';
import './build-wallet.mjs';
import {mkdir,cp,rm,readFile,writeFile} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist');await cp('public','dist',{recursive:true});
// Keep branch-based Pages compatible if a repository administrator selects it.
const home=await readFile('public/index.html','utf8');
await writeFile('index.html',home.replace(/(href|src)="\.\/(favicon\.svg|fonts\.css|styles\.css|config\.js|app\.js|assets\/[^\"]+)"/g,'$1="./public/$2"'));
console.log('Static GitHub Pages app built in dist/; repository-root fallback synchronized.');
