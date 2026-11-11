import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {ROLES,ROLE_LABELS,canManage,daysInMonth,validDate,shiftLength,defaultBreaks,validateBreaks,generateMonth,editScheduleDay,editShift,editOperationalRole,getSchedule} from '../lib/floor-scheduling.js';

const newUser=(username,operational_role)=>({id:randomUUID(),username,display_name:username,role:'user',operational_role,active:true});
async function setup(){
 const pg=new PGlite();
 await pg.exec("CREATE TABLE users(id uuid PRIMARY KEY,username text UNIQUE NOT NULL,display_name text NOT NULL,role text NOT NULL DEFAULT 'user',operational_role text NOT NULL DEFAULT 'attendant',active boolean NOT NULL DEFAULT true);CREATE TABLE audit_log(id uuid PRIMARY KEY,actor_id uuid,action text,target text);CREATE TABLE floor_shift_profiles(user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,start_time text NOT NULL DEFAULT '08:00',end_time text NOT NULL DEFAULT '14:20',updated_by uuid REFERENCES users(id),updated_at timestamptz NOT NULL DEFAULT now());CREATE TABLE floor_schedule_entries(user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,day date NOT NULL,is_off boolean NOT NULL DEFAULT false,start_time text NOT NULL DEFAULT '08:00',end_time text NOT NULL DEFAULT '14:20',break_1 text,break_2 text,break_3 text,off_source text NOT NULL DEFAULT 'auto' CHECK(off_source IN ('auto','manual')),break_source text NOT NULL DEFAULT 'auto' CHECK(break_source IN ('auto','manual')),updated_by uuid REFERENCES users(id),updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,day));");
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
  for(let i=0;i<all.length-6;i++)assert.ok(all.slice(i,i+7).some(r=>r.is_off),'não deve haver mais de 6 dias trabalhados consecutivos');
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
  await editShift(pool,manager,{targetId:attendant.id,start:'18:00',end:'00:20'});
  const afterShift=await getSchedule(pool,manager,'2026-11');
  assert.equal(afterShift.profiles.find(p=>p.user_id===attendant.id).start_time,'18:00');
  assert.equal(afterShift.entries.find(e=>e.user_id===attendant.id).start_time,'08:00','jornada anterior preservada até uma nova geração');
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
