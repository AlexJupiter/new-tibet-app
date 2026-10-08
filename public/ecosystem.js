const asset=name=>new URL('./assets/'+name,import.meta.url).href;
const icon=paths=>`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const external=icon('<path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>');
const partners=[
 {name:'Monlam AI',url:'https://monlam.ai/',domain:'monlam.ai',image:'monlam-logo.png',className:'monlam',alt:'Monlam AI logo',description:'Tibetan language tools for translation, speech and text recognition.'},
 {name:'Tibet Zomsa',url:'https://www.tibetzomsa.com/',domain:'tibetzomsa.com',image:'zomsa-community.png',className:'zomsa',alt:'A group of friends pictured on Tibet Zomsa’s website',description:'Meet Tibetans, make connections and stay close to your culture.'},
 {name:'smartvote Tibet',url:'https://tibet.smartvote.org/en/home',domain:'tibet.smartvote.org',image:'smartvote-tibet.png',className:'smartvote',alt:'smartvote Tibet: find candidates who share your opinions',description:'Compare your views with candidates in Tibetan elections.'}
];

export function renderEcosystem(screen){
 screen.innerHTML=`<h2 id="screen-title" tabindex="-1">Ecosystem</h2>
 <p class="description ecosystem-intro">Explore how New Tibet ID could connect with other Tibetan services.</p>
 <figure class="ecosystem-signin">
  <div class="ecosystem-signin-button" role="img" aria-label="Sign in with New Tibet ID button preview"><img src="${asset('new-tibet-symbol.svg')}" alt="" width="24" height="24"/><span>Sign in with New Tibet ID</span></div>
  <figcaption>Example sign-in button for a future integration.</figcaption>
 </figure>
 <ul class="ecosystem-benefits" aria-label="Benefits of New Tibet ID">
  <li>${icon('<path d="M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7Z"/><path d="m8 12 3 3 5-6"/>')}<div><h3>Privacy</h3><p>Share your verification status, without sending partners your book photos or passport scan.</p></div></li>
  <li>${icon('<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>')}<div><h3>Security</h3><p>Use your device’s passkey instead of creating another password.</p></div></li>
  <li>${icon('<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2m-11-3 2 2 4-4"/>')}<div><h3>Verified Tibetans</h3><p>Prove verified Green Book membership when a partner requires it.</p></div></li>
 </ul>
 <p class="ecosystem-preview-note">These sites are examples of possible integrations. New Tibet has not signed partnership agreements with any of them. New Tibet ID sign-in is not connected to these sites.</p>
 <div class="ecosystem-partner-heading"><h3>Example integrations</h3><span>Opens in a new tab ${external}</span></div>
 <div class="ecosystem-partners">${partners.map(partner=>`<a class="ecosystem-partner" href="${partner.url}" target="_blank" rel="noopener noreferrer" aria-label="Visit ${partner.name} (opens in a new tab)">
  <div class="ecosystem-partner-image ${partner.className}"><img src="${asset('ecosystem/'+partner.image)}" alt="${partner.alt}" width="${partner.className==='monlam'?180:partner.className==='zomsa'?1080:1200}" height="${partner.className==='monlam'?180:partner.className==='zomsa'?810:630}" loading="lazy" decoding="async"/>${partner.className==='monlam'?'<span>Monlam AI</span>':''}</div>
  <div class="ecosystem-partner-copy"><span class="ecosystem-example">Example</span><div><h3>${partner.name}</h3>${external}</div><p>${partner.description}</p><span class="ecosystem-domain">${partner.domain}</span></div>
 </a>`).join('')}</div>`;
}
