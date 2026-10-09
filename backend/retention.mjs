// Only applications which explicitly accepted the new 60-day policy are eligible.
// Cleanup removes verification evidence; account access and membership records remain.
export function createRetention({db,store,live}){
 let running=false,lastRun=0;
 async function run({now=Date.now(),force=false}={}){
  if(!live||running||(!force&&now-lastRun<3600000))return 0;
  running=true;lastRun=now;let count=0;
  try{
   for(const row of db.prepare('SELECT reference,data FROM applications').all()){
    const app=JSON.parse(row.data);
    if(app.consentVersion!=='2026-10-09'||app.verificationDeletedAt||!Number.isFinite(Date.parse(app.verificationDeleteAt))||Date.parse(app.verificationDeleteAt)>now)continue;
    try{
     await store.clearVerification(app);
     // Reload after async work so concurrent review/security changes are preserved.
     const latest=JSON.parse(db.prepare('SELECT data FROM applications WHERE reference=?').get(app.reference).data);
     delete latest.media;delete latest.photoURL;delete latest.photoId;delete latest.challengeCode;delete latest.reviewNote;
     if(latest.passport)delete latest.passport.proofs;
     latest.verificationDeletedAt=new Date(now).toISOString();
     db.prepare('UPDATE applications SET data=? WHERE reference=?').run(JSON.stringify(latest),latest.reference);
     for(const session of db.prepare('SELECT id,data FROM sessions').all()){
      const data=JSON.parse(session.data);if(data.reference!==app.reference&&data.submissionReference!==app.reference)continue;
      delete data.media;delete data.mediaChallenge;delete data.challenges;delete data.passportChallenge;if(data.passport)delete data.passport.proofs;
      db.prepare('UPDATE sessions SET data=? WHERE id=?').run(JSON.stringify(data),session.id);
     }
     count++;
    }catch{console.error('Verification retention cleanup requires retry.');}
   }
   // Abandoned application sessions expire after a day. Remove their uploads too.
   for(const row of db.prepare('SELECT id,data FROM sessions WHERE expires<?').all(now)){
    const data=JSON.parse(row.data);if(data.reference)continue;
    try{if(data.submissionReference&&store.removeVerificationMedia)await store.removeVerificationMedia({reference:data.submissionReference,media:data.media});else for(const media of Object.values(data.media||{}))if(media.id)await store.removePhoto(media.id);db.prepare('DELETE FROM sessions WHERE id=?').run(row.id);}catch{console.error('Abandoned verification cleanup requires retry.');}
   }
  }finally{running=false;}
  return count;
 }
 return {run};
}
