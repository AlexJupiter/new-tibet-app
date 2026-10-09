// Demo codes deliberately carry no real verification authority. Live codes are issued by the server.
export const canInvite=state=>state.status==='accepted'&&['green','blue'].includes(state.book);
export const membershipLabel=book=>book==='vouched'?'Vouched member':book==='blue'?'Blue Book supporter':'Green Book holder';
const normalize=value=>String(value||'').trim().toUpperCase();
const fingerprint=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();
const checksum=async text=>(await fingerprint(text)).slice(0,6);
const usedKey='new-tibet-used-demo-invites-v1';
export function clearDemoInvites(storage){try{storage.removeItem(usedKey);}catch{}}
export async function createDemoInvite(state){
 if(!canInvite(state))throw new Error('Only verified Green or Blue Book holders can invite someone.');
 const payload=Array.from(crypto.getRandomValues(new Uint8Array(5))).map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();
 return {code:'DEMO-NT-'+payload+'-'+await checksum(payload)};
}
export async function redeemDemoInvite(value,storage){
 const code=normalize(value),match=/^DEMO-NT-([A-F0-9]{10})-([A-F0-9]{6})$/.exec(code);
 if(!match||await checksum(match[1])!==match[2])throw new Error('This demo invitation code is invalid. Ask a verified member for a new invitation.');
 const key=await fingerprint('used:'+code);
 const used=JSON.parse(storage.getItem(usedKey)||'[]');
 if(!Array.isArray(used))throw new Error('Invitation history could not be read. Please try another browser.');
 if(used.includes(key))throw new Error('This invitation has already been used in this browser. Ask for a new code.');
 storage.setItem(usedKey,JSON.stringify([...used.slice(-199),key]));
}
export function invitationMessage({code,expiresAt},url,demo){
 const link=new URL(url);link.search='';link.hash='';link.searchParams.set('invite',code);
 return `I’m vouching for you to join New Tibet. You don’t need a Green or Blue Book.\n\nYour invitation code: ${code}\n\nJoin here: ${link.href}\n\nChoose “Use a verification code”, enter this code and choose a display name. A pseudonym is welcome.${demo?'\n\nThis is a demo invitation, not a real membership verification.':`\n\nThis code can be used once and expires on ${new Date(expiresAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}.`}`;
}
