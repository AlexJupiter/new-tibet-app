import {inboxItems,unreadCount} from './inbox-model.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const date=value=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value));
const time=value=>new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit'}).format(new Date(value));
const icon=paths=>`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const readIcon=icon('<path d="m3 12 4 4L17 6m-5 10L22 6"/>');
export function renderAnnouncements(screen,state,demo,{rerender,openProfile,refresh,markRead}){
 const previousFeed=screen.querySelector('.channel-feed');
 const previousScroll=previousFeed?.scrollTop||0,atEnd=!previousFeed||previousFeed.scrollHeight-previousScroll-previousFeed.clientHeight<40;
 const sameFilter=previousFeed?.dataset.filter===state.inboxFilter;
 const items=inboxItems(state,demo),unread=unreadCount(state,demo);
 const visible=items.filter(item=>state.inboxFilter==='all'||item.kind===state.inboxFilter).reverse();
 let previousDate='';
 screen.innerHTML=`<div class="announcement-channel">
 <div class="channel-heading"><img class="channel-avatar" src="${new URL('./assets/new-tibet-symbol.svg',import.meta.url).href}" alt=""/><div class="channel-identity"><h2 id="screen-title" tabindex="-1">Announcements</h2><p>New Tibet</p></div><div class="channel-tools"><button type="button" id="refresh-inbox" aria-label="${state.inboxLoading?'Refreshing announcements':'Refresh announcements'}" title="Refresh" ${state.inboxLoading?'disabled':''}>${icon('<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1"/>')}</button><button type="button" id="read-all" aria-label="Mark all read" title="Mark all read" ${!unread?'disabled':''}>${readIcon}</button></div></div>
 <button class="channel-application" id="view-application" type="button" aria-label="View membership application"><span><strong>Application ${state.status==='accepted'?'accepted':state.status==='declined'?'declined':'awaiting review'}</strong><span class="receipt-reference">${esc(state.reference)}</span></span>${icon('<path d="m9 5 7 7-7 7"/>')}</button>
 <div class="inbox-filters" role="group" aria-label="Filter announcements">${[['all','All updates'],['announcement','New Tibet'],['application','My application']].map(([key,label])=>`<button type="button" data-inbox-filter="${key}" aria-pressed="${state.inboxFilter===key}">${label}</button>`).join('')}</div>
 ${state.inboxError?`<p class="inbox-error" role="status">${esc(state.inboxError)}</p>`:''}
 <div class="channel-feed" data-filter="${esc(state.inboxFilter)}" role="region" aria-label="New Tibet channel messages" tabindex="0"><div class="channel-feed-content">${visible.map(item=>{
  const read=state.inboxRead.includes(item.id),day=date(item.createdAt),separator=day!==previousDate?`<div class="channel-date"><span>${day}</span></div>`:'';previousDate=day;
  return `${separator}<article class="channel-message ${read?'read':'unread'}" aria-labelledby="message-${esc(item.id)}"><div class="notification-meta"><strong>${item.kind==='application'?'My application · Only you':'New Tibet'}</strong>${demo?`<span>${item.sample?'Sample announcement':'Demo'}</span>`:''}</div><h3 id="message-${esc(item.id)}">${esc(item.title)}</h3><p class="notification-body">${esc(item.body)}</p>${item.reference?`<p class="receipt-reference">${esc(item.reference)}</p>`:''}<div class="channel-message-footer"><time datetime="${esc(item.createdAt)}">${time(item.createdAt)}</time><button type="button" class="channel-message-action" data-notification="${esc(item.id)}" aria-label="${read?'Message read':'Mark as read'}: ${esc(item.title)}" aria-disabled="${read}">${read?readIcon:'<span class="notification-dot" aria-hidden="true"></span>'}<span>${read?'Read':'Mark as read'}</span></button></div></article>`;
 }).join('')||'<p class="channel-empty">No updates here yet. New messages will appear in this channel.</p>'}</div></div>
 <details class="channel-info"><summary>${icon('<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>')}<span>Only New Tibet can send messages.</span>${icon('<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>')}</summary><p>Your application updates are private to you. Announcements are shared with members. No email address or phone number is needed. ${demo?'This demo saves the receipt and read state on this browser. Name, contacts, documents and wallet keys are not saved. Restart demo clears the record.':'Updates refresh while the app is open. Use your passkey to return to this inbox.'}</p></details>
 </div>`;
 screen.querySelector('#view-application').onclick=openProfile;
 screen.querySelector('#refresh-inbox').onclick=refresh;
 screen.querySelector('#read-all').onclick=()=>markRead(items.filter(item=>!state.inboxRead.includes(item.id)).map(item=>item.id));
 screen.querySelectorAll('[data-inbox-filter]').forEach(button=>button.onclick=()=>{state.inboxFilter=button.dataset.inboxFilter;rerender();screen.querySelector(`[data-inbox-filter="${state.inboxFilter}"]`)?.focus({preventScroll:true});});
 screen.querySelectorAll('[data-notification]').forEach(button=>button.onclick=()=>{const id=button.dataset.notification;if(state.inboxRead.includes(id))return;state.inboxExpanded=id;markRead([id]);});
 const feed=screen.querySelector('.channel-feed');
 document.fonts.ready.then(()=>requestAnimationFrame(()=>{if(feed.isConnected)feed.scrollTop=sameFilter&&!atEnd?previousScroll:feed.scrollHeight;}));
}
