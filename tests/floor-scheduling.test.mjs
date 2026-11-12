import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {distributedBreaks,isSundayInMonth,isRestDay,mondayOf} from '../lib/floor-planning.js';
import {ROLES,ROLE_LABELS,canManage,daysInMonth,validDate,shiftLength,defaultBreaks,validateBreaks,weekdayOf,validOffWeekday,validRoundInterval,generateMonth,editScheduleDay,editShift,editSchedulePreferences,editSundayChoice,editOperationalRole,getSchedule} from '../lib/floor-scheduling.js';

const newUser=(username,operational_role)=>({id:randomUUID(),username,display_name:username,role:'user',operational_role,active:true});
async function setup(){
 const pg=new PGlite();
 await pg.exec("CREATE TABLE users(id uuid PRIMARY KEY,username text UNIQUE NOT NULL,display_name text NOT NULL,role text NOT NULL DEFAULT 'user',operational_role text NOT NULL DEFAULT 'attendant',active boolean NOT NULL DEFAULT true);CREATE TABLE audit_log(id uuid PRIMARY KEY,actor_id uuid,action text,target text);CREATE TABLE floor_shift_profiles(user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,start_time text NOT NULL DEFAULT '08:00',end_time text NOT NULL DEFAULT '14:20',fixed_off_weekday smallint CHECK(fixed_off_weekday BETWEEN 0 AND 6),break_round_minutes smallint NOT NULL DEFAULT 0 CHECK(break_round_minutes IN (0,5,10,15,30)),updated_by uuid REFERENCES users(id),updated_at timestamptz NOT NULL DEFAULT now());CREATE TABLE floor_schedule_entries(user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,day date NOT NULL,is_off boolean NOT NULL DEFAULT false,start_time text NOT NULL DEFAULT '08:00',end_time text NOT NULL DEFAULT '14:20',break_1 text,break_2 text,break_3 text,off_source text NOT NULL DEFAULT 'auto' CHECK(off_source IN ('auto','manual')),break_source text NOT NULL DEFAULT 'auto' CHECK(break_source IN ('auto','manual')),updated_by uuid REFERENCES users(id),updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,day));");
 await pg.exec("CREATE TABLE floor_sunday_preferences(user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,month date NOT NULL,sunday_date date NOT NULL,updated_by uuid REFERENCES users(id),updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,month))");
 const pool={query:(q,a)=>pg.query(q,a),connect:async()=>({query:(q,a)=>pg.query(q,a),release(){}})};
 const dev=newUser('pm-civil.bandeira','dev'),coordinator=newUser('coord.001','coordinator'),manager=newUser('gestor.001','manager'),attendant=newUser('atendente.001','attendant');
 for(const person of [dev,coordinator,manager,attendant]){
  await pg.query('INSERT INTO users(id,username,display_name,role,operational_role,active) VALUES($1,$2,$3,$4,$5,$6)',[person.id,person.username,person.display_name,person.role,person.operational_role,person.active]);
 }
 return {pg,pool,dev,coordinator,manager,attendant};
}
test('permissões por função impedem gestores e coordenadores de alterar escalas erradas',()=>{
 assert.equal(ROLES.length,4);assert.equal(ROLE_LABELS.dev,'Dev');
 assert.equal(canManage('manager','attendant','days'),true);
 assert.equal(canManage('manager','attendant','breaks'),true);
 assert.equal(canManage('manager','manager','days'),false);
 assert.equal(canManage('coordinator','manager','days'),true);
 assert.equal(canManage('coordinator','attendant','breaks'),false);
 assert.equal(canManage('coordinator','manager','breaks'),false);
 assert.equal(canManage('attendant','attendant','days'),false);
 assert.equal(canManage('dev','manager','days'),true);
 assert.equal(canManage('manager','attendant','role'),false);
});
test('calendário e validação de turnos/pausas, inclusive após meia-noite',()=>{
 assert.equal(daysInMonth('2028-02').length,29);
 assert.equal(daysInMonth('2027-02').length,28);
 assert.equal(validDate('2026-02-31'),false);
 assert.equal(shiftLength('18:00','00:20'),380);
 const breaks=defaultBreaks('18:00','00:20');
 assert.equal(breaks.length,3);assert.deepEqual(validateBreaks('18:00','00:20',breaks),breaks);
 assert.throws(()=>validateBreaks('08:00','14:20',['08:00','10:00','12:00']));
 assert.throws(()=>validateBreaks('08:00','14:20',['09:00','09:05','12:00']));
 assert.throws(()=>shiftLength('08:00','08:00'));
 assert.throws(()=>daysInMonth('2026-13'));
});
test('geração 6×1, folgas e pausas manuais são preservadas no banco',async()=>{
 const {pg,pool,dev,coordinator,manager,attendant}=await setup();
 try{
  await assert.rejects(generateMonth(pool,attendant,{month:'2026-11',kind:'days',userIds:[attendant.id]}),e=>e.status===403);
  await assert.rejects(generateMonth(pool,coordinator,{month:'2026-11',kind:'days',userIds:[attendant.id]}),e=>e.status===403);
  const first=await generateMonth(pool,manager,{month:'2026-11',kind:'days',userIds:[attendant.id]});
  assert.equal(first.updated,30);
  let all=(await getSchedule(pool,attendant,'2026-11')).entries.filter(e=>e.user_id===attendant.id);
  assert.equal(all.length,30);
  assert.equal(all.filter(e=>e.is_off).length>=4,true);
  assert.ok(all.some(r=>r.is_off&&weekdayOf(r.day)===0),'uma folga dominical automática no mês');
  const work=all.find(e=>!e.is_off);
  const manualBreak=['09:00','10:50','13:00'];
  await editScheduleDay(pool,manager,{targetId:attendant.id,date:work.day,kind:'breaks',breaks:manualBreak});
  await generateMonth(pool,manager,{month:'2026-11',kind:'breaks',userIds:[attendant.id]});
  all=(await getSchedule(pool,manager,'2026-11')).entries.filter(e=>e.user_id===attendant.id);
  assert.deepEqual(['break_1','break_2','break_3'].map(k=>all.find(e=>e.day===work.day)[k]),manualBreak);
  assert.equal(all.find(e=>e.day===work.day).break_source,'manual');
  const changed=all.find(e=>!e.is_off&&e.day!==work.day);
  await editScheduleDay(pool,manager,{targetId:attendant.id,date:changed.day,kind:'days',off:true});
  await generateMonth(pool,manager,{month:'2026-11',kind:'days',userIds:[attendant.id]});
  all=(await getSchedule(pool,manager,'2026-11')).entries.filter(e=>e.user_id===attendant.id);
  assert.equal(all.find(e=>e.day===changed.day).is_off,true);
  assert.equal(all.find(e=>e.day===changed.day).off_source,'manual');
  await assert.rejects(editScheduleDay(pool,coordinator,{targetId:attendant.id,date:work.day,kind:'breaks',breaks:manualBreak}),e=>e.status===403);
  await assert.rejects(editScheduleDay(pool,manager,{targetId:manager.id,date:work.day,kind:'days',off:true}),e=>e.status===403);
  await editShift(pool,manager,{targetId:attendant.id,month:'2026-11',start:'18:00',end:'00:20'});
  const afterShift=await getSchedule(pool,manager,'2026-11');
  assert.equal(afterShift.profiles.find(p=>p.user_id===attendant.id).start_time,'18:00');
  const altered=afterShift.entries.filter(e=>e.user_id===attendant.id);
  assert.ok(altered.every(e=>e.start_time==='18:00'&&e.end_time==='00:20'),'toda a escala do mês deve refletir o turno atualizado');
  for(const e of altered.filter(e=>!e.is_off))validateBreaks('18:00','00:20',[e.break_1,e.break_2,e.break_3]);
  assert.equal(altered.find(e=>e.day===work.day).break_source,'auto','pausa manual incompatível precisa ser redistribuída');
  const entries=(await pg.query('SELECT action FROM audit_log')).rows;
  assert.ok(entries.some(e=>e.action==='floor_month_generate_days'));
  assert.ok(entries.some(e=>e.action==='floor_break_manual'));
 }finally{await pg.close();}
});
test('coordenador ajusta gestor, Dev controla perfis mas a conta Dev é protegida',async()=>{
 const {pg,pool,dev,coordinator,manager,attendant}=await setup();
 try{
  const r=await generateMonth(pool,coordinator,{month:'2026-12',kind:'days',userIds:[manager.id]});
  assert.equal(r.updated,31);
  await assert.rejects(generateMonth(pool,manager,{month:'2026-12',kind:'days',userIds:[manager.id]}),e=>e.status===403);
  await assert.rejects(editOperationalRole(pool,manager,{targetId:attendant.id,role:'manager'}),e=>e.status===403);
  const changed=await editOperationalRole(pool,dev,{targetId:attendant.id,role:'manager'});
  assert.equal(changed.user.operational_role,'manager');
  await assert.rejects(editOperationalRole(pool,dev,{targetId:dev.id,role:'attendant'}),e=>e.status===403);
  await assert.rejects(editOperationalRole(pool,dev,{targetId:manager.id,role:'dev'}),e=>e.status===400);
 }finally{await pg.close();}
});


test('folga fixa semanal: segunda a domingo, preferências persistem e geração respeita o dia',async()=>{
 const {pg,pool,manager,attendant,coordinator}=await setup();
 try{
  assert.equal(validOffWeekday(null),true);
  assert.equal(validOffWeekday(0),true);
  assert.equal(validOffWeekday(6),true);
  assert.equal(validOffWeekday(7),false);
  assert.equal(validOffWeekday('1'),false);
  await assert.rejects(editSchedulePreferences(pool,attendant,{targetId:attendant.id,fixedOffWeekday:1}),e=>e.status===403);
  await assert.rejects(editSchedulePreferences(pool,coordinator,{targetId:attendant.id,fixedOffWeekday:1}),e=>e.status===403);
  await assert.rejects(editSchedulePreferences(pool,manager,{targetId:attendant.id,fixedOffWeekday:8}),e=>e.status===400);
  const saved=await editSchedulePreferences(pool,manager,{targetId:attendant.id,fixedOffWeekday:1});
  assert.equal(saved.profile.fixed_off_weekday,1);
  const profile=(await getSchedule(pool,attendant,'2026-12')).profiles.find(p=>p.user_id===attendant.id);
  assert.equal(profile.fixed_off_weekday,1);
  await generateMonth(pool,manager,{month:'2026-12',kind:'days',userIds:[attendant.id]});
  let entries=(await getSchedule(pool,attendant,'2026-12')).entries.filter(p=>p.user_id===attendant.id);
  assert.equal(entries.length,31);
  const autoSunday=entries.filter(p=>p.is_off&&weekdayOf(p.day)===0);
  assert.equal(autoSunday.length,1);
  assert.ok(entries.every(p=>p.is_off===(weekdayOf(p.day)===1&&mondayOf(p.day)!==mondayOf(autoSunday[0].day)||p.day===autoSunday[0].day)));
  // Exceções manuais continuam mais importantes que a folga fixa.
  const monday=entries.find(p=>weekdayOf(p.day)===1);
  await editScheduleDay(pool,manager,{targetId:attendant.id,date:monday.day,kind:'days',off:false});
  await generateMonth(pool,manager,{month:'2026-12',kind:'days',userIds:[attendant.id]});
  entries=(await getSchedule(pool,attendant,'2026-12')).entries.filter(p=>p.user_id===attendant.id);
  assert.equal(entries.find(p=>p.day===monday.day).is_off,false);
  assert.equal(entries.find(p=>p.day===monday.day).off_source,'manual');
  await editSchedulePreferences(pool,manager,{targetId:attendant.id,fixedOffWeekday:5});
  await generateMonth(pool,manager,{month:'2027-01',kind:'days',userIds:[attendant.id]});
  entries=(await getSchedule(pool,attendant,'2027-01')).entries.filter(p=>p.user_id===attendant.id);
  const janSunday=entries.filter(p=>p.is_off&&weekdayOf(p.day)===0);
  assert.equal(janSunday.length,1);
  assert.ok(entries.every(p=>p.is_off===(weekdayOf(p.day)===5&&mondayOf(p.day)!==mondayOf(janSunday[0].day)||p.day===janSunday[0].day)));
  await editSchedulePreferences(pool,manager,{targetId:attendant.id,fixedOffWeekday:null});
  const reverted=(await getSchedule(pool,attendant,'2027-01')).profiles.find(p=>p.user_id===attendant.id);
  assert.equal(reverted.fixed_off_weekday,null);
 }finally{await pg.close();}
});

test('pausas redondas: múltiplos de 5, 10, 15 e 30 minutos dentro da jornada',()=>{
 for(const step of [5,10,15,30]){
  assert.equal(validRoundInterval(step),true);
  for(const [start,end] of [['08:00','14:20'],['18:00','00:20'],['08:07','11:07'],['23:17','05:37']]){
   const breaks=defaultBreaks(start,end,4,step);
   assert.deepEqual(validateBreaks(start,end,breaks),breaks);
   assert.ok(breaks.every(time=>/^([01]\d|2[0-3]):[0-5]\d$/.test(time)));
   assert.ok(breaks.every(time=>Number(time.slice(3,5))%step===0||step===15&&[0,15,30,45].includes(Number(time.slice(3,5)))),'pausa em minuto arredondado: '+step+' '+breaks.join(','));
  }
 }
 assert.equal(validRoundInterval(0),true);
 assert.equal(validRoundInterval(7),false);
 assert.throws(()=>defaultBreaks('08:00','14:20',0,7));
});

test('arredondamento salva por atendente e pode ser substituído só na geração do mês',async()=>{
 const {pg,pool,manager,coordinator,attendant}=await setup();
 try{
  await assert.rejects(editSchedulePreferences(pool,coordinator,{targetId:attendant.id,breakRoundMinutes:10}),e=>e.status===403);
  await assert.rejects(editSchedulePreferences(pool,manager,{targetId:attendant.id,breakRoundMinutes:11}),e=>e.status===400);
  await editSchedulePreferences(pool,manager,{targetId:attendant.id,breakRoundMinutes:10});
  await generateMonth(pool,manager,{month:'2027-02',kind:'days',userIds:[attendant.id]});
  let entries=(await getSchedule(pool,attendant,'2027-02')).entries.filter(e=>e.user_id===attendant.id&&!e.is_off);
  assert.ok(entries.every(e=>[e.break_1,e.break_2,e.break_3].every(t=>Number(t.slice(-2))%10===0)));
  await generateMonth(pool,manager,{month:'2027-02',kind:'breaks',userIds:[attendant.id],roundMinutes:15});
  entries=(await getSchedule(pool,attendant,'2027-02')).entries.filter(e=>e.user_id===attendant.id&&!e.is_off);
  assert.ok(entries.every(e=>[e.break_1,e.break_2,e.break_3].every(t=>Number(t.slice(-2))%15===0)));
  let saved=(await getSchedule(pool,manager,'2027-02')).profiles.find(p=>p.user_id===attendant.id);
  assert.equal(saved.break_round_minutes,10,'override mensal não altera preferência individual');
  const first=entries[0];
  await editScheduleDay(pool,manager,{targetId:attendant.id,date:first.day,kind:'breaks',breaks:['09:03','10:47','12:03']});
  await generateMonth(pool,manager,{month:'2027-02',kind:'breaks',userIds:[attendant.id],roundMinutes:30});
  entries=(await getSchedule(pool,attendant,'2027-02')).entries.filter(e=>e.user_id===attendant.id&&!e.is_off);
  const manual=entries.find(e=>e.day===first.day);
  assert.deepEqual([manual.break_1,manual.break_2,manual.break_3],['09:03','10:47','12:03'],'horários manuais não são arredondados automaticamente');
  assert.equal(manual.break_source,'manual');
  assert.ok(entries.filter(e=>e.break_source==='auto').every(e=>[e.break_1,e.break_2,e.break_3].every(t=>Number(t.slice(-2))%30===0)));
  await assert.rejects(generateMonth(pool,manager,{month:'2027-03',kind:'days',userIds:[attendant.id],roundMinutes:7}),e=>e.status===400);
 }finally{await pg.close();}
});


test('escolher domingo da folga mensal substitui a folga fixa somente naquela semana',async()=>{
 const {pg,pool,dev,manager,coordinator,attendant}=await setup();
 try{
  await editSchedulePreferences(pool,manager,{targetId:attendant.id,fixedOffWeekday:2});
  assert.equal(isSundayInMonth('2026-11','2026-11-22'),true);
  assert.equal(isSundayInMonth('2026-11','2026-11-21'),false);
  await assert.rejects(editSundayChoice(pool,coordinator,{targetId:attendant.id,month:'2026-11',sundayDate:'2026-11-22'}),e=>e.status===403);
  await assert.rejects(editSundayChoice(pool,manager,{targetId:attendant.id,month:'2026-11',sundayDate:'2026-11-21'}),e=>e.status===400);
  await editSundayChoice(pool,manager,{targetId:attendant.id,month:'2026-11',sundayDate:'2026-11-22'});
  assert.equal((await getSchedule(pool,attendant,'2026-11')).sundays[0].sunday_date,'2026-11-22');
  await generateMonth(pool,manager,{month:'2026-11',kind:'days',userIds:[attendant.id]});
  const all=(await getSchedule(pool,manager,'2026-11')).entries.filter(e=>e.user_id===attendant.id);
  assert.equal(all.filter(e=>e.is_off&&weekdayOf(e.day)===0).length,1);
  assert.equal(all.find(e=>e.day==='2026-11-22').is_off,true);
  assert.equal(all.find(e=>e.day==='2026-11-17').is_off,false,'terça da semana do domingo escolhido vira dia de trabalho');
  assert.equal(all.find(e=>e.day==='2026-11-24').is_off,true,'folga fixa volta na semana seguinte');
  assert.equal(all.find(e=>e.day==='2026-11-10').is_off,true);
  // Troca não apaga ajustes manuais.
  await editScheduleDay(pool,manager,{targetId:attendant.id,date:'2026-11-25',kind:'days',off:true});
  const regen=await generateMonth(pool,manager,{month:'2026-11',kind:'days',userIds:[attendant.id]});
  assert.ok(regen.manualConflicts>=1);
  assert.equal((await getSchedule(pool,manager,'2026-11')).entries.find(e=>e.user_id===attendant.id&&e.day==='2026-11-25').is_off,true);
  await editSundayChoice(pool,dev,{targetId:attendant.id,month:'2026-11',sundayDate:null});
  assert.equal((await getSchedule(pool,manager,'2026-11')).sundays.length,0);
  await editSchedulePreferences(pool,manager,{targetId:attendant.id,fixedOffWeekday:0});
  await assert.rejects(editSundayChoice(pool,manager,{targetId:attendant.id,month:'2026-11',sundayDate:'2026-11-15'}),e=>e.status===400);
 }finally{await pg.close();}
});

test('turno das 18h às 00h20 corrige todas as pausas do mês e mantém marcações manuais válidas',async()=>{
 const {pg,pool,manager,attendant}=await setup();
 try{
  await generateMonth(pool,manager,{month:'2027-04',kind:'days',userIds:[attendant.id]});
  let work=(await getSchedule(pool,manager,'2027-04')).entries.find(x=>x.user_id===attendant.id&&!x.is_off);
  const retimed=await editShift(pool,manager,{targetId:attendant.id,month:'2027-04',start:'18:00',end:'00:20'});
  assert.ok(retimed.updated>=28);
  let all=(await getSchedule(pool,manager,'2027-04')).entries.filter(x=>x.user_id===attendant.id);
  assert.ok(all.every(x=>x.start_time==='18:00'&&x.end_time==='00:20'));
  for(const e of all.filter(e=>!e.is_off))validateBreaks('18:00','00:20',[e.break_1,e.break_2,e.break_3]);
  const valid=['19:30','21:10','23:00'];
  await editScheduleDay(pool,manager,{targetId:attendant.id,date:work.day,kind:'breaks',breaks:valid});
  await editShift(pool,manager,{targetId:attendant.id,month:'2027-04',start:'18:10',end:'00:30'});
  all=(await getSchedule(pool,manager,'2027-04')).entries.filter(x=>x.user_id===attendant.id);
  assert.equal(all.find(x=>x.day===work.day).break_source,'manual');
  assert.deepEqual([all.find(x=>x.day===work.day).break_1,all.find(x=>x.day===work.day).break_2,all.find(x=>x.day===work.day).break_3],valid);
  await editShift(pool,manager,{targetId:attendant.id,month:'2027-04',start:'08:00',end:'14:20'});
  all=(await getSchedule(pool,manager,'2027-04')).entries.filter(x=>x.user_id===attendant.id);
  assert.equal(all.find(x=>x.day===work.day).break_source,'auto');
  for(const e of all.filter(e=>!e.is_off))validateBreaks('08:00','14:20',[e.break_1,e.break_2,e.break_3]);
 }finally{await pg.close();}
});

test('pausas entre colegas são escalonadas no mesmo dia e respeitam o arredondamento noturno',async()=>{
 const {pg,pool,manager,attendant}=await setup();
 try{
  const colleague={id:randomUUID(),username:'atendente.002',display_name:'Outra pessoa',operational_role:'attendant'};
  await pg.query("INSERT INTO users(id,username,display_name,role,operational_role,active) VALUES($1,$2,$3,'user','attendant',true)",[colleague.id,colleague.username,colleague.display_name]);
  for(const target of [attendant,colleague]){
   await editShift(pool,manager,{targetId:target.id,month:'2027-05',start:'18:00',end:'00:20'});
   await editSchedulePreferences(pool,manager,{targetId:target.id,breakRoundMinutes:10,fixedOffWeekday:2});
  }
  await generateMonth(pool,manager,{month:'2027-05',kind:'days',userIds:[attendant.id,colleague.id]});
  const all=(await getSchedule(pool,manager,'2027-05')).entries;
  const day='2027-05-03';
  let first=all.find(x=>x.user_id===attendant.id&&x.day===day),second=all.find(x=>x.user_id===colleague.id&&x.day===day);
  assert.equal(first.is_off,false);assert.equal(second.is_off,false);
  const a=[first.break_1,first.break_2,first.break_3],b=[second.break_1,second.break_2,second.break_3];
  validateBreaks('18:00','00:20',a);validateBreaks('18:00','00:20',b);
  assert.notDeepEqual(a,b,'colegas devem receber horários de pausa diferentes');
  assert.ok([...a,...b].every(t=>Number(t.split(':')[1])%10===0),'minutos redondos');
  const choice=distributedBreaks('18:00','00:20',{roundMinutes:10,personKey:'teste',date:day,occupied:[first]});
  validateBreaks('18:00','00:20',choice);
 }finally{await pg.close();}
});
