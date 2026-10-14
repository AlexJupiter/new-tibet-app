import test from 'node:test';
import assert from 'node:assert/strict';
import {canContribute,libraryReward,sampleLibrary,searchLibrary,librarySource,validateLibraryFile,submitDemoContribution,approveDemoContribution,applyDemoLibraryRewards,libraryRewardRecords} from '../public/library-model.js';
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
