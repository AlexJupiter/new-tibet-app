const arrow='<path d="M0 0h35m-7-6 7 6-7 6" fill="none" stroke="#a2a9b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
export function passportDiagram(){
 return `<figure class="explainer" aria-labelledby="passport-diagram-caption">
 <svg viewBox="0 0 440 155" role="img" aria-label="Tap a biometric passport with your phone. ZKPassport generates a proof on the phone. New Tibet verifies the proof.">
  <g transform="translate(19 40)"><rect x="0" y="26" width="70" height="88" rx="7" fill="#1b2a5b"/><circle cx="35" cy="63" r="15" fill="none" stroke="#ffffffb3" stroke-width="1.5"/><path d="M20 63h30M35 48c-12 10-12 20 0 30 12-10 12-20 0-30M35 48v30" fill="none" stroke="#ffffffb3" stroke-width="1.2"/><rect x="26" y="93" width="18" height="10" rx="2" fill="none" stroke="#ffffffb3"/><path d="M33 95v6m5-6v6" stroke="#ffffffb3"/>
  <g transform="translate(41 -22) rotate(12 29 45)"><rect width="56" height="90" rx="10" fill="#fff" stroke="#1b2a5b" stroke-width="2.5"/><rect x="5" y="7" width="46" height="72" rx="5" fill="#f1f4f9"/><path d="M20 8h16" stroke="#1b2a5b" stroke-width="3" stroke-linecap="round"/><path d="M19 43q9-12 18 0m-14 5q5-6 10 0" fill="none" stroke="#eb833a" stroke-width="2.5" stroke-linecap="round"/></g>
  <path d="M17 122v-13c0-5 5-7 9-3l13 14m-12-12v-7c0-5 7-6 9-2l13 15m-13-9c3-6 7-4 10 0l12 17" fill="none" stroke="#8794ac" stroke-width="3" stroke-linecap="round"/></g>
  <g transform="translate(134 77)">${arrow}</g>
  <g transform="translate(185 20)"><rect width="72" height="113" rx="14" fill="#f1f4f9" stroke="#1b2a5b" stroke-width="2"/><path d="M25 10h22" stroke="#1b2a5b" stroke-width="3" stroke-linecap="round"/><path d="M36 31 56 39v16c0 16-20 25-20 25S16 71 16 55V39Z" fill="#e1e9e5" stroke="#315f4b" stroke-width="1.5"/><path d="m25 55 8 8 14-18" fill="none" stroke="#315f4b" stroke-width="3" stroke-linecap="round"/><circle cx="36" cy="99" r="3" fill="#8794ac"/></g>
  <g transform="translate(276 77)">${arrow}</g>
  <g transform="translate(326 36)"><rect width="91" height="86" rx="16" fill="#f1f4f9"/><path d="m46 17 26 15H20Zm-19 20v24m13-24v24m13-24v24m13-24v24M20 68h52" fill="none" stroke="#1b2a5b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="77" cy="12" r="12" fill="#315f4b"/><path d="m72 12 4 4 7-8" fill="none" stroke="#fff" stroke-width="2"/></g>
 </svg>
 <figcaption id="passport-diagram-caption" class="explainer-steps"><span><strong>Tap passport</strong><small>Read the NFC chip</small></span><span><strong>Create proof</strong><small>On your phone</small></span><span><strong>Verify proof</strong><small>With New Tibet</small></span></figcaption>
 </figure>`;
}

export function walletDiagram(){
 return `<figure class="explainer" aria-labelledby="wallet-diagram-caption">
 <svg viewBox="0 0 440 145" role="img" aria-label="Face ID, fingerprint or device PIN unlocks a passkey. A supported passkey protects the Ethereum wallet key. The wallet is intended to hold New Tibet Coin, TIBET.">
  <g transform="translate(20 22)" fill="none" stroke="#1b2a5b" stroke-width="2.5" stroke-linecap="round"><rect width="91" height="99" rx="20" fill="#f1f4f9" stroke="none"/><path d="M25 22h-7v14m47-14h8v14M18 63v14h7m48-14v14h-8M35 40v6m22-6v6m-12-6v15h5m-18 9q14 10 27 0"/><path d="M17 103c5-13 9-15 15-14" stroke="#eb833a"/></g>
  <g transform="translate(134 72)">${arrow}</g>
  <g transform="translate(183 22)"><rect width="74" height="99" rx="18" fill="#f1f4f9"/><circle cx="31" cy="41" r="14" fill="none" stroke="#1b2a5b" stroke-width="3"/><path d="m41 51 18 18m-5-5 7-7m-14 0 7-7" fill="none" stroke="#1b2a5b" stroke-width="3" stroke-linecap="round"/><path d="m26 42 3 3 7-9" fill="none" stroke="#315f4b" stroke-width="2"/></g>
  <g transform="translate(276 72)">${arrow}</g>
  <g transform="translate(323 31)"><rect width="95" height="79" rx="13" fill="#1b2a5b"/><path d="M8 11h77" stroke="#ffffff40" stroke-width="2"/><rect x="59" y="27" width="40" height="29" rx="6" fill="#344675" stroke="#fff" stroke-width="1.5"/><circle cx="73" cy="41" r="3" fill="#fff"/><circle cx="29" cy="47" r="18" fill="#eb833a"/><path d="M18 38h22m-11 0v20" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g>
 </svg>
 <figcaption id="wallet-diagram-caption" class="explainer-steps"><span><strong>Unlock</strong><small>Face, fingerprint or PIN</small></span><span><strong>Passkey</strong><small>Protects the wallet key</small></span><span><strong>Ethereum wallet</strong><small>New Tibet Coin · $TIBET</small></span></figcaption>
 </figure>`;
}
