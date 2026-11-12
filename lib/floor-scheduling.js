import {randomUUID,randomInt} from 'node:crypto';
import {ADMIN_LOGIN} from './permissions.js';
import {distributedBreaks,isSundayInMonth,isRestDay,sundaysOf,mondayOf} from './floor-planning.js';

export const ROLES=['attendant','manager','coordinator','dev'];
export const ROLE_LABELS={attendant:'Atendente',manager:'Gestor / Supervisor',coordinator:'Coordenador',dev:'Dev'};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const error=(message,status=400)=>Object.assign(new Error(message),{status});
const toDate=s=>new Date(s+'T12:00:00Z');
const iso=d=>d.toISOString().slice(0,10);
const pad=v=>String(v).padStart(2,'0');
export const ROUND_INTERVALS=[0,5,10,15,30];
export const WEEKDAY_LABELS=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
export const weekdayOf=day=>toDate(day).getUTCDay();
export function validOffWeekday(value){return value===null||Number.isInteger(value)&&value>=0&&value<=6;}
export function validRoundInterval(value){return Number.isInteger(value)&&ROUND_INTERVALS.includes(value);}

export function validMonth(month){return typeof month==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(month)&&Number(month.slice(0,4))>=2020&&Number(month.slice(0,4))<=2100;}
export function validDate(day){if(typeof day!=='string'||! /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(day))return false;const d=toDate(day);return !Number.isNaN(d.valueOf())&&iso(d)===day;}
export function daysInMonth(month){if(!validMonth(month))throw error('Mês inválido.');const [y,m]=month.split('-').map(Number),n=new Date(Date.UTC(y,m,0)).getUTCDate();return Array.from({length:n},(_,i)=>month+'-'+pad(i+1));}
export function minutes(value){if(typeof value!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))throw error('Horário inválido. Use HH:mm.');const [h,m]=value.split(':').map(Number);return h*60+m;}
const clock=m=>pad(Math.floor(((m%1440)+1440)%1440/60))+':'+pad(((m%1440)+1440)%1440%60);
export function shiftLength(start,end){const s=minutes(start),e=minutes(end),duration=(e-s+1440)%1440;if(duration<180||duration>720)throw error('O turno deve ter entre 3h e 12h, com horários de início e fim diferentes.');return duration;}
export function validateBreaks(start,end,breaks){
 if(!Array.isArray(breaks)||breaks.length!==3)throw error('Informe três pausas: 10, 20 e 10 minutos.');
 const duration=shiftLength(start,end),origin=minutes(start);
 const positions=breaks.map((b,i)=>({offset:(minutes(b)-origin+1440)%1440,duration:[10,20,10][i]}));
 for(let i=0;i<positions.length;i++){
  const p=positions[i];if(p.offset<5||p.offset+p.duration>duration-5)throw error('As pausas precisam estar inteiramente dentro do turno.');
  if(i&&p.offset<positions[i-1].offset+positions[i-1].duration+5)throw error('As pausas devem seguir a ordem 10 → 20 → 10, sem sobreposição.');
 }
 return breaks;
}
export function defaultBreaks(start,end,stagger=0,roundMinutes=0){
 const duration=shiftLength(start,end),origin=minutes(start);
 if(!validRoundInterval(roundMinutes))throw error('Intervalo de arredondamento inválido.');
 const offsets=[0.21,0.48,0.77].map((fraction,i)=>Math.round(duration*fraction)+Math.max(-7,Math.min(7,stagger))*(i===0?1:i===1?-1:1));
 if(roundMinutes===0){const breaks=offsets.map(x=>clock(origin+x));validateBreaks(start,end,breaks);return breaks;}
 // Os minutos redondos são calculados pelo relógio, não pela hora inicial do turno.
 // Reserva cinco minutos entre cada pausa e até o término da jornada.
 const lengths=[10,20,10],result=[];
 for(let i=0;i<3;i++){
  const min=origin+(i===0?5:((result[i-1]-origin)+lengths[i-1]+5));
  let reserve=5+lengths[i];
  for(let j=i+1;j<3;j++)reserve+=5+lengths[j];
  const max=origin+duration-reserve;
  const first=Math.ceil(min/roundMinutes)*roundMinutes;
  const last=Math.floor(max/roundMinutes)*roundMinutes;
  if(first>last)throw error('Não há três horários redondos válidos para esta jornada. Diminua o intervalo de arredondamento.');
  const rounded=Math.round((origin+offsets[i])/roundMinutes)*roundMinutes;
  result.push(Math.min(last,Math.max(first,rounded)));
 }
 const breaks=result.map(clock);
 validateBreaks(start,end,breaks);
 return breaks;
}
export function canManage(actorRole,targetRole,kind){
 if(actorRole==='dev')return kind==='role'?targetRole!=='dev':true;
 if(kind==='role')return false;
 if(kind==='breaks')return actorRole==='manager'&&targetRole==='attendant';
 if(kind==='days'||kind==='shift')return actorRole==='manager'&&targetRole==='attendant'||actorRole==='coordinator'&&targetRole==='manager';
 return false;
}
const personRole=user=>user?.operational_role||'attendant';
function assertRole(actor,target,kind){
 if(!canManage(personRole(actor),personRole(target),kind))throw error('Seu perfil não tem permissão para alterar essa escala.',403);
}
async function transact(pool,fn){
 const c=await pool.connect();try{await c.query('BEGIN');await c.query("SELECT pg_advisory_xact_lock(hashtext('floor-schedules-v1'))");const out=await fn(c);await c.query('COMMIT');return out;}
 catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
async function targetUser(client,id){
 if(!UUID.test(String(id||'')))throw error('Usuário inválido.');
 const result=await client.query('SELECT id,username,display_name,operational_role,active FROM users WHERE id=$1 FOR UPDATE',[id]);
 if(!result.rowCount||!result.rows[0].active)throw error('Usuário não encontrado ou desativado.',404);
 return result.rows[0];
}
async function profile(client,id){
 const r=await client.query('SELECT start_time,end_time,fixed_off_weekday,break_round_minutes FROM floor_shift_profiles WHERE user_id=$1',[id]);
 return r.rows[0]||{start_time:'08:00',end_time:'14:20',fixed_off_weekday:null,break_round_minutes:0};
}
const asTextDate=row=>typeof row.day==='string'?row.day.slice(0,10):iso(new Date(row.day));
async function audit(client,actor,action,target){await client.query('INSERT INTO audit_log(id,actor_id,action,target) VALUES($1,$2,$3,$4)',[randomUUID(),actor.id,action,String(target).slice(0,200)]);}
export async function getSchedule(pool,actor,month){
 if(!actor)throw error('Acesso negado.',401);
 const dates=daysInMonth(month);
 const [users,profiles,entries,sundays]=await Promise.all([
  pool.query("SELECT id,username,display_name,operational_role FROM users WHERE active=true ORDER BY CASE operational_role WHEN 'dev' THEN 0 WHEN 'coordinator' THEN 1 WHEN 'manager' THEN 2 ELSE 3 END,lower(display_name) LIMIT 400"),
  pool.query('SELECT user_id,start_time,end_time,fixed_off_weekday,break_round_minutes FROM floor_shift_profiles'),
  pool.query('SELECT user_id,day::text AS day,is_off,start_time,end_time,break_1,break_2,break_3,off_source,break_source,updated_at FROM floor_schedule_entries WHERE day>=$1::date AND day<($1::date+INTERVAL \'1 month\') ORDER BY day',[dates[0]]),
  pool.query('SELECT user_id,month::text AS month,sunday_date::text AS sunday_date FROM floor_sunday_preferences WHERE month=$1::date',[dates[0]])
 ]);
 return {currentRole:personRole(actor),month,dates,users:users.rows,profiles:profiles.rows,entries:entries.rows,sundays:sundays.rows,policy:{workDays:6,restDays:1,breakMinutes:[10,20,10],weekdayLabels:WEEKDAY_LABELS,roundIntervals:ROUND_INTERVALS}};
}
export async function editOperationalRole(pool,actor,value){
 if(personRole(actor)!=='dev')throw error('Somente o perfil Dev pode distribuir acessos operacionais.',403);
 const targetId=value?.targetId,nextRole=value?.role;
 if(!ROLES.includes(nextRole)||nextRole==='dev')throw error('Atribua atendente, gestor ou coordenador. O perfil Dev é reservado.');
 return transact(pool,async c=>{
  const u=await targetUser(c,targetId);
  if(u.username===ADMIN_LOGIN||u.operational_role==='dev')throw error('O perfil Dev principal não pode ser modificado.',403);
  const r=await c.query('UPDATE users SET operational_role=$2 WHERE id=$1 RETURNING id,username,display_name,operational_role',[targetId,nextRole]);
  await audit(c,actor,'floor_role_update',u.username+': '+nextRole);
  return {user:r.rows[0]};
 });
}
export async function editSchedulePreferences(pool,actor,value){
 const hasOff=Object.hasOwn(value||{},'fixedOffWeekday'),hasRound=Object.hasOwn(value||{},'breakRoundMinutes');
 if(!hasOff&&!hasRound)throw error('Informe ao menos uma preferência de escala.');
 if(hasOff&&!validOffWeekday(value.fixedOffWeekday))throw error('Dia da semana inválido. Escolha de domingo a sábado ou distribuição automática.');
 if(hasRound&&!validRoundInterval(value.breakRoundMinutes))throw error('Escolha pausas livres ou múltiplos de 5, 10, 15 ou 30 minutos.');
 return transact(pool,async c=>{
  const target=await targetUser(c,value.targetId);
  if(hasOff)assertRole(actor,target,'days');
  if(hasRound)assertRole(actor,target,'breaks');
  const sql=hasOff&&hasRound?
   'INSERT INTO floor_shift_profiles(user_id,fixed_off_weekday,break_round_minutes,updated_by) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET fixed_off_weekday=EXCLUDED.fixed_off_weekday,break_round_minutes=EXCLUDED.break_round_minutes,updated_by=EXCLUDED.updated_by,updated_at=now() RETURNING *':
   hasOff?'INSERT INTO floor_shift_profiles(user_id,fixed_off_weekday,updated_by) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET fixed_off_weekday=EXCLUDED.fixed_off_weekday,updated_by=EXCLUDED.updated_by,updated_at=now() RETURNING *':
   'INSERT INTO floor_shift_profiles(user_id,break_round_minutes,updated_by) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET break_round_minutes=EXCLUDED.break_round_minutes,updated_by=EXCLUDED.updated_by,updated_at=now() RETURNING *';
  const args=hasOff&&hasRound?[target.id,value.fixedOffWeekday,value.breakRoundMinutes,actor.id]:
    hasOff?[target.id,value.fixedOffWeekday,actor.id]:[target.id,value.breakRoundMinutes,actor.id];
  const result=await c.query(sql,args);
  await audit(c,actor,'floor_schedule_preferences',target.username+' '+(hasOff?'folga '+(value.fixedOffWeekday===null?'aleatória':WEEKDAY_LABELS[value.fixedOffWeekday]):'')+' '+(hasRound?'pausas '+value.breakRoundMinutes:''));
  return {profile:result.rows[0],message:'Preferência salva. Aplique-a gerando novamente a escala do mês desejado; ajustes manuais serão mantidos.'};
 });
}

export async function editSundayChoice(pool,actor,value){
 const month=value?.month,date=value?.sundayDate;
 const dates=daysInMonth(month);
 if(date!==null&&!isSundayInMonth(month,date))throw error('Escolha um domingo válido dentro do mês selecionado.');
 return transact(pool,async c=>{
  const target=await targetUser(c,value?.targetId);
  assertRole(actor,target,'days');
  const p=await profile(c,target.id);
  if(p.fixed_off_weekday===0&&date!==null)throw error('A folga fixa já é domingo. Todos os domingos permanecerão como folga.');
  if(date===null)await c.query('DELETE FROM floor_sunday_preferences WHERE user_id=$1 AND month=$2::date',[target.id,dates[0]]);
  else await c.query("INSERT INTO floor_sunday_preferences(user_id,month,sunday_date,updated_by) VALUES($1,$2::date,$3::date,$4) ON CONFLICT(user_id,month) DO UPDATE SET sunday_date=EXCLUDED.sunday_date,updated_by=EXCLUDED.updated_by,updated_at=now()",[target.id,dates[0],date,actor.id]);
  await audit(c,actor,'floor_sunday_choice',target.username+': '+month+' '+(date||'automatic'));
  return {message:date?'Domingo selecionado. Gere as folgas do mês para aplicar a troca semanal 6×1.':'Domingo automático ativado. Gere as folgas do mês para atualizar.',month,sundayDate:date};
 });
}

// Atualiza imediatamente todos os registros do mês, inclusive os já gerados.
// A folga manual é mantida. Pausa manual válida é mantida; pausa incompatível é
// regenerada com aviso para impedir horários fora da jornada nova.
export async function editShift(pool,actor,value){
 const month=value?.month||new Date().toISOString().slice(0,7);
 const dates=daysInMonth(month);
 return transact(pool,async c=>{
  const target=await targetUser(c,value?.targetId);assertRole(actor,target,'shift');
  const start=value?.start,end=value?.end;shiftLength(start,end);
  const r=await c.query('INSERT INTO floor_shift_profiles(user_id,start_time,end_time,updated_by) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET start_time=EXCLUDED.start_time,end_time=EXCLUDED.end_time,updated_by=EXCLUDED.updated_by,updated_at=now() RETURNING *',[target.id,start,end,actor.id]);
  const all=(await c.query("SELECT user_id,day::text AS day,is_off,break_1,break_2,break_3,break_source FROM floor_schedule_entries WHERE day>=$1::date AND day<($1::date+INTERVAL '1 month') ORDER BY day,user_id",[dates[0]])).rows;
  const others=new Map();
  for(const row of all)if(row.user_id!==target.id&&!row.is_off&&row.break_1){
   if(!others.has(row.day))others.set(row.day,[]);
   others.get(row.day).push(row);
  }
  let updated=0,rebuiltManual=0;
  for(const old of all.filter(x=>x.user_id===target.id)){
   let breaks=[old.break_1,old.break_2,old.break_3],breakSource=old.break_source||'auto';
   if(old.is_off)breaks=[null,null,null];
   else{
    let keepManual=false;
    if(breakSource==='manual'&&breaks.every(Boolean)){
     try{validateBreaks(start,end,breaks);keepManual=true;}catch{}
    }
    if(!keepManual){
     if(breakSource==='manual')rebuiltManual++;
     breaks=distributedBreaks(start,end,{roundMinutes:r.rows[0].break_round_minutes||0,personKey:target.id,date:old.day,occupied:others.get(old.day)||[]});
     breakSource='auto';
    }
    if(!others.has(old.day))others.set(old.day,[]);
    others.get(old.day).push(breaks);
   }
   await c.query("UPDATE floor_schedule_entries SET start_time=$3,end_time=$4,break_1=$5,break_2=$6,break_3=$7,break_source=$8,updated_by=$9,updated_at=now() WHERE user_id=$1 AND day=$2::date",[target.id,old.day,start,end,...breaks,breakSource,actor.id]);
   updated++;
  }
  await audit(c,actor,'floor_shift_update',target.username+' '+month+' '+start+'-'+end+' '+updated+' registros');
  return {profile:r.rows[0],updated,rebuiltManual,message:'Jornada atualizada em '+updated+' dia(s) de '+month+'. '+(rebuiltManual?'Foram redistribuídas '+rebuiltManual+' pausa(s) manuais que não cabiam no novo turno.':'As pausas foram recalculadas dentro do turno; pausas manuais válidas foram preservadas.')};
 });
}

async function setDayRow(c,actor,target,date,kind,payload){
 const previous=(await c.query('SELECT * FROM floor_schedule_entries WHERE user_id=$1 AND day=$2::date FOR UPDATE',[target.id,date])).rows[0];
 const p=await profile(c,target.id),start=previous?.start_time||p.start_time,end=previous?.end_time||p.end_time;
 let off=previous?.is_off??false,offSource=previous?.off_source||'auto',breakSource=previous?.break_source||'auto';
 let breaks=[previous?.break_1||null,previous?.break_2||null,previous?.break_3||null];
 if(kind==='days'){
  if(typeof payload?.off!=='boolean')throw error('Informe se a data é folga ou trabalho.');
  off=payload.off;offSource='manual';
  if(off){breaks=[null,null,null];breakSource='auto';}
  else if(breaks.some(x=>!x)){
   const occupied=(await c.query("SELECT break_1,break_2,break_3 FROM floor_schedule_entries WHERE day=$1::date AND user_id<>$2 AND is_off=false",[date,target.id])).rows;
   breaks=distributedBreaks(start,end,{personKey:target.id,date,roundMinutes:p.break_round_minutes||0,occupied});breakSource='auto';
  }
 }else{
  if(off)throw error('Uma data marcada como folga não pode ter pausas. Mude a folga primeiro.');
  breaks=validateBreaks(start,end,payload?.breaks);breakSource='manual';
 }
 const result=await c.query("INSERT INTO floor_schedule_entries(user_id,day,is_off,start_time,end_time,break_1,break_2,break_3,off_source,break_source,updated_by) VALUES($1,$2::date,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(user_id,day) DO UPDATE SET is_off=EXCLUDED.is_off,start_time=EXCLUDED.start_time,end_time=EXCLUDED.end_time,break_1=EXCLUDED.break_1,break_2=EXCLUDED.break_2,break_3=EXCLUDED.break_3,off_source=EXCLUDED.off_source,break_source=EXCLUDED.break_source,updated_by=EXCLUDED.updated_by,updated_at=now() RETURNING user_id,day::text AS day,is_off,start_time,end_time,break_1,break_2,break_3,off_source,break_source",[target.id,date,off,start,end,...breaks,offSource,breakSource,actor.id]);
 await audit(c,actor,kind==='days'?'floor_day_manual':'floor_break_manual',target.username+' '+date);
 return {entry:result.rows[0]};
}
export async function editScheduleDay(pool,actor,value){
 const date=value?.date,kind=value?.kind;
 if(!validDate(date)||!['days','breaks'].includes(kind))throw error('Data ou tipo de edição inválido.');
 return transact(pool,async c=>{const target=await targetUser(c,value.targetId);assertRole(actor,target,kind);return setDayRow(c,actor,target,date,kind,value);});
}
export async function generateMonth(pool,actor,value){
 const month=value?.month,kind=value?.kind,ids=value?.userIds;
 const dates=daysInMonth(month);
 if(value.roundMinutes!==undefined&&!validRoundInterval(value.roundMinutes))throw error('Escolha pausas livres ou múltiplos de 5, 10, 15 ou 30 minutos.');
 if(!['days','breaks'].includes(kind)||!Array.isArray(ids)||ids.length<1||ids.length>100||ids.some(x=>!UUID.test(String(x)))||new Set(ids).size!==ids.length)
  throw error('Selecione de 1 a 100 usuários e uma geração válida.');
 return transact(pool,async c=>{
  const users=(await c.query('SELECT id,username,operational_role,active FROM users WHERE id=ANY($1::uuid[]) FOR UPDATE',[ids])).rows;
  if(users.length!==ids.length||users.some(u=>!u.active))throw error('A lista contém contas inexistentes ou desativadas.');
  for(const target of users)assertRole(actor,target,kind);
  const [prefs,chosen,records]=await Promise.all([
   c.query('SELECT user_id,start_time,end_time,fixed_off_weekday,break_round_minutes FROM floor_shift_profiles WHERE user_id=ANY($1::uuid[])',[ids]),
   c.query('SELECT user_id,sunday_date::text AS sunday_date FROM floor_sunday_preferences WHERE month=$1::date',[dates[0]]),
   c.query("SELECT user_id,day::text AS day,is_off,start_time,end_time,break_1,break_2,break_3,off_source,break_source FROM floor_schedule_entries WHERE day BETWEEN $1::date AND $2::date",[iso(new Date(toDate(dates[0]).valueOf()-7*86400000)),dates.at(-1)])
  ]);
  const profiles=new Map(prefs.rows.map(p=>[p.user_id,p])),sundays=new Map(chosen.rows.map(x=>[x.user_id,x.sunday_date]));
  const byId=new Map(ids.map(id=>[id,new Map()]));
  for(const row of records.rows)byId.get(row.user_id)?.set(row.day,row);
  const seed=text=>{let n=0;for(const ch of text)n=((n<<5)-n+ch.charCodeAt(0))|0;return n>>>0;};
  const selected=new Set(ids),occupied=new Map(),calendarSundays=sundaysOf(month,dates);
  const reserve=row=>{
   if(!row||row.is_off||!row.break_1||!row.break_2||!row.break_3)return;
   if(!occupied.has(row.day))occupied.set(row.day,[]);
   occupied.get(row.day).push(row);
  };
  // Pausas inalteráveis (outros funcionários e registros manuais) entram na
  // distribuição para que novas sugestões evitem os mesmos horários.
  for(const row of records.rows)if(row.day>=dates[0]&&(!selected.has(row.user_id)||row.break_source==='manual'))reserve(row);
  let changes=0,skipped=0,manualConflicts=0,manualBreaksRebalanced=0;
  const batch=[];
  const ordered=[...users].sort((a,b)=>a.id.localeCompare(b.id)); // estável entre execuções
  for(const user of ordered){
   const existing=byId.get(user.id),p=profiles.get(user.id)||{start_time:'08:00',end_time:'14:20',fixed_off_weekday:null,break_round_minutes:0};
   const roundMinutes=value.roundMinutes===undefined?p.break_round_minutes||0:value.roundMinutes;
   const history=records.rows.filter(x=>x.user_id===user.id&&x.day<dates[0]&&x.is_off).sort((a,b)=>b.day.localeCompare(a.day));
   const first=toDate(dates[0]),anchor=history.length?Math.round((toDate(history[0].day)-first)/86400000):(seed(user.id)%7);
   const sundayDate=p.fixed_off_weekday===0?null:(sundays.get(user.id)||calendarSundays[seed(user.id+month)%calendarSundays.length]);
   for(let i=0;i<dates.length;i++){
    const day=dates[i],old=existing.get(day);
    const plannedOff=isRestDay(day,{fixedOffWeekday:p.fixed_off_weekday??null,sundayDate,anchor,index:i});
    if(kind==='days'&&old?.off_source==='manual'){
     if(old.is_off!==plannedOff)manualConflicts++;
     skipped++;continue;
    }
    if(kind==='breaks'&&(!old||old.is_off||old.break_source==='manual')){skipped++;continue;}
    const start=p.start_time,end=p.end_time;shiftLength(start,end);
    let off=kind==='days'?plannedOff:false;
    let breaks=[null,null,null],breakSource='auto';
    if(!off){
     const existingManual=kind==='days'&&old?.break_source==='manual'&&old.break_1&&old.break_2&&old.break_3;
     let preserve=false;
     if(existingManual)try{validateBreaks(start,end,[old.break_1,old.break_2,old.break_3]);preserve=true;}catch{}
     if(preserve){
      breaks=[old.break_1,old.break_2,old.break_3];breakSource='manual';
     }else{
      if(existingManual)manualBreaksRebalanced++;
      breaks=distributedBreaks(start,end,{roundMinutes,personKey:user.id,date:day,occupied:occupied.get(day)||[]});
     }
     reserve({day,break_1:breaks[0],break_2:breaks[1],break_3:breaks[2]});
    }
    batch.push({user_id:user.id,day,is_off:off,start_time:start,end_time:end,break_1:breaks[0],break_2:breaks[1],break_3:breaks[2],off_source:kind==='days'?'auto':old.off_source,break_source:breakSource});
   }
  }
  for(let offset=0;offset<batch.length;offset+=400){
   const block=batch.slice(offset,offset+400);
   const fields='user_id uuid,day date,is_off boolean,start_time text,end_time text,break_1 text,break_2 text,break_3 text,off_source text,break_source text';
   const command=kind==='days'?
    "ON CONFLICT(user_id,day) DO UPDATE SET is_off=EXCLUDED.is_off,start_time=EXCLUDED.start_time,end_time=EXCLUDED.end_time,break_1=EXCLUDED.break_1,break_2=EXCLUDED.break_2,break_3=EXCLUDED.break_3,off_source='auto',break_source=EXCLUDED.break_source,updated_by=EXCLUDED.updated_by,updated_at=now() WHERE floor_schedule_entries.off_source<>'manual'":
    "ON CONFLICT(user_id,day) DO UPDATE SET start_time=EXCLUDED.start_time,end_time=EXCLUDED.end_time,break_1=EXCLUDED.break_1,break_2=EXCLUDED.break_2,break_3=EXCLUDED.break_3,break_source='auto',updated_by=EXCLUDED.updated_by,updated_at=now() WHERE floor_schedule_entries.break_source<>'manual' AND floor_schedule_entries.is_off=false";
   const query='INSERT INTO floor_schedule_entries(user_id,day,is_off,start_time,end_time,break_1,break_2,break_3,off_source,break_source,updated_by) SELECT r.user_id,r.day,r.is_off,r.start_time,r.end_time,r.break_1,r.break_2,r.break_3,r.off_source,r.break_source,$2::uuid FROM jsonb_to_recordset($1::jsonb) AS r('+fields+') '+command;
   const result=await c.query(query,[JSON.stringify(block),actor.id]);changes+=result.rowCount;
  }
  await audit(c,actor,kind==='days'?'floor_month_generate_days':'floor_month_generate_breaks',month+' '+users.length+' usuários; '+changes+' alterações');
  const note=(manualConflicts?' Atenção: '+manualConflicts+' folga(s) manuais divergem da regra automática e foram preservadas.':'')+(manualBreaksRebalanced?' '+manualBreaksRebalanced+' pausa(s) manuais incompatíveis foram recalculadas.':'');
  return {month,kind,updated:changes,skipped,manualConflicts,manualBreaksRebalanced,message:(kind==='days'?'Folgas 6×1 com um domingo no mês e pausas distribuídas aplicadas.':'Pausas 10–20–10 redistribuídas dentro dos turnos, reduzindo horários coincidentes.')+note};
 });
}
