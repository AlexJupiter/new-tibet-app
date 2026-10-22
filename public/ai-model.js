import {securityComplete} from './onboarding-rewards.js';

// Example prices and prepared answers for the prototype, never a live AI service.
export const aiCreditPacks=Object.freeze([
 {id:'small',credits:10,tibetUnits:100},
 {id:'medium',credits:50,tibetUnits:500},
 {id:'large',credits:100,tibetUnits:1000}
].map(pack=>Object.freeze(pack)));
export const initialAIState=()=>({credits:0,purchases:[],conversations:[],activeId:'',draft:''});
export const canBuyAICredits=state=>state.status==='accepted'&&Boolean(state.reference)&&securityComplete(state);
export const aiSuggestions=Object.freeze([
 {title:'Learn Tibetan',text:'Help me learn a Tibetan greeting.'},
 {title:'Translate a phrase',text:'Translate “hello” into Tibetan.'},
 {title:'Explore Tibetan culture',text:'What is Losar?'},
 {title:'Work with Tibetan text',text:'How can I digitise a Tibetan document?'}
]);
const validId=id=>typeof id==='string'&&/^[A-Za-z0-9-]{4,100}$/.test(id);
export function buyDemoAICredits(state,packId,id,{demo=false}={}){
 if(!demo)throw new Error('AI credit purchases are not connected yet.');
 if(!canBuyAICredits(state))throw new Error('Verify your membership and set up your wallet first.');
 const pack=aiCreditPacks.find(item=>item.id===packId);
 if(!pack||!validId(id))throw new Error('Choose an available AI credit pack.');
 const wallet=state.walletDemo,ai=state.ai||initialAIState();
 if(!wallet||!Number.isSafeInteger(wallet.tibetUnits)||wallet.tibetUnits<pack.tibetUnits)throw new Error('Your wallet does not have enough $TIBET for this pack.');
 if(!Array.isArray(wallet.processed)||!Number.isSafeInteger(ai.credits)||ai.credits<0||ai.credits>Number.MAX_SAFE_INTEGER-pack.credits)throw new Error('The demo balance could not be read.');
 if(wallet.processed.includes(id)||ai.purchases.includes(id))throw new Error('This credit purchase has already been completed.');
 const transaction={id,type:'ai-credits',tibetUnits:pack.tibetUnits,credits:pack.credits,label:`${pack.credits} AI credits`,createdAt:new Date().toISOString()};
 state.walletDemo={...wallet,tibetUnits:wallet.tibetUnits-pack.tibetUnits,processed:[...wallet.processed,id],transactions:[transaction,...wallet.transactions]};
 state.ai={...ai,credits:ai.credits+pack.credits,purchases:[...ai.purchases,id]};
 return transaction;
}
export function sampleAIReply(question){
 const text=question.toLowerCase();
 if(/hello|greet|tashi|བཀྲ་ཤིས/.test(text))return 'A common Tibetan greeting is:\n\nབཀྲ་ཤིས་བདེ་ལེགས།\nTashi delek\n\nIt expresses wishes for wellbeing and good fortune. You can use it as a warm greeting; the most natural phrasing depends on the occasion.';
 if(/losar|new year/.test(text))return 'Losar is the Tibetan New Year. It is a time for welcoming a new year, connecting with family and community, and celebrating Tibetan culture.\n\nPreparations and customs vary between communities. They can include special foods, cleaning the home, and exchanging good wishes.';
 if(/document|ocr|digiti|image|scan/.test(text))return 'Monlam.ai offers optical character recognition (OCR), which converts text in an image into editable text.\n\nFor a Tibetan document:\n1. Photograph the page clearly, with even lighting.\n2. Keep all text in frame and the page as flat as possible.\n3. Check the recognised Tibetan text against the original.\n\nVisit Monlam.ai to use its actual OCR tool. This demo does not upload or process documents.';
 if(/speech|audio|voice/.test(text))return 'Monlam.ai provides Tibetan speech-to-text tools, alongside translation and OCR. Speech recognition turns a recording into written text.\n\nA clear recording with little background noise gives you a better starting point. Always review names and specialised terms against the original recording.';
 return 'This is a prepared example of a Tibetan AI conversation. Monlam.ai develops tools for Tibetan translation, speech-to-text, and extracting text from images.\n\nTry “Help me learn a Tibetan greeting”, “What is Losar?” or “How can I digitise a Tibetan document?” to explore the sample replies.';
}
export function sendDemoAIMessage(ai,text,id,{demo=false}={}){
 if(!demo)throw new Error('The Monlam.ai connection is not active yet.');
 text=String(text||'').trim();
 if(!text||text.length>4000)throw new Error('Enter a message of up to 4,000 characters.');
 if(!validId(id)||ai.conversations.some(chat=>chat.messages.some(message=>message.id===id)))throw new Error('This message has already been sent.');
 if(!Number.isSafeInteger(ai.credits)||ai.credits<1)throw new Error('Add AI credits using $TIBET to send a message.');
 const current=ai.conversations.find(chat=>chat.id===ai.activeId);
 if(current&&current.messages.length>=100)throw new Error('Start a new chat to continue.');
 const chat=current||{id,title:Array.from(text).slice(0,48).join(''),messages:[]};
 const messages=[...chat.messages,{id,role:'user',text},{id:id+'-reply',role:'assistant',text:sampleAIReply(text),sample:true}];
 const updated={...chat,messages};
 return {...ai,credits:ai.credits-1,activeId:chat.id,draft:'',conversations:[updated,...ai.conversations.filter(item=>item.id!==chat.id)]};
}
