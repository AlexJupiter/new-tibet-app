import {securityComplete} from './onboarding-rewards.js';

export const libraryReward=100;
export const libraryCategories=Object.freeze(['History','Language','Literature','Heritage','Governance']);
export const libraryLanguages=Object.freeze(['Tibetan','English','Tibetan & English','Other']);
export const sampleLibrary=Object.freeze([
 {id:'charter',title:'Charter of the Tibetans in Exile',category:'Governance',language:'English',kind:'Official document',credit:'Tibetan Parliament-in-Exile',description:'Read the official English translation of the Charter, including fundamental rights and the institutions of Tibetan self-government.',source:'https://tibet.net/about-cta/charter/',edition:'Official English translation · 2021 publication',rights:'Official publication of the Tibetan Parliament-in-Exile',pages:45,startPage:1,likes:38,note:'The preamble begins on PDF page 7. Original pagination is preserved.'},
 {id:'folk-tales',title:'Folk Tales from Tibet',category:'Literature',language:'English',kind:'Illustrated book',credit:'W. F. O’Connor · Illustrations by a Tibetan artist',description:'An illustrated collection of oral stories and songs, published in 1906. Read the historical edition with its original artwork.',source:'https://commons.wikimedia.org/wiki/File:Folk_Tales_from_Tibet_(1906).djvu',edition:'1906 historical edition',rights:'Public domain · Original historical text and illustrations',pages:224,startPage:9,likes:24,note:'The first story begins on PDF page 19. This historical translation reflects the language and perspective of its period.'},
 {id:'journey',title:'Journey to Lhasa and Central Tibet',category:'Heritage',language:'English',kind:'Illustrated travel account',credit:'Sarat Chandra Das · Edited by W. W. Rockhill',description:'Maps, illustrations and a nineteenth-century account of travel through Tibet, preserved in the 1902 edition.',source:'https://archive.org/details/journeytolhasace00dass',edition:'1902 historical edition',rights:'Public domain · Authors died in 1917 and 1914',pages:332,startPage:11,likes:19,note:'The map is on PDF page 24. This is a historical account, rather than a contemporary guide.'},
 {id:'dictionary',title:'An English–Tibetan Dictionary',category:'Language',language:'Tibetan & English',kind:'Dictionary',credit:'Lama Kazi Dawa Samdup · University of Calcutta',description:'Explore the Tibetan scholar’s 1919 dictionary, with approximately twenty thousand English words and their Tibetan equivalents.',source:'https://commons.wikimedia.org/wiki/File:An_English-Tibetan_dictionary,_containing_a_vocabulary_of_approximately_twenty_thousand_words_with_their_Tibetan_equivalents_(IA_englishtibetandi00zlabrich).pdf',edition:'1919 historical edition',rights:'Public domain · Kazi Dawa Samdup, 1868–1922',pages:1012,startPage:5,likes:31,note:'Dictionary entries begin on PDF page 19. Use the page number control to jump through the original scan.'},
 {id:'grammar',title:'Tibetan Grammar',category:'Language',language:'Tibetan & English',kind:'Language reference',credit:'H. A. Jäschke · Second edition prepared by H. Wenzel',description:'A digitised 1883 guide to Tibetan grammar, covering the alphabet, pronunciation and sentence structure.',source:'https://commons.wikimedia.org/wiki/File:Tibetan_grammar_(IA_b30094161).pdf',edition:'1883 historical edition',rights:'Public domain · Wellcome Library scan',pages:124,startPage:9,likes:16,note:'The alphabet begins on PDF page 17. Scanned historical text may contain imperfect OCR.'},
 {id:'language-hearing',title:'Teaching and Learning Tibetan',category:'History',language:'English',kind:'Hearing transcript',credit:'Congressional-Executive Commission on China',description:'Read the full 2003 roundtable transcript on the role of Tibetan language in education, culture and Tibet’s future.',source:'https://www.govinfo.gov/content/pkg/CHRG-108jhrg87398/pdf/CHRG-108jhrg87398.pdf',edition:'7 April 2003 · Official transcript',rights:'Public-domain U.S. government publication',pages:44,startPage:1,likes:12,note:'The roundtable discussion begins on PDF page 5. The complete transcript is available here.'}
].map(item=>Object.freeze({...item,uploader:'New Tibet Foundation',document:'./assets/library/'+item.id+'.pdf',image:'./assets/library/'+item.id+'.jpg',imageAlt:'Original document preview: '+item.title,comments:Object.freeze([{id:item.id+'-curator',author:'New Tibet Foundation',body:item.note,sample:true}])})));

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
 return libraryItems(state).filter(item=>(!category||item.category===category)&&[item.title,item.description,item.credit,item.language,item.uploader].some(value=>String(value).toLocaleLowerCase().includes(text)));
}
export const findLibraryItem=(state,id)=>libraryItems(state).find(item=>item.id===id);
export const librarySocial=(state,item)=>({liked:(state.libraryLikes||[]).includes(item.id),likes:(item.likes||0)+Number((state.libraryLikes||[]).includes(item.id)),comments:[...(item.comments||[]),...(state.libraryComments||[]).filter(comment=>comment.itemId===item.id)]});
function requireCommunityMember(state,id,demo){
 if(!demo)throw new Error('Library community services are not connected in this prototype.');
 if(!canContribute(state))throw new Error('Verify your membership to like or comment on Library documents.');
 const item=findLibraryItem(state,id);if(!item)throw new Error('This document is unavailable.');return item;
}
export function toggleLibraryLike(state,id,{demo=false}={}){
 requireCommunityMember(state,id,demo);state.libraryLikes||=[];
 const liked=state.libraryLikes.includes(id);state.libraryLikes=state.libraryLikes.filter(value=>value!==id);if(!liked)state.libraryLikes.push(id);return !liked;
}
export function addLibraryComment(state,id,value,{demo=false}={}){
 requireCommunityMember(state,id,demo);
 const body=String(value||'').trim();if(!body||body.length>1500)throw new Error('Write a comment between 1 and 1,500 characters.');
 if((state.libraryComments||[]).length>=100)throw new Error('This demo supports up to 100 comments.');
 const comment={id:crypto.randomUUID(),itemId:id,author:String(state.name||'New Tibet member').trim().slice(0,120),body,createdAt:new Date().toISOString()};
 state.libraryComments||=[];state.libraryComments.push(comment);return comment;
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
 const contribution={id:crypto.randomUUID(),ownerReference:state.reference,uploader:String(state.name||'New Tibet member').trim().slice(0,120),title,description,credit,source,category:draft.category,language:draft.language,kind:file?'Uploaded file':'Source link',fingerprint,file,status:'pending',createdAt:new Date().toISOString()};
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
