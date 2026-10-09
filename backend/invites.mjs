import {randomBytes} from 'node:crypto';
import {Problem,digest} from './core.mjs';

export const canInvite=app=>app?.status==='accepted'&&['green','blue'].includes(app.book);
const normalize=value=>String(value||'').trim().toUpperCase();
export function createInvites({db,secret,appByReference,saveSession,notifications,rate}){
 db.exec('CREATE TABLE IF NOT EXISTS invites(code_hash TEXT PRIMARY KEY, inviter_reference TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, used_reference TEXT UNIQUE);');
 const hash=code=>digest(secret,'member-invite:'+code);
 return {
  issue(session){
   if(!session.reference||!canInvite(appByReference(session.reference)))throw new Problem('Invitations are available to verified Green or Blue Book holders.',403);
   rate(hash('issuer:'+session.reference),20,86400000);
   // Codes are bearer credentials. Keep only their keyed hash, never their plaintext.
   const value='NT-'+randomBytes(9).toString('hex').toUpperCase().match(/.{6}/g).join('-'),now=Date.now(),expiresAt=now+7*86400000;
   db.prepare('INSERT INTO invites VALUES(?,?,?,?,NULL)').run(hash(value),session.reference,now,expiresAt);
   return {code:value,expiresAt:new Date(expiresAt).toISOString()};
  },
  redeem(session,id,data){
   const code=normalize(data.code),name=String(data.name||'').trim();
   if(!/^NT-(?:[A-F0-9]{6}-){2}[A-F0-9]{6}$/.test(code))throw new Problem('Enter a valid invitation code from a verified member.');
   if(!name||name.length>100)throw new Problem('Choose a display name of up to 100 characters. A pseudonym is welcome.');
   rate(hash('redeem:'+id),10,3600000);
   const codeHash=hash(code);
   db.exec('BEGIN IMMEDIATE');
   try{
    const invite=db.prepare('SELECT * FROM invites WHERE code_hash=?').get(codeHash);
    if(!invite)throw new Problem('This invitation is invalid, expired or already used. Ask the member for a new code.');
    // A retry after a lost response returns the same account, without consuming a second code.
    if(session.reference){
     if(invite.used_reference===session.reference){const app=appByReference(session.reference);db.exec('COMMIT');return app;}
     throw new Problem('This session already belongs to a membership. Start a new signup to use an invitation.',409);
    }
    if(invite.used_reference||invite.expires_at<=Date.now()||!canInvite(appByReference(invite.inviter_reference)))throw new Problem('This invitation is invalid, expired or already used. Ask the member for a new code.');
    const now=new Date().toISOString();
    const app={reference:'NT-'+randomBytes(8).toString('hex').toUpperCase(),name,book:'vouched',status:'accepted',verificationTier:'vouched',invitedBy:invite.inviter_reference,createdAt:now,reviewedAt:now,email:'',whatsapp:'',passport:null,passkey:null,registrationMessage:'in-app',decisionMessage:'in-app'};
    db.prepare('INSERT INTO applications VALUES(?,?,?)').run(app.reference,id,JSON.stringify(app));
    db.prepare('UPDATE invites SET used_reference=? WHERE code_hash=? AND used_reference IS NULL').run(app.reference,codeHash);
    notifications.record({...app,status:'pending'},id);notifications.record(app,id);
    session.reference=app.reference;saveSession(id,session);
    db.exec('COMMIT');return app;
   }catch(error){db.exec('ROLLBACK');throw error;}
  }
 };
}
