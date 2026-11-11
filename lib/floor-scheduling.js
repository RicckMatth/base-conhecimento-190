import {randomUUID,randomInt} from 'node:crypto';
import {ADMIN_LOGIN} from './permissions.js';

export const ROLES=['attendant','manager','coordinator','dev'];
export const ROLE_LABELS={attendant:'Atendente',manager:'Gestor / Supervisor',coordinator:'Coordenador',dev:'Dev'};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const error=(message,status=400)=>Object.assign(new Error(message),{status});
const toDate=s=>new Date(s+'T12:00:00Z');
const iso=d=>d.toISOString().slice(0,10);
const pad=v=>String(v).padStart(2,'0');
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
export function defaultBreaks(start,end,stagger=0){
 const duration=shiftLength(start,end),origin=minutes(start);
 const offsets=[0.21,0.48,0.77].map((fraction,i)=>Math.round(duration*fraction)+Math.max(-7,Math.min(7,stagger))*(i===0?1:i===1?-1:1));
 const breaks=offsets.map(x=>clock(origin+x));
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
 const r=await client.query('SELECT start_time,end_time FROM floor_shift_profiles WHERE user_id=$1',[id]);
 return r.rows[0]||{start_time:'08:00',end_time:'14:20'};
}
const asTextDate=row=>typeof row.day==='string'?row.day.slice(0,10):iso(new Date(row.day));
async function audit(client,actor,action,target){await client.query('INSERT INTO audit_log(id,actor_id,action,target) VALUES($1,$2,$3,$4)',[randomUUID(),actor.id,action,String(target).slice(0,200)]);}
export async function getSchedule(pool,actor,month){
 if(!actor)throw error('Acesso negado.',401);
 const dates=daysInMonth(month);
 const [users,profiles,entries]=await Promise.all([
  pool.query("SELECT id,username,display_name,operational_role FROM users WHERE active=true ORDER BY CASE operational_role WHEN 'dev' THEN 0 WHEN 'coordinator' THEN 1 WHEN 'manager' THEN 2 ELSE 3 END,lower(display_name) LIMIT 400"),
  pool.query('SELECT user_id,start_time,end_time FROM floor_shift_profiles'),
  pool.query('SELECT user_id,day::text AS day,is_off,start_time,end_time,break_1,break_2,break_3,off_source,break_source,updated_at FROM floor_schedule_entries WHERE day>=$1::date AND day<($1::date+INTERVAL \'1 month\') ORDER BY day',[dates[0]])
 ]);
 return {currentRole:personRole(actor),month,dates,users:users.rows,profiles:profiles.rows,entries:entries.rows,policy:{workDays:6,restDays:1,breakMinutes:[10,20,10]}};
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
export async function editShift(pool,actor,value){
 return transact(pool,async c=>{
  const target=await targetUser(c,value?.targetId);assertRole(actor,target,'shift');
  const start=value?.start,end=value?.end;shiftLength(start,end);
  const r=await c.query('INSERT INTO floor_shift_profiles(user_id,start_time,end_time,updated_by) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET start_time=EXCLUDED.start_time,end_time=EXCLUDED.end_time,updated_by=EXCLUDED.updated_by,updated_at=now() RETURNING *',[target.id,start,end,actor.id]);
  await audit(c,actor,'floor_shift_update',target.username+' '+start+'-'+end);
  return {profile:r.rows[0]};
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
  if(off)breaks=[null,null,null];
  else if(breaks.some(x=>!x))breaks=defaultBreaks(start,end);
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
 if(!['days','breaks'].includes(kind)||!Array.isArray(ids)||ids.length<1||ids.length>100||ids.some(x=>!UUID.test(String(x)))||new Set(ids).size!==ids.length)
  throw error('Selecione de 1 a 100 usuários e uma geração válida.');
 return transact(pool,async c=>{
  const users=(await c.query('SELECT id,username,operational_role,active FROM users WHERE id=ANY($1::uuid[]) FOR UPDATE',[ids])).rows;
  if(users.length!==ids.length||users.some(u=>!u.active))throw error('A lista contém contas inexistentes ou desativadas.');
  for(const target of users)assertRole(actor,target,kind);
  const defaults=(await c.query('SELECT user_id,start_time,end_time FROM floor_shift_profiles WHERE user_id=ANY($1::uuid[])',[ids])).rows;
  const profiles=new Map(defaults.map(p=>[p.user_id,p]));
  const from=new Date(dates[0]+'T12:00:00Z'),prior=iso(new Date(from.valueOf()-7*86400000));
  const records=(await c.query("SELECT user_id,day::text AS day,is_off,start_time,end_time,break_1,break_2,break_3,off_source,break_source FROM floor_schedule_entries WHERE user_id=ANY($1::uuid[]) AND day BETWEEN $2::date AND $3::date",[ids,prior,dates.at(-1)])).rows;
  const byId=new Map(ids.map(id=>[id,new Map()]));
  for(const row of records)byId.get(row.user_id)?.set(row.day,row);
  let changes=0,skipped=0;
  const batch=[];
  const shuffled=[...users].sort(()=>Math.random()-.5);
  for(let userIdx=0;userIdx<shuffled.length;userIdx++){
   const user=shuffled[userIdx],existing=byId.get(user.id),profile=profiles.get(user.id)||{start_time:'08:00',end_time:'14:20'};
   const recent=records.filter(r=>r.user_id===user.id&&r.day<dates[0]&&r.is_off).sort((a,b)=>b.day.localeCompare(a.day));
   // Se o mês anterior tiver uma folga, prolongamos o mesmo ciclo 6×1.
   const anchor=recent.length?Math.round((toDate(recent[0].day)-from)/86400000):((userIdx+randomInt(7))%7);
   for(let i=0;i<dates.length;i++){
    const date=dates[i],old=existing.get(date),isCycleOff=((i-anchor)%7+7)%7===0;
    if(kind==='days'&&old?.off_source==='manual'||kind==='breaks'&&(!old||old.is_off||old.break_source==='manual')){skipped++;continue;}
    const start=old?.start_time||profile.start_time,end=old?.end_time||profile.end_time;
    shiftLength(start,end);
    if(kind==='breaks'){
     const br=defaultBreaks(start,end,randomInt(-7,8));
     batch.push({user_id:user.id,day:date,is_off:false,start_time:start,end_time:end,break_1:br[0],break_2:br[1],break_3:br[2],off_source:old.off_source,break_source:'auto'});
    }else{
     const off=isCycleOff,br=off?[null,null,null]:old?.break_source==='manual'&&old.break_1&&old.break_2&&old.break_3?[old.break_1,old.break_2,old.break_3]:defaultBreaks(start,end,randomInt(-7,8));
     batch.push({user_id:user.id,day:date,is_off:off,start_time:start,end_time:end,break_1:br[0],break_2:br[1],break_3:br[2],off_source:'auto',break_source:old?.break_source||'auto'});
    }
   }
  }
  for(let offset=0;offset<batch.length;offset+=400){
   const block=batch.slice(offset,offset+400);
   const fields='user_id uuid,day date,is_off boolean,start_time text,end_time text,break_1 text,break_2 text,break_3 text,off_source text,break_source text';
   const command=kind==='days'?
    "ON CONFLICT(user_id,day) DO UPDATE SET is_off=EXCLUDED.is_off,start_time=EXCLUDED.start_time,end_time=EXCLUDED.end_time,break_1=EXCLUDED.break_1,break_2=EXCLUDED.break_2,break_3=EXCLUDED.break_3,off_source='auto',break_source=EXCLUDED.break_source,updated_by=EXCLUDED.updated_by,updated_at=now() WHERE floor_schedule_entries.off_source<>'manual'":
    "ON CONFLICT(user_id,day) DO UPDATE SET break_1=EXCLUDED.break_1,break_2=EXCLUDED.break_2,break_3=EXCLUDED.break_3,break_source='auto',updated_by=EXCLUDED.updated_by,updated_at=now() WHERE floor_schedule_entries.break_source<>'manual' AND floor_schedule_entries.is_off=false";
   const query='INSERT INTO floor_schedule_entries(user_id,day,is_off,start_time,end_time,break_1,break_2,break_3,off_source,break_source,updated_by) SELECT r.user_id,r.day,r.is_off,r.start_time,r.end_time,r.break_1,r.break_2,r.break_3,r.off_source,r.break_source,$2::uuid FROM jsonb_to_recordset($1::jsonb) AS r('+fields+') '+command;
   const result=await c.query(query,[JSON.stringify(block),actor.id]);changes+=result.rowCount;
  }
  await audit(c,actor,kind==='days'?'floor_month_generate_days':'floor_month_generate_breaks',month+' '+users.length+' usuários');
  return {month,kind,updated:changes,skipped,message:kind==='days'?'Escala 6×1 sugerida e salva. Confira as folgas e regras operacionais.':'Pausas 10–20–10 distribuídas e salvas, preservando ajustes manuais.'};
 });
}
