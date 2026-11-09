export const FOLLOWER_TIME_ZONE='America/Los_Angeles';
const dayPattern=/^\d{4}-\d{2}-\d{2}$/;
const validDay=day=>typeof day==='string'&&dayPattern.test(day)&&Number.isFinite(Date.parse(day))&&new Date(day).toISOString().slice(0,10)===day;
const clock=new Intl.DateTimeFormat('en-GB',{timeZone:FOLLOWER_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});

export function insightsMidnight(day) {
  if(!validDay(day))throw Error('invalid_date');
  const target=Date.parse(day+'T00:00:00Z');
  let instant=target;
  for(let i=0;i<3;i++){
    const p=Object.fromEntries(clock.formatToParts(new Date(instant)).map(p=>[p.type,p.value]));
    const local=Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
    instant+=target-local;
  }
  return new Date(instant).toISOString();
}

