export const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const likeIcon='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M20.8 4.8a5.4 5.4 0 0 0-7.7 0L12 5.9l-1.1-1.1a5.4 5.4 0 0 0-7.7 7.7L12 21l8.8-8.5a5.4 5.4 0 0 0 0-7.7Z"/></svg>';
export const commentIcon='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a9 9 0 0 1-9 9 10 10 0 0 1-4-.9L3 21l1.4-5a9 9 0 1 1 16.6-4.5Z"/><path d="M8 9h8M8 13h5"/></svg>';
export const archiveIcon='<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 3h6v18H4zM10 3h6v18h-6zM17 5l3-1 3 16-3 1zM6 7h2m4 0h2M6 17h2m4 0h2"/></svg>';
export function uploaderMarkup(name='New Tibet Foundation'){
 const foundation=name==='New Tibet Foundation';
 return `<div class="library-uploader"><span class="library-uploader-avatar" aria-hidden="true">${foundation?`<img src="${new URL('./favicon.svg',import.meta.url).href}" alt="" width="30" height="30"/>`:esc(Array.from(name.trim())[0]||'M')}</span><div><span>Uploaded by</span><strong>${esc(name)}</strong></div></div>`;
}
export function likeMarkup(item,social){
 return `<button class="library-like-button" data-library-like="${esc(item.id)}" type="button" aria-pressed="${social.liked}" aria-label="${social.liked?'Unlike':'Like'} ${esc(item.title)}"><span>${likeIcon}</span><span>${social.likes}</span></button>`;
}
