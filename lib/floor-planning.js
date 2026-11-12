// Helpers puros para planejamento 6×1 com domingo escolhido e pausas distribuídas.
// A escala é uma proposta operacional; cobertura, acordos e limites de descanso dependem de validação humana.
const iso=(d)=>d.toISOString().slice(0,10);
const atNoon=(day)=>new Date(day+'T12:00:00Z');
const MINUTES=[10,20,10];
const pad=(n)=>String(n).padStart(2,'0');
const minute=(value)=>{
 if(typeof value!=='string'||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value))throw new Error('Horário inválido.');
 const [h,m]=value.split(':').map(Number);return h*60+m;
};
const clock=(n)=>pad(Math.floor(((n%1440)+1440)%1440/60))+':'+pad(((n%1440)+1440)%1440%60);
const hash=(value)=>{let h=2166136261;for(const ch of String(value)){h=Math.imul(h^ch.charCodeAt(0),16777619);}return h>>>0;};
export const weekday=(day)=>atNoon(day).getUTCDay();
export const mondayOf=(day)=>{const d=atNoon(day),weekday=d.getUTCDay();d.setUTCDate(d.getUTCDate()-((weekday+6)%7));return iso(d);};
export const isSundayInMonth=(month,day)=>typeof month==='string'&&typeof day==='string'&&day.slice(0,7)===month&&/^\d{4}-\d\d-\d\d$/.test(day)&&!Number.isNaN(atNoon(day).valueOf())&&iso(atNoon(day))===day&&weekday(day)===0;
export const sundaysOf=(month,days)=>days.filter(day=>day.slice(0,7)===month&&weekday(day)===0);
export function isRestDay(date,{fixedOffWeekday=null,sundayDate=null,anchor=0,index=0}={}){
 if(sundayDate&&mondayOf(date)===mondayOf(sundayDate)&&fixedOffWeekday!==0){
  return date===sundayDate;
 }
 return fixedOffWeekday===null?((index-anchor)%7+7)%7===0:weekday(date)===fixedOffWeekday;
}
// Minutos absolutos modulo 1440: permite comparar turnos que cruzam 00h.
function occupancy(list){
 const map=new Uint16Array(1440),startCounts=new Map();
 for(const row of list){
  const breaks=Array.isArray(row)?row:[row.break_1,row.break_2,row.break_3];
  for(let i=0;i<3;i++){
   if(!breaks[i])continue;
   const start=minute(breaks[i]);startCounts.set(start,(startCounts.get(start)||0)+1);
   for(let m=0;m<MINUTES[i];m++)map[(start+m)%1440]++;
  }
 }
 return {map,startCounts};
}
export function distributedBreaks(start,end,{roundMinutes=0,personKey='',date='',occupied=[]}={}){
 const origin=minute(start),finish=minute(end),duration=(finish-origin+1440)%1440;
 if(duration<180||duration>720)throw new Error('Jornada incompatível com distribuição de pausas.');
 if(![0,5,10,15,30].includes(roundMinutes))throw new Error('Arredondamento inválido.');
 const step=roundMinutes||1,used=occupancy(occupied),picked=[],offsets=[];
 const seed=hash(personKey+'|'+date),phase=(seed%1000)/999; // fases distintas em vez de 3 pausas fixas para a equipe inteira
 for(let i=0;i<3;i++){
  const remaining=MINUTES.slice(i+1).reduce((sum,m)=>sum+5+m,0);
  const low=i===0?5:offsets[i-1]+MINUTES[i-1]+5;
  const high=duration-MINUTES[i]-5-remaining;
  const first=Math.ceil((origin+low)/step)*step;
  const last=Math.floor((origin+high)/step)*step;
  if(first>last)throw new Error('Jornada curta para três pausas neste arredondamento.');
  const shift=((phase-.5)*.24+(i===0?0:i===1?((seed>>>10)%15-7)/100:((seed>>>20)%13-6)/100)*duration;
  const target=origin+[.20,.48,.77][i]*duration+shift;
  let best=null,score=Infinity;
  for(let t=first;t<=last;t+=step){
   let overlap=0;
   for(let j=0;j<MINUTES[i];j++)overlap+=used.map[(t+j)%1440];
   const same=used.startCounts.get(t%1440)||0;
   const distance=Math.abs(t-target);
   const candidate=overlap*18+same*200+distance*.23+Math.abs((t-origin)/duration-[.20,.48,.77][i])*1.3;
   if(candidate<score){score=candidate;best=t;}
  }
  picked.push(clock(best));offsets.push(best-origin);
  used.startCounts.set(best%1440,(used.startCounts.get(best%1440)||0)+1);
  for(let j=0;j<MINUTES[i];j++)used.map[(best+j)%1440]++;
 }
 return picked;
}
