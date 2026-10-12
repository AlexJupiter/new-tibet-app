import {onboardingRewards,onboardingRewardLabels,eligibleOnboardingRewards,securityComplete,contactsComplete} from './onboarding-rewards.js';

export const rewardCelebrationKeys=Object.freeze(Object.keys(onboardingRewards).flatMap(stage=>[stage+':completed',stage+':unlocked',stage+':credited']));
const celebrationStatus=state=>state.status==='accepted'?(securityComplete(state)?'credited':'unlocked'):'completed';
const completed=(state,stage)=>({
 join:Boolean(state.reference)||Boolean(String(state.name||'').trim()),
 book:Boolean(state.reference)&&['green','blue'].includes(state.book),
 security:Boolean(state.reference)&&securityComplete(state),
 passport:Boolean(state.reference)&&(state.passport?.verified===true||state.demoPassportTier===true),
 contacts:Boolean(state.reference)&&contactsComplete(state)
})[stage];
function claim(state,items,approval=false){
 if(state.status==='declined'||!items.length)return null;
 const accepted=state.status==='accepted',walletReady=securityComplete(state),credited=accepted&&walletReady,keys=items.map(item=>item.stage+':'+celebrationStatus(state));
 state.rewardCelebrations=[...new Set([...(state.rewardCelebrations||[]),...keys])];
 return {items,amount:items.reduce((total,item)=>total+item.amount,0),accepted,walletReady,credited,approval};
}
export function claimStageCelebration(state,stage){
 if(!Object.hasOwn(onboardingRewards,stage)||!completed(state,stage))return null;
 if(state.status==='accepted'&&!eligibleOnboardingRewards(state).some(item=>item.stage===stage))return null;
 const key=stage+':'+celebrationStatus(state);
 if(state.rewardCelebrations?.includes(key))return null;
 return claim(state,[{stage,amount:onboardingRewards[stage],label:state.status!=='accepted'&&['join','book'].includes(stage)?stage==='book'?'Book verification submitted':'Membership details saved':onboardingRewardLabels[stage]}]);
}
export function claimApprovalCelebration(state){
 const items=eligibleOnboardingRewards(state).filter(item=>!state.rewardCelebrations?.includes(item.stage+':'+celebrationStatus(state)));
 return claim(state,items,true);
}
export function claimWalletCelebration(state){
 if(!securityComplete(state))return null;
 const reward=state.status==='accepted'?claimApprovalCelebration(state):claimStageCelebration(state,'security');
 return reward?{...reward,approval:false,walletSetup:true}:null;
}
export function claimMembershipCelebration(state){
 if(!state.reference||!['green','blue'].includes(state.book))return null;
 const rewards=['book','join'].map(stage=>claimStageCelebration(state,stage)).filter(Boolean);
 if(!rewards.length)return null;
 return {...rewards[0],items:rewards.flatMap(reward=>reward.items),amount:rewards.reduce((sum,reward)=>sum+reward.amount,0)};
}

export function showRewardCelebration(reward,{demo,onContinue}){
 const titles={join:reward.accepted?'Welcome to New Tibet.':'First step complete.',book:reward.accepted?'You’re verified.':'Verification submitted.',security:'Wallet setup complete.',passport:'Passport step complete.',contacts:'Contact verified.'};
 const title=reward.walletSetup?'Wallet setup complete.':reward.approval?'You’re verified.':titles[reward.items[0].stage];
 const needsWallet=reward.accepted&&!reward.walletReady;
 const status=needsWallet?'Wallet setup required to receive this reward':reward.credited?(demo?'Added to your demo wallet':'Reward unlocked'):'Pending membership approval';
 const description=needsWallet?'Your verification is complete. Set up your wallet to receive these free $TIBET from the New Tibet Foundation.':reward.credited?(demo?'Your reward is now in the wallet activity timeline.':'Token distribution is planned; no tokens have been transferred.'):reward.walletReady?'Your wallet is set up. The New Tibet Foundation reward will be available after your membership is approved.':'After verification, set up your wallet to receive this reward from the New Tibet Foundation.';
 const dialog=document.createElement('dialog');
 dialog.className='reward-celebration-dialog';dialog.setAttribute('aria-labelledby','reward-celebration-title');dialog.setAttribute('aria-describedby','reward-celebration-description');
 dialog.innerHTML=`<div class="reward-confetti" aria-hidden="true">${Array.from({length:36},(_,i)=>`<span style="--confetti-x:${(i*29+7)%100}%;--confetti-drift:${(i*17)%101-50}px;--confetti-delay:${i%6*.07}s;--confetti-turn:${i%2?-540:540}deg;--confetti-color:${['#eb8739','#1c2c60','#42705a','#f0b552'][i%4]}"></span>`).join('')}</div><div class="reward-celebration-content"><div class="reward-seal" aria-hidden="true"><svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg></div><p class="reward-congratulations">Congratulations</p><h2 id="reward-celebration-title">${title}</h2><div class="reward-celebration-amount"><strong>+${reward.amount}</strong><span>free $TIBET</span></div><p class="reward-celebration-status">${status}</p><p class="reward-celebration-source">From New Tibet Foundation</p>${reward.items.length>1?`<ul class="reward-celebration-breakdown" aria-label="Rewards earned">${reward.items.map(item=>`<li><span>${item.label||onboardingRewardLabels[item.stage]}</span><strong>+${item.amount}</strong></li>`).join('')}</ul>`:`<p class="reward-celebration-stage">${reward.items[0].label}</p>`}<p id="reward-celebration-description">${description}</p>${demo?'<p class="reward-celebration-demo">Demo reward · No real tokens transferred</p>':''}<button class="primary" type="button" id="reward-celebration-continue" autofocus>Continue</button></div>`;
 if(needsWallet)dialog.querySelector('button').textContent='Set up wallet';
 let finished=false;
 const finish=()=>{if(finished)return;finished=true;dialog.close();dialog.remove();onContinue?.();document.querySelector('#screen-title')?.focus({preventScroll:true});};
 dialog.querySelector('button').onclick=finish;
 dialog.addEventListener('cancel',event=>{event.preventDefault();finish();});
 document.body.append(dialog);dialog.showModal();
}
