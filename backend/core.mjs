import {createHmac,randomInt,timingSafeEqual,randomBytes} from 'node:crypto';
export class Problem extends Error{constructor(message,status=400){super(message);this.status=status;}}
export const normalize=(factor,value)=>factor==='email'?String(value||'').trim().toLowerCase():String(value||'').replace(/[\s()-]/g,'');
export function validateContact(factor,value){if(!['email','whatsapp'].includes(factor))throw new Problem('Unsupported verification factor.');value=normalize(factor,value);if(value.length>254||(factor==='email'?!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value):!/^\+[1-9]\d{7,14}$/.test(value)))throw new Problem('Enter a valid '+(factor==='email'?'email address.':'WhatsApp number with its country code.'));return value;}
export const code=()=>String(randomInt(100000,1000000));
export const token=()=>randomBytes(32).toString('base64url');
export const digest=(secret,text)=>createHmac('sha256',secret).update(text).digest('hex');
export function compare(a,b){return typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
export function verifyChallenge(challenge,{value,code},secret,now=Date.now()){if(!challenge||challenge.used||challenge.expires<now||challenge.attempts>=5)throw new Problem('Code expired or too many attempts. Request a new code.');challenge.attempts++;if(challenge.value!==value||!compare(challenge.hash,digest(secret,challenge.value+':'+code)))throw new Problem('That code does not match. Please try again.');challenge.used=true;return challenge.value;}
export function validateApplication(body,session){
 const name=typeof body.name==='string'?body.name.trim():'';if(!name||name.length>100)throw new Problem('Enter a display name of 1–100 characters. You can use a pseudonym.');
 if(!['green','blue'].includes(body.book))throw new Problem('Choose a Green Book or Blue Book.');
 if(body.consent!==true||!['2026-10-07','2026-10-08','2026-10-09'].includes(body.consentVersion))throw new Problem('Consent to book and video review is required.');
 const contacts={email:'',whatsapp:''};
 for(const factor of ['email','whatsapp'])if(String(body[factor]||'').trim()){
  contacts[factor]=validateContact(factor,body[factor]);
  if(session.verified?.[factor]!==contacts[factor])throw new Problem('Verify the optional '+factor+' contact, or leave it blank.',403);
 }
 if(!session.mediaChallenge||session.mediaChallenge.expires<Date.now())throw new Problem('Your photo challenge expired. Start a new application.');
 if(!['front','back','identity','challenge','video'].every(kind=>session.media?.[kind]?.book===body.book))throw new Problem('Provide the four book photos and video message.');
 // Passport NFC is an optional upgrade, not a registration prerequisite.
 return {name,...contacts,book:body.book,consentVersion:body.consentVersion};
}
export function validateMedia(kind,type,buffer){if(!['front','back','identity','challenge','video'].includes(kind))throw new Problem('Unsupported media kind.');if(kind!=='video'){if(type!=='image/jpeg'||buffer.length<100||buffer.length>3*1024*1024||buffer[0]!==255||buffer[1]!==216||buffer.at(-2)!==255||buffer.at(-1)!==217)throw new Problem('Provide a valid JPEG photo smaller than 3 MB.');return 'image/jpeg';}if(buffer.length<100||buffer.length>20*1024*1024)throw new Problem('Provide a video smaller than 20 MB.');const webm=buffer.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));const mp4=buffer.toString('ascii',4,8)==='ftyp';if(type==='video/webm'&&webm)return type;if(['video/mp4','video/quicktime'].includes(type)&&mp4)return type;throw new Problem('Provide a valid WebM or MP4 video.');}

export function validateDecision(current,status){if(!['accepted','declined'].includes(status))throw new Problem('Decision must be accepted or declined.');if(current!==status&&current!=='pending')throw new Problem('This application already has a final decision.',409);return current!==status;}
export function spreadsheetText(value){const text=String(value??'');return /^[=+\-@\t\r]/.test(text)?"'"+text:text;}
