import test from 'node:test';
import assert from 'node:assert/strict';
import {canContribute,libraryReward,sampleLibrary,searchLibrary,librarySource,validateLibraryFile,submitDemoContribution,approveDemoContribution,applyDemoLibraryRewards,libraryRewardRecords,librarySocial,toggleLibraryLike,addLibraryComment} from '../public/library-model.js';
import {readFile} from 'node:fs/promises';
import {createApp} from '../backend/server.mjs';
import {initialDemoBalances,walletRewardUnread,quoteDemoSend,sendDemoBalance} from '../public/member-model.js';
import {saveDemoInbox,restoreDemoInbox,recordApplicationEvent} from '../public/inbox-model.js';

const member=()=>({reference:'NT-LIBRARY-0001',status:'accepted',book:'blue',wallet:{ready:true},libraryContributions:[],libraryRewards:[],inboxRead:[],inboxEvents:[],applicationCreatedAt:'2026-10-14T10:00:00Z'});
const draft=()=>({title:'A family archive record',description:'A sample record of a family collection preserved for future generations.',credit:'Example family collection',category:'Heritage',language:'Tibetan',source:'https://example.org/archive/one',permission:true});

test('Library is searchable for everyone, while contributions require verified membership and explicit demo mode',()=>{
 const visitor={status:'guest',libraryContributions:[]};assert.equal(searchLibrary(visitor).length,6);assert.equal(searchLibrary(visitor,'charter')[0].id,'charter');assert(searchLibrary(visitor,'','Language').every(item=>item.category==='Language'));
 assert.equal(canContribute(visitor),false);assert.throws(()=>submitDemoContribution(visitor,draft(),{demo:true}),/Verify/);
 for(const book of ['green','blue','vouched']){const state={...member(),book};assert.throws(()=>submitDemoContribution(state,draft()),/not connected/);assert.equal(submitDemoContribution(state,draft(),{demo:true}).status,'pending');}
 for(const status of ['pending','declined'])assert.throws(()=>submitDemoContribution({...member(),status},draft(),{demo:true}),/Verify/);
});
test('Contributions need useful metadata, credit, permission and a safe source or supported file',()=>{
 for(const patch of [{title:'Short'},{description:'Short'},{credit:''},{permission:false},{category:'Unknown'},{language:'Unknown'},{source:''}])assert.throws(()=>submitDemoContribution(member(),{...draft(),...patch},{demo:true}));
 for(const url of ['javascript:alert(1)','data:text/html,bad','file:///secret','https://user:password@example.org','not a URL'])assert.throws(()=>librarySource(url));
 for(const file of [{name:'bad.html',type:'text/html',size:10},{name:'empty.txt',type:'text/plain',size:0},{name:'large.pdf',type:'application/pdf',size:26*1024*1024},{name:'fake.jpg',type:'text/html',size:10}])assert.throws(()=>validateLibraryFile(file));
 const file={name:'record.txt',type:'text/plain',size:100};validateLibraryFile(file);
 assert.throws(()=>submitDemoContribution(member(),{...draft(),source:''},{demo:true,file}),/prepared/);
 assert.equal(submitDemoContribution(member(),{...draft(),source:''},{demo:true,file,fingerprint:'a'.repeat(64)}).file,file);
});
test('Duplicate file contents and canonical source links cannot farm contribution rewards',()=>{
 const state=member(),item=submitDemoContribution(state,draft(),{demo:true});
 assert.throws(()=>submitDemoContribution(state,{...draft(),title:'Different title',source:draft().source+'/#fragment'},{demo:true}),/already/);
 assert.throws(()=>submitDemoContribution(state,{...draft(),source:sampleLibrary[0].source},{demo:true}),/already/);
 const file={name:'one.txt',type:'text/plain',size:100};submitDemoContribution(state,{...draft(),source:''},{demo:true,file,fingerprint:'b'.repeat(64)});
 assert.throws(()=>submitDemoContribution(state,{...draft(),source:''},{demo:true,file:{...file,name:'renamed.txt'},fingerprint:'b'.repeat(64)}),/already/);
 assert.throws(()=>approveDemoContribution(state,item.id),/Demo review/);assert.throws(()=>approveDemoContribution({...state,reference:'NT-OTHER-0001'},item.id,{demo:true}),/different/);
 assert.equal(state.libraryRewards.length,0);
});
test('Only approved contributions earn 100 TIBET, wallet setup gates credit, and replay never replenishes spending',()=>{
 const state=member(),item=submitDemoContribution(state,draft(),{demo:true}),empty=initialDemoBalances();assert.equal(libraryReward,100);
 assert.equal(applyDemoLibraryRewards(empty,state),empty);assert.equal(searchLibrary(state).length,6);
 assert.equal(approveDemoContribution(state,item.id,{demo:true}),true);assert.equal(searchLibrary(state).length,7);
 assert.equal(applyDemoLibraryRewards(empty,{...state,wallet:null}),empty);
 assert.equal(applyDemoLibraryRewards(empty,{...state,status:'declined'}),empty);
 const credited=applyDemoLibraryRewards(empty,state);assert.equal(credited.tibetUnits,10000);assert.equal(credited.transactions[0].type,'library-reward');assert.equal(walletRewardUnread({...state,walletDemo:credited,walletRewardReadIds:[]}),1);
 assert.equal(approveDemoContribution(state,item.id,{demo:true}),false);assert.equal(applyDemoLibraryRewards(credited,state),credited);
 const spent=sendDemoBalance(credited,quoteDemoSend(credited,'sonam.tsering','25'),'library-send');assert.equal(spent.tibetUnits,7475);assert.equal(applyDemoLibraryRewards(spent,state),spent);
});
test('Reward receipts survive reload without storing uploaded information, files or personal data',()=>{
 const state=member(),item=submitDemoContribution(state,{...draft(),title:'Private archive title',description:'A private description that must stay only in page memory.'},{demo:true});approveDemoContribution(state,item.id,{demo:true});recordApplicationEvent(state,'accepted');
 state.demoOnboardingStages={security:'2026-10-14T10:01:00Z'};state.walletDemo=applyDemoLibraryRewards(initialDemoBalances(),state);state.walletRewardReadIds=state.walletDemo.transactions.map(tx=>tx.id);
 const values=new Map(),storage={setItem:(key,value)=>values.set(key,value),getItem:key=>values.get(key)};saveDemoInbox(storage,state);
 const raw=[...values.values()][0];for(const secret of ['Private archive title','private description','example.org','family collection','fingerprint'])assert(!raw.includes(secret));
 const restored=restoreDemoInbox(storage);assert.equal(restored.libraryContributions,undefined);assert.deepEqual(restored.libraryRewards,[{id:item.id,createdAt:item.approvedAt}]);
 const wallet=applyDemoLibraryRewards(initialDemoBalances(),restored);assert.equal(wallet.tibetUnits,10000);assert.equal(walletRewardUnread({...restored,walletDemo:wallet}),0);
});
test('Malformed and repeated reward receipts are filtered before creating wallet transactions',()=>{
 const id=crypto.randomUUID(),createdAt='2026-10-14T10:00:00Z';
 const records=libraryRewardRecords([{id,createdAt,title:'Private title'},{id,createdAt},{id:'bad',createdAt},{id:crypto.randomUUID(),createdAt:'bad'}]);assert.deepEqual(records,[{id,createdAt}]);
 const wallet=applyDemoLibraryRewards(initialDemoBalances(),{...member(),libraryRewards:records});assert.equal(wallet.transactions.length,1);assert.equal(wallet.tibetUnits,10000);
});
test('Initial documents have locally hosted originals, real page images, Foundation upload credits and distinct original authors',async()=>{
 for(const item of sampleLibrary){
  assert.equal(item.uploader,'New Tibet Foundation');assert.notEqual(item.credit,item.uploader);assert(item.pages>0);
  assert.match((await readFile(new URL('../public/'+item.document.slice(2),import.meta.url))).subarray(0,5).toString(),/^%PDF-/);
  const image=await readFile(new URL('../public/'+item.image.slice(2),import.meta.url));assert.equal(image[0],255);assert.equal(image[1],216);
 }
 assert.equal(searchLibrary({},'New Tibet Foundation').length,sampleLibrary.length);
});
test('Likes toggle once per member session and never change seed community counts',()=>{
 const state=member(),item=sampleLibrary[0],before=librarySocial(state,item).likes;
 assert.throws(()=>toggleLibraryLike({status:'guest'},item.id,{demo:true}),/Verify/);assert.throws(()=>toggleLibraryLike(state,item.id),/not connected/);assert.throws(()=>toggleLibraryLike(state,'missing',{demo:true}),/unavailable/);
 assert.equal(toggleLibraryLike(state,item.id,{demo:true}),true);assert.equal(librarySocial(state,item).likes,before+1);assert.equal(librarySocial(state,item).liked,true);
 assert.equal(toggleLibraryLike(state,item.id,{demo:true}),false);assert.equal(librarySocial(state,item).likes,before);assert.equal(item.likes,before);
});
test('Comments require verified membership, valid document and bounded nonempty text, and retain display names',()=>{
 const state={...member(),name:'A private pseudonym'},item=sampleLibrary[0],before=librarySocial(state,item).comments.length;
 assert.throws(()=>addLibraryComment({status:'guest'},item.id,'Hello',{demo:true}),/Verify/);assert.throws(()=>addLibraryComment(state,item.id,'Hello'),/not connected/);assert.throws(()=>addLibraryComment(state,'missing','Hello',{demo:true}),/unavailable/);
 for(const text of ['   ','x'.repeat(1501)])assert.throws(()=>addLibraryComment(state,item.id,text,{demo:true}),/1,500/);
 const comment=addLibraryComment(state,item.id,'  <img src=x onerror=alert(1)> A useful reference.  ',{demo:true});assert.equal(comment.author,state.name);assert.equal(comment.body,'<img src=x onerror=alert(1)> A useful reference.');assert.equal(librarySocial(state,item).comments.length,before+1);assert.equal(item.comments.length,before);
 const storage={setItem:(key,value)=>{storage.value=value;}};saveDemoInbox(storage,state);assert(!storage.value.includes(state.name));assert(!storage.value.includes('A useful reference'));assert(!storage.value.includes('libraryComments'));
});
test('Only approved uploads can receive community activity and uploaded files retain their uploader',()=>{
 const state={...member(),name:'Tenzin'},item=submitDemoContribution(state,draft(),{demo:true});assert.equal(item.uploader,'Tenzin');
 assert.throws(()=>toggleLibraryLike(state,item.id,{demo:true}),/unavailable/);assert.throws(()=>addLibraryComment(state,item.id,'Not approved',{demo:true}),/unavailable/);
 approveDemoContribution(state,item.id,{demo:true});toggleLibraryLike(state,item.id,{demo:true});addLibraryComment(state,item.id,'Thanks for sharing.',{demo:true});assert.equal(librarySocial(state,item).likes,1);assert.equal(librarySocial(state,item).comments.length,1);
});
test('PDF originals support byte-range reading and the local viewer can load embedded fonts and its worker',async()=>{
 const app=createApp({APP_MODE:'demo',DATA_DIR:'/private/tmp/new-tibet-library-tests'},{database:':memory:'});await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+app.server.address().port;
 try{
  const source=await readFile('public/assets/library/charter.pdf'),response=await fetch(base+'/assets/library/charter.pdf',{headers:{Range:'bytes=0-31'}});
  assert.equal(response.status,206);assert.equal(response.headers.get('content-type'),'application/pdf');assert.equal(response.headers.get('accept-ranges'),'bytes');assert.deepEqual(Buffer.from(await response.arrayBuffer()),source.subarray(0,32));
  const bad=await fetch(base+'/assets/library/charter.pdf',{headers:{Range:'bytes=40-10'}});assert.equal(bad.status,416);
  const worker=await fetch(base+'/pdf-worker.js');assert.equal(worker.status,200);assert.match(worker.headers.get('content-type'),/javascript/);await worker.arrayBuffer();
  const html=await fetch(base+'/');assert.match(html.headers.get('content-security-policy'),/font-src 'self' data: blob:/);assert.match(html.headers.get('content-security-policy'),/worker-src 'self'/);
 }finally{await new Promise(resolve=>app.server.close(resolve));}
});
