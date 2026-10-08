import {english,generateMnemonic,mnemonicToAccount} from 'viem/accounts';

const context=new TextEncoder().encode('new-tibet-ethereum-wallet-demo-v1');
const encode=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes)));
const decode=text=>Uint8Array.from(atob(text),char=>char.charCodeAt(0));

export function createRecoveryWallet(){
 const phrase=generateMnemonic(english,128);
 const address=mnemonicToAccount(phrase).address;
 return {address,words:phrase.split(' '),method:'recovery-phrase',ready:false};
}

export async function createPasskeyWallet(prf){
 if(!prf||new Uint8Array(prf).byteLength!==32)throw new Error('This passkey cannot protect a wallet. Choose the 12-word option instead.');
 const {address,words}=createRecoveryWallet();
 const key=await crypto.subtle.importKey('raw',prf,'AES-GCM',false,['encrypt']);
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const bytes=new TextEncoder().encode(words.join(' '));
 try{
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:context},key,bytes);
  return {address,method:'passkey',ready:true,sealed:{iv:encode(iv),ciphertext:encode(ciphertext)}};
 }finally{bytes.fill(0);words.fill('');}
}

export async function unlockPasskeyWallet(sealed,prf){
 const key=await crypto.subtle.importKey('raw',prf,'AES-GCM',false,['decrypt']);
 const bytes=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(sealed.iv),additionalData:context},key,decode(sealed.ciphertext)));
 try{return mnemonicToAccount(new TextDecoder().decode(bytes)).address;}
 finally{bytes.fill(0);}
}

// The PRF output is a local encryption key and must never enter a server payload.
export function publicCredentialExtensions(extensions){
 const {prf,...rest}=extensions||{};
 return {...rest,...(prf?{prf:{enabled:Boolean(prf.enabled)}}:{})};
}
