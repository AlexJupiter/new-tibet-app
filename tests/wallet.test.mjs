import test from 'node:test';
import assert from 'node:assert/strict';
import {mnemonicToAccount} from 'viem/accounts';
import {createRecoveryWallet,createPasskeyWallet,unlockPasskeyWallet,publicCredentialExtensions} from '../frontend/wallet-sdk.js';

test('recovery wallet uses twelve fresh BIP-39 words and derives the same Ethereum account on recovery',()=>{
 const first=createRecoveryWallet(),second=createRecoveryWallet();
 assert.equal(first.words.length,12);
 assert.match(first.address,/^0x[0-9a-fA-F]{40}$/);
 assert.equal(mnemonicToAccount(first.words.join(' ')).address,first.address);
 assert.notEqual(first.address,second.address);
 assert.equal(first.ready,false);
});

test('passkey PRF seals the wallet locally and rejects a different key or tampered ciphertext',async()=>{
 const prf=crypto.getRandomValues(new Uint8Array(32));
 const wallet=await createPasskeyWallet(prf);
 assert.equal(wallet.words,undefined);
 assert.equal(await unlockPasskeyWallet(wallet.sealed,prf),wallet.address);
 await assert.rejects(unlockPasskeyWallet(wallet.sealed,crypto.getRandomValues(new Uint8Array(32))));
 const bytes=Uint8Array.from(atob(wallet.sealed.ciphertext),char=>char.charCodeAt(0));bytes[0]^=1;
 await assert.rejects(unlockPasskeyWallet({...wallet.sealed,ciphertext:btoa(String.fromCharCode(...bytes))},prf));
 await assert.rejects(createPasskeyWallet(undefined));
});

test('server credential extensions contain capability flags without wallet encryption outputs',()=>{
 const result=publicCredentialExtensions({credProps:{rk:true},prf:{enabled:true,results:{first:new Uint8Array(32).fill(9)}}});
 assert.deepEqual(result,{credProps:{rk:true},prf:{enabled:true}});
 assert.doesNotMatch(JSON.stringify(result),/results|first/);
});
