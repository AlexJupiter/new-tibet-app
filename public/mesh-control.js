import {meshDiagram} from './mesh-diagram.js';
export function meshInfoControl(dialogId='chat-about-dialog'){
 return `<div class="chat-technology-header"><svg class="mesh-mini" viewBox="0 0 52 32" width="52" height="32" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m12 15 13-9 15 9-15 11Z" stroke-dasharray="3 3"/><rect x="3" y="8" width="10" height="16" rx="3" fill="white"/><rect x="21" y="1" width="10" height="14" rx="3" fill="white"/><rect x="21" y="19" width="10" height="12" rx="3" fill="white"/><rect x="39" y="8" width="10" height="16" rx="3" fill="white"/><path d="m6 13 5 5-3 3V11l3 3-5 5" stroke-width="1"/></svg><div><strong>Bluetooth mesh</strong><span>No central intermediary · Relays may take time</span></div><button class="mesh-info-button" type="button" data-chat-about aria-label="Learn more about Bluetooth mesh" aria-controls="${dialogId}" aria-haspopup="dialog">Learn more</button></div>`;
}

export function meshExplainerDialog(id='chat-about-dialog',closeId='close-chat-about'){
 return `<dialog class="chat-about-dialog" id="${id}" aria-labelledby="${id}-title">
 <div class="chat-about-header"><h2 id="${id}-title">Bluetooth mesh messaging</h2><button class="dialog-close" id="${closeId}" type="button" data-close-mesh aria-label="Close chat explanation">×</button></div>
 <p class="mesh-about-intro">Phones become the network. Messages travel over Bluetooth Low Energy between nearby devices, without internet or a mobile signal.</p>
 ${meshDiagram()}
 <ol class="mesh-how-steps">
  <li><strong>Find nearby phones</strong><p>With Bluetooth enabled, the native app discovers other participating devices within radio range.</p></li>
  <li><strong>Relay phone to phone</strong><p>Each phone can pass a message onward. These hops let it reach someone beyond your own Bluetooth range.</p></li>
  <li><strong>Deliver when a route is available</strong><p>If the recipient is out of reach, BitChat can queue messages or let other phones carry encrypted private messages until a connection becomes possible.</p></li>
 </ol>
 <section class="mesh-why"><h3>Why it matters</h3><p>The Bluetooth route has no central messaging server that can censor its relays. Nearby communities can communicate when internet access is unavailable.</p></section>
 <details class="mesh-about-details"><summary>Privacy and encryption</summary><p>BitChat uses the Noise protocol to encrypt private conversations from sender to recipient. Intermediate phones relay encrypted packets without reading the private message.</p><p>Public channels are broadcasts. Nearby observers can also detect radio identifiers; Bluetooth mesh does not make your presence invisible.</p></details>
 <details class="mesh-about-details"><summary>Range and delivery time</summary><p>Mesh coverage depends on participating phones being close enough to connect. Movement and gaps between devices can delay delivery or prevent it. Bluetooth permissions and device restrictions also affect connectivity.</p><p>BitChat also supports an internet route using distributed Nostr relays. That is separate from the offline Bluetooth route illustrated above.</p></details>
 <details class="mesh-about-details"><summary>Inside the protocol</summary><p>Messages travel as small packets. Larger packets are split and reassembled, while duplicate detection and hop limits prevent endless relaying. A live private session uses cryptographic keys to authenticate peers and protect its contents.</p><p><a href="https://github.com/permissionlesstech/bitchat/blob/main/WHITEPAPER.md" target="_blank" rel="noopener noreferrer">Read the BitChat technical whitepaper ↗</a></p></details>
 <p class="mesh-prototype-note"><strong>New Tibet prototype.</strong> The native chat is planned as a BitChat fork. This browser demo shows the interface; it does not access Bluetooth or deliver messages.</p>
 <p class="mesh-source"><a href="https://github.com/permissionlesstech/bitchat" target="_blank" rel="noopener noreferrer">Explore BitChat’s open-source technology ↗</a></p>
 </dialog>`;
}

export function bindMeshExplainer(screen,id='chat-about-dialog'){
 const dialog=screen.querySelector('#'+id);
 let opener;
 screen.querySelectorAll('[data-chat-about]').forEach(button=>button.onclick=()=>{opener=button;dialog.showModal();});
 dialog.querySelector('[data-close-mesh]').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{if(opener?.isConnected)opener.focus({preventScroll:true});});
}
