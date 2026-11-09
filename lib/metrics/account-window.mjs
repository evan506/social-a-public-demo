import {insightsMidnight} from './insights-midnight.mjs';

export const DEFAULT_ACCOUNT_CUTOFF_TIME='16:00';
export const ACCOUNT_TIME_ZONE='Asia/Seoul';
export const WINDOW_MS=15*60_000;
const numeric=v=>typeof v==='number'&&Number.isFinite(v);
const day=d=>/^\d{4}-\d{2}-\d{2}$/.test(d??'')&&new Date(d).toISOString().slice(0,10)===d;
const shift=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*86400_000).toISOString().slice(0,10);
const pacificClock=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'});
const pacificDay=t=>{
  const p=Object.fromEntries(pacificClock.formatToParts(new Date(t)).map(p=>[p.type,p.value]));
  return `${p.year}-${p.month}-${p.day}`;
};

export function accountPeriod(start,end,time=DEFAULT_ACCOUNT_CUTOFF_TIME,now=new Date(),maxDays=31) {
  if(!day(start)||!day(end)||start>end||!/^([01]\d|2[0-3]):(00|15|30|45)$/.test(time))throw Error('invalid_range');
  const days=(Date.parse(end)-Date.parse(start))/86400_000+1;
  if(days>maxDays)throw Error('range_too_long');
  const from=Date.parse(`${shift(start,-1)}T${time}:00+09:00`),until=Date.parse(`${end}T${time}:00+09:00`);
  return {start,end,time,timezone:ACCOUNT_TIME_ZONE,total_days:days,start_boundary:new Date(from).toISOString(),end_boundary:new Date(until).toISOString(),now:new Date(now).toISOString(),ongoing:+now<until,from,until};
}

function series(rows,key,p) {
  const ordered=rows.filter(r=>numeric(r[key])&&r[key]>=0&&Date.parse(r.observed_at)>=p.from&&Date.parse(r.observed_at)<p.until+WINDOW_MS&&Date.parse(r.observed_at)<=Date.parse(p.now))
    .sort((a,b)=>Date.parse(a.observed_at)-Date.parse(b.observed_at));
  const unique=[];
  for(const row of ordered){
    const prior=unique.at(-1);
    if(prior&&Date.parse(prior.observed_at)===Date.parse(row.observed_at)){
      if(prior[key]!==row[key])return {rows:[],conflict:true};
    }else unique.push(row);
  }
  const end=unique.find(r=>Date.parse(r.observed_at)>=p.until);
  const samples=unique.filter(r=>Date.parse(r.observed_at)<=p.until||r===end);
  const first=samples[0],last=samples.at(-1);
  return {rows:samples,first,last,complete:!!first&&Date.parse(first.observed_at)<p.from+WINDOW_MS&&!!end,conflict:false};
}

export function observedProfile(rows,p) {
  const s=series(rows,'profile_views',p),reasons=[];
  if(s.conflict)return {value:null,status:'unavailable',reasons:['동시각 프로필 값 충돌'],samples:0};
  if(s.rows.length<2)return {value:null,status:'unavailable',reasons:['비교 가능한 프로필 기록 부족'],samples:s.rows.length};
  let value=0,resets=0,gaps=0,resetGaps=0,corrections=0;
  for(let i=1;i<s.rows.length;i++){
    const a=s.rows[i-1],b=s.rows[i],ta=Date.parse(a.observed_at),tb=Date.parse(b.observed_at);
    const midnight=Date.parse(insightsMidnight(pacificDay(tb)));
    const crossesReset=ta<midnight&&midnight<=tb;
    if(tb-ta>WINDOW_MS+60_000){gaps++;if(crossesReset)resetGaps++;}
    if(crossesReset){
      // The previous interval's unobserved tail cannot be recovered from snapshots.
      value+=b.profile_views;resets++;
    }else{
      const delta=b.profile_views-a.profile_views;
      value+=delta;if(delta<0)corrections++;
    }
  }
  if(!s.complete)reasons.push(p.ongoing?'종료 시각 전: 현재 기록까지 부분 집계':'프로필 시작·종료 경계 기록 부족');
  // Within one daily counter, adjacent differences telescope across missing samples.
  // Only a gap crossing a reset can lose an additional unobserved counter segment.
  if(resetGaps)reasons.push('프로필 초기화 시점 기록 누락');
  const notes=[];
  if(resets)notes.push('일별 초기화 반영: 초기화 직전 저장값까지 집계');
  if(corrections)notes.push('초기화 경계 밖 감소·API 수정 반영');
  return {value,notes,status:reasons.length?'partial':'ok',reasons,samples:s.rows.length,resets,gaps,reset_gaps:resetGaps,non_reset_gaps:gaps-resetGaps,corrections,observed_start:s.first.observed_at,observed_end:s.last.observed_at};
}

export function aggregateAccountWindow(raw,p) {
  const accounts=raw.accounts.map(meta=>{
    const rows=raw.snapshots.filter(r=>r.handle===meta.handle);
    const profile=observedProfile(rows,p),s=series(rows,'followers_count',p);
    const first=s.first&&Date.parse(s.first.observed_at)<p.from+WINDOW_MS?s.first:null;
    const last=s.last&&Date.parse(s.last.observed_at)>=p.until?s.last:null;
    return {handle:meta.handle,
      profile:{value:profile.value,status:profile.status,reasons:profile.reasons,samples:profile.samples,resets:profile.resets??0,gaps:profile.gaps??0,reset_gaps:profile.reset_gaps??0,non_reset_gaps:profile.non_reset_gaps??0,notes:profile.notes??[],observed_start:profile.observed_start??null,observed_at:profile.observed_end??null},
      follower:{status:s.conflict?'unavailable':first&&last?'ok':first||last?'partial':'unavailable',reason:p.ongoing?'pending_boundary':!first||!last?'missing_boundary':null,
        followers_start:first?.followers_count??null,followers_end:last?.followers_count??null,followers_delta:first&&last?last.followers_count-first.followers_count:null,
        followers_start_at:first?.observed_at??null,followers_end_at:last?.observed_at??null}};
  });
  return {start:p.start,end:p.end,time:p.time,timezone:p.timezone,start_boundary:p.start_boundary,end_boundary:p.end_boundary,ongoing:p.ongoing,generated_at:raw.generated_at,accounts};
}
