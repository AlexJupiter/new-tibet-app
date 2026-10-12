import {demoCampaigns,advanceDemoCampaign} from './member-model.js';
import {securityComplete} from './onboarding-rewards.js';
export function campaignPreview(state,demo,id){
 const campaign=demoCampaigns.find(item=>item.id===id);if(!campaign)return '';
 const day=state.rewardDays?.[id]||0,walletReady=securityComplete(state);
 return `<details class="integration-campaign" ${day?'open':''}><summary>Try a sample reward <span>${day}/7 days</span></summary><p>Example: 100 free $TIBET for 7 consecutive learning days. This campaign is a proposal.</p><div class="campaign-days" aria-label="${day} of 7 demo days completed">${Array.from({length:7},(_,i)=>`<span class="${i<day?'completed':''}">${i<day?'✓':i+1}</span>`).join('')}</div><button class="secondary" type="button" data-campaign="${id}" ${!demo||state.status!=='accepted'||!walletReady||day===7?'disabled':''}>${day===7?'Reward added in demo':state.status!=='accepted'?'Verify to try rewards':!walletReady?'Set up wallet to receive rewards':demo?'Simulate next day':'Coming later'}</button><p class="section-note">Local demo only. No app usage is tracked and no real tokens are transferred.</p></details>`;
}
export function bindRewardCampaigns(screen,state,demo,rerender,notice){
 screen.querySelectorAll('[data-campaign]').forEach(button=>button.onclick=()=>{if(!demo)return;try{const id=button.dataset.campaign,days=advanceDemoCampaign(state,id);rerender();const next=screen.querySelector('[data-campaign="'+id+'"]');(next?.disabled?next.closest('details').querySelector('summary'):next)?.focus();notice(days===7?'100 $TIBET added to the demo wallet. No real tokens were transferred.':'Demo learning day recorded.');}catch(error){notice(error.message);}});
}
