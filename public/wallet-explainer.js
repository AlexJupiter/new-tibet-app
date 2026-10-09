const icon=paths=>`<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const passkey=icon('<path d="M7 4H4v3m13-3h3v3M4 17v3h3m13-3v3h-3M9 9v2m6-2v2m-6 5c2 1 4 1 6 0m-3-7v4h1"/>');
const lock=icon('<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>');
const key=icon('<circle cx="8" cy="8" r="5"/><path d="m12 12 9 9m-5-5 3-3m-6 0 3-3"/>');
const ethereum=icon('<path d="m12 2 7 10-7 4-7-4Zm0 0v14m-7-4 7-3 7 3m-14 3 7 7 7-7-7 4Z"/>');

export function walletExplainerNotice(){
 return `<div class="wallet-how-note">${key}<div><strong>Passkeys and Ethereum</strong><p>Your keys stay private. $TIBET is designed for Ethereum.</p></div><button class="text-button" type="button" data-wallet-about aria-haspopup="dialog" aria-controls="wallet-about-dialog">See how it works</button></div>`;
}

export function walletExplainerDialog(){
 return `<dialog class="wallet-about-dialog" id="wallet-about-dialog" aria-labelledby="wallet-about-title"><div class="wallet-about-header"><h2 id="wallet-about-title">How your wallet works</h2><button class="dialog-close" id="close-wallet-about" type="button" aria-label="Close wallet explanation">×</button></div><p class="wallet-about-intro">Unlock with a passkey. Keep your wallet keys private. Hold $TIBET on Ethereum.</p>
 <figure class="wallet-flow" aria-labelledby="wallet-flow-caption"><section class="wallet-flow-device" aria-label="On your device"><p class="wallet-flow-boundary">On your device</p><ol class="wallet-flow-steps">
 <li><span class="wallet-flow-icon">${passkey}</span><div><strong>1. Unlock your passkey</strong><p>Use Face ID, a fingerprint or your device PIN.</p></div></li>
 <li><span class="wallet-flow-icon">${lock}</span><div><strong>2. Derive an encryption key</strong><p>A supported passkey creates a secret key locally.</p></div></li>
 <li><span class="wallet-flow-icon">${key}</span><div><strong>3. Unlock your wallet keys</strong><p>Decrypt your wallet backup. The private key signs transfers; the public address identifies your wallet.</p></div></li>
 </ol></section><div class="wallet-flow-link" aria-hidden="true"><span>↓</span>Your address + signed transfers</div><div class="wallet-flow-chain"><span class="wallet-flow-icon">${ethereum}</span><div><strong>4. $TIBET on Ethereum</strong><p>The token contract records the balance at your wallet address.</p></div></div><figcaption id="wallet-flow-caption">Your keys control access. Your tokens are recorded on the blockchain.</figcaption></figure>
 <p class="wallet-about-status"><strong>Planned Ethereum integration.</strong> No $TIBET contract or real transfers are connected yet. Any demo balances and transactions are simulated.</p>
 <details class="wallet-about-details"><summary>Privacy and recovery</summary><p>Biometrics stay on your device. The encryption key and decrypted wallet keys are not sent to New Tibet. Ethereum addresses, balances and transfers are public.</p><p>A synced passkey can make access easier to recover, but recovery also needs the encrypted wallet backup and depends on your passkey provider. This demo keeps wallet material only in page memory; reloading clears it.</p><p>You can choose 12 recovery words instead during wallet security setup on Profile. Keep them private: anyone with those words can control the wallet.</p></details>
 <details class="wallet-about-details"><summary>The cryptography</summary><p>A passkey’s authentication key is separate from the Ethereum signing key. On supported devices, the WebAuthn PRF extension derives a 32-byte secret. The app uses it as an AES-GCM key to encrypt a randomly generated wallet seed. That seed derives the Ethereum signing key and public address.</p><p><a href="https://github.com/w3c/webauthn/blob/main/explainers/prf-extension.md" target="_blank" rel="noopener noreferrer">Passkey encryption standard ↗</a> · <a href="https://ethereum.org/developers/docs/accounts/" target="_blank" rel="noopener noreferrer">Ethereum keys and accounts ↗</a></p></details></dialog>`;
}

export function bindWalletExplainer(screen){
 const dialog=screen.querySelector('#wallet-about-dialog');
 let opener;
 screen.querySelectorAll('[data-wallet-about]').forEach(button=>button.onclick=()=>{opener=button;dialog.showModal();});
 dialog.addEventListener('close',()=>{if(opener?.isConnected)opener.focus({preventScroll:true});});
 screen.querySelector('#close-wallet-about')?.addEventListener('click',()=>dialog.close());
}
