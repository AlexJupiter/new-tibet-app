import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
import {Problem} from './core.mjs';
export const passportScope='new-tibet-identity-v1';
export function passportQuery(sdk,nonce){return sdk.createQuery().gte('age',18).disclose('nationality').bind('custom_data',nonce).facematch('strict').done().query;}
export function validatePassportPayload(data,nonce){
 const result=data.result;
 if(!result||typeof result!=='object'||Array.isArray(result)||Object.keys(result).some(k=>!['age','nationality','bind','facematch'].includes(k)))throw new Problem('Only age, nationality, the request binding, and face-check proofs are allowed.');
 if(result.age?.gte?.result!==true||result.age?.gte?.expected!==18||Object.keys(result.age).some(k=>k!=='gte'))throw new Problem('A proof of age 18 or older is required.');
 if(Object.keys(result.age.gte).some(k=>!['result','expected'].includes(k)))throw new Problem('Do not disclose your age or birth date.');
 const country=result.nationality?.disclose?.result;
 if(typeof country!=='string'||!/^[A-Z]{3}$/.test(country)||Object.keys(result.nationality).some(k=>k!=='disclose')||Object.keys(result.nationality.disclose).some(k=>k!=='result'))throw new Problem('Disclose only your country of nationality.');
 if(result.bind?.custom_data!==nonce||Object.keys(result.bind).length!==1)throw new Problem('The passport proof does not belong to this session.');
 if(result.facematch?.passed!==true||result.facematch?.mode!=='strict'||Object.keys(result.facematch).some(k=>!['passed','mode'].includes(k)))throw new Problem('The ZKPassport face check must pass.');
 if(!Array.isArray(data.proofs)||!data.proofs.length||data.proofs.length>32)throw new Problem('Passport cryptographic proofs are required.');
 const fields=['proof','vkeyHash','version','name','committedInputs','index','total'];
 const proofs=data.proofs.map(p=>{if(!p||typeof p!=='object'||Object.keys(p).some(k=>!fields.includes(k))||typeof p.proof!=='string'||p.proof.length<64)throw new Problem('Invalid passport proof format.');return Object.fromEntries(fields.filter(k=>p[k]!==undefined).map(k=>[k,p[k]]));});
 return {proofs,result,country};
}
export async function verifyPassport(data,challenge,env,verify){
 const payload=validatePassportPayload(data,challenge.nonce);
 const {ZKPassport,NullifierType}=require('@zkpassport/sdk');const sdk=new ZKPassport(challenge.domain);
 const originalQuery=passportQuery(sdk,challenge.nonce);
 let checked;try{checked=await (verify||((options)=>sdk.verify(options)))({proofs:payload.proofs,queryResult:payload.result,originalQuery,scope:passportScope,devMode:false,uniqueIdentifierType:NullifierType.NON_SALTED,validity:3600,verifierMode:'local',writingDirectory:env.DATA_DIR+'/passport-artifacts',...(env.ZKPASSPORT_RPC_URL?{config:{rpcUrl:env.ZKPASSPORT_RPC_URL}}:{})});}catch{throw new Problem('Passport proof verification is unavailable. Please try again.',502);}
 if(!checked.verified||!checked.uniqueIdentifier||checked.uniqueIdentifierType!==NullifierType.NON_SALTED||Object.keys(checked.queryResultErrors||{}).length)throw new Problem('The passport proofs could not be verified.',403);
 return {country:payload.country,proofs:payload.proofs,uniqueIdentifier:checked.uniqueIdentifier};
}
