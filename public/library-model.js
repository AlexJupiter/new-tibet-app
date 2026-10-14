import {securityComplete} from './onboarding-rewards.js';

export const libraryReward=100;
export const libraryCategories=Object.freeze(['History','Language','Literature','Heritage','Governance']);
export const libraryLanguages=Object.freeze(['Tibetan','English','Tibetan & English','Other']);
export const sampleLibrary=Object.freeze([
 {id:'charter',title:'Charter of the Tibetans in Exile',category:'Governance',language:'Tibetan & English',kind:'Document',credit:'Central Tibetan Administration',description:'The Charter and its official English translation, published by the CTA.',source:'https://tibet.net/about-cta/charter/'},
 {id:'oral-history',title:'Voices of Tibetan elders',category:'History',language:'Tibetan & English',kind:'Interviews',credit:'Tibet Oral History Project',description:'First-person memories of life in Tibet, with interview videos and English transcripts.',source:'https://www.tibetoralhistory.org/interviewcollection.php'},
 {id:'manuscripts',title:'Tibetan books and manuscripts',category:'Heritage',language:'Tibetan',kind:'Collection',credit:'Library of Tibetan Works and Archives',description:'Explore a collection of manuscripts, historical documents and Tibetan publications.',source:'https://tibetanlibrary.org/tibetan-books-and-manuscript-library1/'},
 {id:'buddhist-texts',title:'Digitised Tibetan literature',category:'Literature',language:'Tibetan',kind:'Digital archive',credit:'Buddhist Digital Resource Center',description:'An online archive preserving Tibetan and Buddhist texts for readers and researchers.',source:'https://library.bdrc.io/'},
 {id:'dictionary',title:'Monlam Grand Dictionary',category:'Language',language:'Tibetan & English',kind:'Dictionary',credit:'Monlam Grand Dictionary',description:'Look up Tibetan words and explore Tibetan–English and English–Tibetan dictionaries.',source:'https://monlamdictionary.com/'},
 {id:'canon',title:'The Tibetan Buddhist canon in translation',category:'Literature',language:'English',kind:'Reading room',credit:'84000',description:'Read freely available translations of texts from the Tibetan Buddhist canon.',source:'https://84000.co/'}
].map(item=>Object.freeze(item)));

export const canContribute=state=>state.status==='accepted'&&Boolean(state.reference);
export function librarySource(value){
 const text=String(value||'').trim();if(!text)return '';
 let url;try{url=new URL(text);}catch{throw new Error('Enter a complete source URL, starting with https://.');}
 if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new Error('Use an http or https source URL without sign-in details.');
 url.hash='';return url.href;
}
const sourceKey=value=>librarySource(value).replace(/\/$/,'');
export function validateLibraryFile(file){
 if(!file)return;
 const extensions={pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',txt:'text/plain',mp3:'audio/mpeg',mp4:'video/mp4'};
 const extension=String(file.name||'').split('.').at(-1).toLowerCase();
 if(!extensions[extension]||file.type&&file.type!==extensions[extension])throw new Error('Choose a PDF, JPG, PNG, TXT, MP3 or MP4 file.');
 if(!Number.isSafeInteger(file.size)||file.size<=0||file.size>25*1024*1024)throw new Error('Choose a non-empty file smaller than 25 MB.');
}
export const libraryItems=state=>[...(state.libraryContributions||[]).filter(item=>item.status==='approved'),...sampleLibrary];
export function searchLibrary(state,query='',category=''){
 const text=String(query).trim().toLocaleLowerCase();
 return libraryItems(state).filter(item=>(!category||item.category===category)&&[item.title,item.description,item.credit,item.language].some(value=>String(value).toLocaleLowerCase().includes(text)));
}
export function submitDemoContribution(state,draft,{demo=false,file=null,fingerprint=''}={}){
 if(!demo)throw new Error('Library publishing is not connected in this prototype.');
 if(!canContribute(state))throw new Error('Verify your membership before contributing to Library.');
 const title=String(draft.title||'').trim(),description=String(draft.description||'').trim(),credit=String(draft.credit||'').trim(),source=librarySource(draft.source);
 if(title.length<6||title.length>120)throw new Error('Use a title between 6 and 120 characters.');
 if(description.length<20||description.length>2000)throw new Error('Describe this material in 20–2,000 characters.');
 if(credit.length<3||credit.length>160)throw new Error('Credit the original author, collection or source.');
 if(!libraryCategories.includes(draft.category)||!libraryLanguages.includes(draft.language))throw new Error('Choose a category and language.');
 if(draft.permission!==true)throw new Error('Confirm that you have permission to share this material.');
 validateLibraryFile(file);
 if(!file&&!source)throw new Error('Attach a file or add a source URL.');
 if(file&&!/^[a-f0-9]{64}$/.test(fingerprint))throw new Error('The file could not be prepared. Choose it again.');
 if((state.libraryContributions||[]).length>=50)throw new Error('This demo supports up to 50 contributions.');
 const existing=[...(state.libraryContributions||[]),...sampleLibrary];
 if(existing.some(item=>source&&item.source&&sourceKey(item.source)===sourceKey(source)||fingerprint&&item.fingerprint===fingerprint))throw new Error('This source or file is already in Library. Add new material instead.');
 const contribution={id:crypto.randomUUID(),ownerReference:state.reference,title,description,credit,source,category:draft.category,language:draft.language,kind:file?'Uploaded file':'Source link',fingerprint,file,status:'pending',createdAt:new Date().toISOString()};
 state.libraryContributions||=[];state.libraryContributions.unshift(contribution);return contribution;
}
export function approveDemoContribution(state,id,{demo=false}={}){
 if(!demo||!canContribute(state))throw new Error('Demo review requires verified membership.');
 const item=state.libraryContributions?.find(item=>item.id===id);if(!item)throw new Error('This contribution is unavailable.');
 if(item.ownerReference!==state.reference)throw new Error('This contribution belongs to a different membership.');
 if(item.status==='approved')return false;
 if(item.status!=='pending')throw new Error('This contribution is not awaiting review.');
 item.status='approved';item.approvedAt=new Date().toISOString();
 state.libraryRewards||=[];
 if(!state.libraryRewards.some(reward=>reward.id===id))state.libraryRewards.push({id,createdAt:item.approvedAt});
 return true;
}
export function libraryRewardRecords(records){
 const seen=new Set();
 return (Array.isArray(records)?records:[]).slice(0,50).filter(item=>item&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(item.id)&&Number.isFinite(Date.parse(item.createdAt))&&!seen.has(item.id)&&seen.add(item.id)).map(({id,createdAt})=>({id,createdAt}));
}
export const libraryRewardId=(reference,id)=>reference+':library:'+id;
export function applyDemoLibraryRewards(wallet,state){
 if(!canContribute(state)||!securityComplete(state))return wallet;
 for(const reward of libraryRewardRecords(state.libraryRewards)){
  const id=libraryRewardId(state.reference,reward.id);if(wallet.processed.includes(id))continue;
  wallet={...wallet,tibetUnits:wallet.tibetUnits+libraryReward*100,processed:[...wallet.processed,id],transactions:[{id,type:'library-reward',tibetUnits:libraryReward*100,label:'Library contribution approved',createdAt:reward.createdAt},...wallet.transactions]};
 }
 return wallet;
}
