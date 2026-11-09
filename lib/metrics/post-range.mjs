import {accountPeriod,DEFAULT_ACCOUNT_CUTOFF_TIME,ACCOUNT_TIME_ZONE,WINDOW_MS} from './account-window.mjs';

export const POST_TIME_ZONE=ACCOUNT_TIME_ZONE;

// Use the same first stored observation window as profile/followers.
export const POST_BOUNDARY_WINDOW_MS=WINDOW_MS;
export const MISSING_RECORD_MAX_AGE_DAYS=30;
const missingRecordAgeMs=MISSING_RECORD_MAX_AGE_DAYS*24*60*60_000;
export function aggregatePostRange(posts,start,end,{inventoryVerified=false,time=DEFAULT_ACCOUNT_CUTOFF_TIME}={}) {
  const {from,until}=accountPeriod(start,end,time,new Date(),31);
  const gains=[];let missing=0,partial=0,ignoredMissing=0,ignoredPartial=0,newPosts=0,negative=0;
  for(const p of posts) {
    const born=Date.parse(p.published_at);
    if(!Number.isFinite(born)||born>=until)continue;
    const candidates=(p.observations??[]).filter(s=>Number.isFinite(s.views)&&s.views>=0&&Date.parse(s.observed_at)>=Math.max(from,born)&&Date.parse(s.observed_at)<until+POST_BOUNDARY_WINDOW_MS)
      .sort((a,b)=>Date.parse(a.observed_at)-Date.parse(b.observed_at));
    const boundary=candidates.find(s=>Date.parse(s.observed_at)>=until);
    const samples=candidates.filter(s=>Date.parse(s.observed_at)<=until||s.observed_at===boundary?.observed_at);
    const first=samples[0],last=samples.at(-1),isNew=born>=from;
    // Judge age at the missing boundary, never at the current viewing date.
    const startMissing=!isNew&&(!first||Date.parse(first.observed_at)>=from+POST_BOUNDARY_WINDOW_MS);
    const endMissing=!last||Date.parse(last.observed_at)<until;
    const requiresMissingRecord=(startMissing&&from-born<=missingRecordAgeMs)||(endMissing&&until-born<=missingRecordAgeMs);
    if(samples.some((s,i)=>i>0&&Date.parse(s.observed_at)===Date.parse(samples[i-1].observed_at)&&s.views!==samples[i-1].views)){missing++;continue;}
    if(!last||(!isNew&&(!first||Date.parse(last.observed_at)<=Date.parse(first.observed_at)))){if(requiresMissingRecord)missing++;else ignoredMissing++;continue;}
    const observedStart=isNew?new Date(born).toISOString():first.observed_at;
    const delta=last.views-(isNew?0:first.views);
    const complete=(isNew||Date.parse(observedStart)<from+POST_BOUNDARY_WINDOW_MS)&&Date.parse(last.observed_at)>=until;
    if(!complete){if(requiresMissingRecord)partial++;else ignoredPartial++;}
    if(isNew)newPosts++;
    if(delta<0)negative++;
    gains.push({id:p.id,delta,views:last.views,observed_start:observedStart,observed_at:last.observed_at,partial:!complete});
  }
  gains.sort((a,b)=>b.delta-a.delta||a.id.localeCompare(b.id));
  const complete=missing===0&&partial===0&&(gains.length>0||inventoryVerified);
  const recordsComplete=complete&&ignoredMissing===0&&ignoredPartial===0;
  const stamps=gains.flatMap(p=>[p.observed_start,p.observed_at]).sort((a,b)=>Date.parse(a)-Date.parse(b));
  return {views_delta:gains.length||recordsComplete?gains.reduce((s,p)=>s+p.delta,0):null,
    top:gains[0]?{...gains[0],partial:!complete}:null,missing_posts:missing,partial_posts:partial,
    ignored_missing_posts:ignoredMissing,ignored_partial_posts:ignoredPartial,
    records_complete:recordsComplete,missing_record_max_age_days:MISSING_RECORD_MAX_AGE_DAYS,
    measured_posts:gains.length,new_posts:newPosts,negative_posts:negative,
    range_complete:complete,range_inventory_verified:inventoryVerified,
    views_observed_start:stamps[0]??null,views_observed_end:stamps.at(-1)??null,
    observation_timing:[],missing_dates:[],partial_dates:[],observed_days:0,complete_days:0,
    calculation_basis:'within_period_observations'};
}

