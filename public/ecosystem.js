import {campaignPreview,bindRewardCampaigns} from './rewards.js';
const asset=name=>new URL('./assets/'+name,import.meta.url).href;
const icon=paths=>`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const external=icon('<path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>');
const guide=new URL('./developers.html',import.meta.url).href;
const partners=[
 {name:'Monlam AI',url:'https://monlam.ai/',domain:'monlam.ai',image:'monlam-logo.png',className:'monlam',alt:'Monlam AI logo',description:'Tibetan language tools for translation, speech and text recognition.',earn:'Earn 100 $TIBET by completing a 7-day learning streak.',use:'Unlock premium language tools with $TIBET.',campaign:'monlam'},
 {name:'Tibet Zomsa',url:'https://www.tibetzomsa.com/',domain:'tibetzomsa.com',image:'zomsa-community.png',className:'zomsa',alt:'A group of friends pictured on Tibet Zomsa’s website',description:'Meet Tibetans, make connections and stay close to your culture.',earn:'Community participation rewards in $TIBET.',use:'Access community features with $TIBET.'},
 {name:'smartvote Tibet',url:'https://tibet.smartvote.org/en/home',domain:'tibet.smartvote.org',image:'smartvote-tibet.png',className:'smartvote',alt:'smartvote Tibet: find candidates who share your opinions',description:'Compare your views with candidates in Tibetan elections.',earn:'Explore rewards for learning about civic participation.',use:'Support civic tools with $TIBET.'},
 {name:'Dzongsar',className:'dzongsar',description:'An example of how a Tibetan learning app could join the ecosystem.',earn:'Earn 100 $TIBET by completing a 7-day learning streak.',use:'Access learning features with $TIBET.',campaign:'dzongsar'}
];

export function renderEcosystem(screen,state,demo,rerender,notice){
 screen.innerHTML=`<h2 id="screen-title" tabindex="-1">Ecosystem</h2>
 <p class="description ecosystem-intro">One New Tibet identity. More ways to learn, connect and use $TIBET.</p>
 <figure class="ecosystem-signin">
  <div class="ecosystem-signin-button" role="img" aria-label="Sign in with New Tibet ID button preview"><img src="${asset('new-tibet-symbol.svg')}" alt="" width="24" height="24"/><span>Sign in with New Tibet ID</span></div>
  <figcaption>Example sign-in button for a future integration.</figcaption>
 </figure>
 <ul class="ecosystem-benefits" aria-label="Benefits of New Tibet ID">
  <li>${icon('<path d="M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7Z"/><path d="m8 12 3 3 5-6"/>')}<div><h3>Privacy</h3><p>Share verification status, without sharing book photos or passport scans.</p></div></li>
  <li>${icon('<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>')}<div><h3>Security</h3><p>Use your device’s passkey instead of another password.</p></div></li>
  <li>${icon('<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2m-11-3 2 2 4-4"/>')}<div><h3>Verified Tibetans</h3><p>Prove Green Book membership when a service requires it.</p></div></li>
 </ul>
 <section class="ecosystem-integrations" aria-labelledby="ecosystem-integrations-title"><div class="ecosystem-partner-heading"><h3 id="ecosystem-integrations-title">Example integrations</h3><span>Earn and use $TIBET</span></div>
 <p class="ecosystem-preview-note">Possible integrations and token benefits only. No partnership agreements have been signed. New Tibet ID sign-in and the proposed offers are not connected to these services.</p>
 <div class="ecosystem-partners">${partners.map(partner=>`<article class="ecosystem-partner">
  ${partner.url?`<a class="ecosystem-partner-link" href="${partner.url}" target="_blank" rel="noopener noreferrer" aria-label="Visit ${partner.name} (opens in a new tab)">`:'<div class="ecosystem-partner-concept">'}
  <div class="ecosystem-partner-image ${partner.className}">${partner.image?`<img src="${asset('ecosystem/'+partner.image)}" alt="${partner.alt}" width="${partner.className==='monlam'?180:partner.className==='zomsa'?1080:1200}" height="${partner.className==='monlam'?180:partner.className==='zomsa'?810:630}" loading="lazy" decoding="async"/>${partner.className==='monlam'?'<span>Monlam AI</span>':''}`:`${icon('<path d="M3 5c4-2 6-2 9 0 3-2 5-2 9 0v15c-4-2-6-2-9 0-3-2-5-2-9 0Zm9 0v15"/>')}<span>Dzongsar</span>`}</div>
  <div class="ecosystem-partner-copy"><span class="ecosystem-example">Proposed example</span><div><h3>${partner.name}</h3>${partner.url?external:''}</div><p>${partner.description}</p>${partner.domain?`<span class="ecosystem-domain">${partner.domain}</span>`:''}</div>
  ${partner.url?'</a>':'</div>'}
  <dl class="integration-token-benefits"><div><dt>Earn $TIBET</dt><dd>${partner.earn}</dd></div><div><dt>Use $TIBET</dt><dd>${partner.use}</dd></div></dl>
  ${partner.campaign?campaignPreview(state,demo,partner.campaign):''}
 </article>`).join('')}</div></section>
 <details class="ecosystem-developer"><summary><span>For developers</span><span class="accordion-chevron" aria-hidden="true"></span></summary><div><h3>Integrate Sign in with New Tibet ID.</h3><p>Use the developer guide for the sign-in flow, official button assets and implementation examples.</p><a class="text-button" href="${guide}" target="_blank" rel="noopener noreferrer">View integration guide ${external}<span class="sr-only"> (opens in a new tab)</span></a><small>Integration preview · Partner sign-in is not enabled yet.</small></div></details>`;
 bindRewardCampaigns(screen,state,demo,rerender,notice);
}
