import {onboardingRewards,onboardingRewardLabels,eligibleOnboardingRewards,securityComplete,contactsComplete} from './onboarding-rewards.js';

export const rewardCelebrationKeys=Object.freeze(Object.keys(onboardingRewards).flatMap(stage=>[stage+':completed',stage+':credited']));
const completed=(state,stage)=>({
 join:Boolean(state.reference)||Boolean(String(state.name||'').trim()),
 book:Boolean(state.reference)&&['green','blue'].includes(state.book),
 security:Boolean(state.reference)&&securityComplete(state),
 passport:Boolean(state.reference)&&(state.passport?.verified===true||state.demoPassportTier===true),
 contacts:Boolean(state.reference)&&contactsComplete(state)
})[stage];
function claim(state,items,approval=false){
 if(state.status==='declined'||!items.length)return null;
 const accepted=state.status==='accepted',keys=items.map(item=>item.stage+':'+(accepted?'credited':'completed'));
 state.rewardCelebrations=[...new Set([...(state.rewardCelebrations||[]),...keys])];
 return {items,amount:items.reduce((total,item)=>total+item.amount,0),accepted,approval};
}
export function claimStageCelebration(state,stage){
 if(!Object.hasOwn(onboardingRewards,stage)||!completed(state,stage))return null;
 if(state.status==='accepted'&&!eligibleOnboardingRewards(state).some(item=>item.stage===stage))return null;
 const key=stage+':'+(state.status==='accepted'?'credited':'completed');
 if(state.rewardCelebrations?.includes(key))return null;
 return claim(state,[{stage,amount:onboardingRewards[stage],label:stage==='book'&&state.status!=='accepted'?'Book verification submitted':onboardingRewardLabels[stage]}]);
}
export function claimApprovalCelebration(state){
 const items=eligibleOnboardingRewards(state).filter(item=>!state.rewardCelebrations?.includes(item.stage+':credited'));
 return claim(state,items,true);
}

export function showRewardCelebration(reward,{demo,onContinue}){
 const titles={join:reward.accepted?'Welcome to New Tibet.':'First step complete.',book:reward.accepted?'You’re verified.':'Verification submitted.',security:'Wallet setup complete.',passport:'Passport step complete.',contacts:'Contact verified.'};
 const title=reward.approval?'You’re verified.':titles[reward.items[0].stage];
 const status=reward.accepted?(demo?'Added to your demo wallet':'Reward unlocked'):'Pending membership approval';
 const description=reward.accepted?(demo?'Your reward is now in the wallet activity timeline.':'Token distribution is planned; no tokens have been transferred.'):'The New Tibet Foundation will add this reward after your membership is approved.';
 const dialog=document.createElement('dialog');
 dialog.className='reward-celebration-dialog';dialog.setAttribute('aria-labelledby','reward-celebration-title');dialog.setAttribute('aria-describedby','reward-celebration-description');
 dialog.innerHTML=`<div class="reward-confetti" aria-hidden="true">${Array.from({length:36},(_,i)=>`<span style="--confetti-x:${(i*29+7)%100}%;--confetti-drift:${(i*17)%101-50}px;--confetti-delay:${i%6*.07}s;--confetti-turn:${i%2?-540:540}deg;--confetti-color:${['#eb8739','#1c2c60','#42705a','#f0b552'][i%4]}"></span>`).join('')}</div><div class="reward-celebration-content"><div class="reward-seal" aria-hidden="true"><svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg></div><p class="reward-congratulations">Congratulations</p><h2 id="reward-celebration-title">${title}</h2><div class="reward-celebration-amount"><strong>+${reward.amount}</strong><span>free $TIBET</span></div><p class="reward-celebration-status">${status}</p><p class="reward-celebration-source">From New Tibet Foundation</p>${reward.items.length>1?`<ul class="reward-celebration-breakdown" aria-label="Rewards earned">${reward.items.map(item=>`<li><span>${onboardingRewardLabels[item.stage]}</span><strong>+${item.amount}</strong></li>`).join('')}</ul>`:`<p class="reward-celebration-stage">${reward.items[0].label}</p>`}<p id="reward-celebration-description">${description}</p>${demo?'<p class="reward-celebration-demo">Demo reward · No real tokens transferred</p>':''}<button class="primary" type="button" id="reward-celebration-continue" autofocus>Continue</button></div>`;
 let finished=false;
 const finish=()=>{if(finished)return;finished=true;dialog.close();dialog.remove();onContinue?.();document.querySelector('#screen-title')?.focus({preventScroll:true});};
 dialog.querySelector('button').onclick=finish;
 dialog.addEventListener('cancel',event=>{event.preventDefault();finish();});
 document.body.append(dialog);dialog.showModal();
}
