import './build-passport.mjs';
import './build-wallet.mjs';
import './build-card.mjs';
import {mkdir,cp,rm,readFile,writeFile} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist');await cp('public','dist',{recursive:true});
// Keep branch-based Pages compatible if a repository administrator selects it.
const home=await readFile('public/index.html','utf8');
await writeFile('index.html',home.replace(/(href|src)="\.\/(favicon\.svg|fonts\.css|styles\.css|config\.js|app\.js|assets\/[^\"]+)"/g,'$1="./public/$2"'));
const verification=await readFile('public/verify.html','utf8');
await writeFile('verify.html',verification.replace(/(href|src)="\.\/(favicon\.svg|fonts\.css|styles\.css|config\.js|verify\.js|assets\/[^\"]+)"/g,'$1="./public/$2"'));
const developers=await readFile('public/developers.html','utf8');
await writeFile('developers.html',developers.replace(/(href|src)="\.\/(favicon\.svg|fonts\.css|developers\.css|developers\.js|assets\/[^\"]+)"/g,'$1="./public/$2"'));
console.log('Static GitHub Pages app built in dist/; repository-root fallback synchronized.');
