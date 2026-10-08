import {Problem} from './core.mjs';
import {applicationEvent} from '../public/inbox-model.js';
export function applicationSummary(app){
 return {reference:app.reference,status:app.status,book:app.book,name:app.name||'',email:app.email||'',whatsapp:app.whatsapp||'',createdAt:app.createdAt,passportVerified:Boolean(app.passport?.verified),passkeyId:app.passkey?.id||null};
}
export function createNotifications(db){
 db.exec('CREATE TABLE IF NOT EXISTS notifications(id TEXT PRIMARY KEY, recipient TEXT, data TEXT NOT NULL, created_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS notification_reads(session_id TEXT NOT NULL, notification_id TEXT NOT NULL, read_at TEXT NOT NULL, PRIMARY KEY(session_id,notification_id)); CREATE INDEX IF NOT EXISTS notification_recipient ON notifications(recipient,created_at);');
 const insert=(item,recipient)=>db.prepare('INSERT OR IGNORE INTO notifications VALUES(?,?,?,?)').run(item.id,recipient,JSON.stringify(item),item.createdAt);
 return {
  record(app,recipient){const item=applicationEvent(app.reference,app.status,app.book,app.status==='pending'?app.createdAt:app.reviewedAt);insert(item,recipient);return item;},
  publish(body){
   const title=String(body.title||'').trim(),text=String(body.body||'').trim(),id=String(body.id||'');
   if(!/^[a-zA-Z0-9_-]{8,80}$/.test(id))throw new Problem('Use an announcement ID of 8–80 letters, numbers, underscores, or hyphens.');
   if(title.length<3||title.length>140||text.length<10||text.length>5000)throw new Problem('Provide a title of 3–140 characters and a message of 10–5,000 characters.');
   const key='announcement:'+id,existing=db.prepare('SELECT data FROM notifications WHERE id=?').get(key);
   if(existing){const item=JSON.parse(existing.data);if(item.title!==title||item.body!==text)throw new Problem('This announcement ID was already used for different content.',409);return item;}
   const item={id:key,kind:'announcement',title,body:text,createdAt:new Date().toISOString()};insert(item,null);return item;
  },
  list(owner){return db.prepare('SELECT n.data,r.read_at FROM notifications n LEFT JOIN notification_reads r ON r.notification_id=n.id AND r.session_id=? WHERE n.recipient IS NULL OR n.recipient=? ORDER BY n.created_at DESC,n.id LIMIT 200').all(owner,owner).map(row=>({...JSON.parse(row.data),read:Boolean(row.read_at)}));},
  markRead(owner,ids){
   if(!Array.isArray(ids)||ids.length>200||ids.some(id=>typeof id!=='string'||id.length>160))throw new Problem('Provide up to 200 notification IDs.');
   const allowed=ids.filter(id=>db.prepare('SELECT id FROM notifications WHERE id=? AND (recipient IS NULL OR recipient=?)').get(id,owner));
   if(allowed.length!==ids.length)throw new Problem('Notification not found.',404);
   db.exec('BEGIN');try{for(const id of new Set(allowed))db.prepare('INSERT OR IGNORE INTO notification_reads VALUES(?,?,?)').run(owner,id,new Date().toISOString());db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
   return allowed;
  }
 };
}
