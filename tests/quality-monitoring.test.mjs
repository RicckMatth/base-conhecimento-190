import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {QUALITY_BLOCKS,QUALITY_CRITICAL,QUALITY_MAX,qualityScore,qualityClass,qualitySignature,qualitySummary} from '../lib/quality-core.js';
import {prepareQualitySchema} from '../lib/quality-schema.js';
import {qualityBoard,qualitySaveMonitor,qualitySaveFollowup,qualityAcknowledge} from '../lib/quality-store.js';

const day='2026-11-12',month='2026-11',ratings=()=>Object.fromEntries(QUALITY_BLOCKS.flatMap(b=>b.items).map(x=>[x.id,'yes']));
const actors=()=>({
 manager:{id:randomUUID(),display_name:'Gestora de Qualidade',username:'gestora.001',role:'user',operational_role:'manager',active:true},
 attendant:{id:randomUUID(),display_name:'Atendente Avaliado',username:'atendente.001',role:'user',operational_role:'attendant',active:true},
 colleague:{id:randomUUID(),display_name:'Outra Pessoa',username:'atendente.002',role:'user',operational_role:'attendant',active:true},
 admin:{id:randomUUID(),display_name:'Admin Principal',username:'pm-civil.bandeira',role:'admin',operational_role:'dev',active:true}
});
async function setup(){
 const pg=new PGlite();
 await pg.exec("CREATE TABLE users(id uuid PRIMARY KEY,display_name text NOT NULL,username text UNIQUE NOT NULL,role text NOT NULL,operational_role text NOT NULL,active boolean NOT NULL DEFAULT true);CREATE TABLE audit_log(id uuid PRIMARY KEY,actor_id uuid REFERENCES users(id),action text NOT NULL,target text,at timestamptz DEFAULT now())");
 await prepareQualitySchema(pg);
 const actor=actors();
 for(const user of Object.values(actor))await pg.query('INSERT INTO users(id,display_name,username,role,operational_role,active) VALUES($1,$2,$3,$4,$5,true)',[user.id,user.display_name,user.username,user.role,user.operational_role]);
 const pool={query:(q,a)=>pg.query(q,a),connect:async()=>({query:(q,a)=>pg.query(q,a),release(){}})};
 return {pg,pool,...actor};
}
const form=(operatorId,patch={})=>({operatorId,protocolCad:'CAD-190-001',auditDay:day,durationSeconds:380,auditType:'audio',shiftPeriod:'weekday',ratings:ratings(),critical:[],strengths:'Abordagem respeitosa e objetiva.',improvements:'Confirmar o ponto de referência antes da finalização.',correctiveAction:'Revisar fraseologia e validar localização com o supervisor.',managementAction:'feedback',...patch});
const auditor=v=>({...v,auditorName:'Gestora de Qualidade',auditorAgreed:true});

test('fichas PDF: quatro blocos, doze critérios, cem pontos e seis penalidades críticas',()=>{
 assert.deepEqual(QUALITY_BLOCKS.map(x=>x.max),[10,45,25,20]);
 assert.deepEqual(QUALITY_BLOCKS.map(x=>x.items.length),[2,5,3,2]);
 assert.equal(QUALITY_MAX,100);
 assert.equal(QUALITY_CRITICAL.length,6);
 assert.equal(qualityScore(ratings(),[],{complete:true}).score,100);
 assert.equal(qualityClass(90).id,'excellent');
 assert.equal(qualityClass(89).id,'adequate');
 assert.equal(qualityClass(75).id,'adequate');
 assert.equal(qualityClass(74).id,'below');
});
test('nota é proporcional aos critérios aplicáveis (N/A) e tolerância zero zera o total',()=>{
 const a=ratings();a['2.1']='na';a['1.1']='no';
 const score=qualityScore(a,[],{complete:true});
 assert.equal(score.available,85);assert.equal(score.awarded,80);assert.equal(score.score,94);
 const zero=qualityScore(a,['geo'],{complete:true});
 assert.equal(zero.score,0);assert.equal(zero.raw,94);assert.equal(zero.critical,true);
 const missing=ratings();delete missing['2.4'];
 assert.throws(()=>qualityScore(missing,[],{complete:true}),/todos os 12 critérios/);
 assert.throws(()=>qualityScore(Object.fromEntries(Object.keys(ratings()).map(k=>[k,'na'])),[],{complete:true}),/Ao menos um critério/);
 assert.throws(()=>qualityScore(a,['geo','geo'],{complete:true}),/Penalidade crítica/);
});
test('a assinatura exige nome autenticado, aceite expresso e PNG válido quando fornecido',()=>{
 assert.equal(qualitySignature({name:'Atendente Avaliado',agreed:true},'Atendente Avaliado').name,'Atendente Avaliado');
 assert.throws(()=>qualitySignature({name:'Outra Pessoa',agreed:true},'Atendente Avaliado'),/exatamente o nome/);
 assert.throws(()=>qualitySignature({name:'Atendente Avaliado',agreed:false},'Atendente Avaliado'),/confirme/);
 assert.throws(()=>qualitySignature({name:'Atendente Avaliado',agreed:true,image:'data:text/html,hello'},'Atendente Avaliado'),/Assinatura desenhada inválida/);
});
test('atendente não publica avaliação, não pode avaliar a si mesmo e não acessa rascunho',async()=>{
 const {pg,pool,manager,attendant,colleague}=await setup();
 try{
  await assert.rejects(qualitySaveMonitor(pool,attendant,form(colleague.id),{publish:true}),e=>e.status===403);
  await assert.rejects(qualitySaveMonitor(pool,manager,form(manager.id),{publish:false}),/atendentes do 190/);
  const draft=await qualitySaveMonitor(pool,manager,form(attendant.id,{ratings:{'1.1':'yes'}}));
  assert.equal(draft.record.status,'draft');
  const own=await qualityBoard(pool,attendant,month);
  assert.equal(own.monitors.length,0);
  const other=await qualityBoard(pool,colleague,month);
  assert.equal(other.monitors.length,0);
  const m=await qualityBoard(pool,manager,month);
  assert.equal(m.monitors.length,1);
  assert.equal(m.monitors[0].status,'draft');
  assert.equal(m.operators.length,2);
 }finally{await pg.close();}
});
test('monitoria publicada preserva nota e só operador autenticado assina uma única vez',async()=>{
 const {pg,pool,manager,attendant,colleague,admin}=await setup();
 try{
  const draft=await qualitySaveMonitor(pool,manager,form(attendant.id));
  const note=await qualitySaveMonitor(pool,manager,auditor(form(attendant.id,{id:draft.record.id})),{publish:true});
  assert.equal(note.record.score,100);
  assert.equal(note.record.status,'published');
  assert.ok(note.record.published_at);
  await assert.rejects(qualitySaveMonitor(pool,manager,form(attendant.id,{id:note.record.id})),e=>e.status===403);
  const b=await qualityBoard(pool,attendant,month);
  assert.equal(b.monitors.length,1);
  assert.equal(b.monitors[0].score,100);
  assert.equal(b.overview.pendingSignature,1);
  assert.equal((await qualityBoard(pool,colleague,month)).monitors.length,0);
  await assert.rejects(qualityAcknowledge(pool,colleague,{kind:'monitor',id:note.record.id,signature:{name:colleague.display_name,agreed:true}}),e=>e.status===403);
  await assert.rejects(qualityAcknowledge(pool,admin,{kind:'monitor',id:note.record.id,signature:{name:admin.display_name,agreed:true}}),e=>e.status===403);
  const signed=await qualityAcknowledge(pool,attendant,{kind:'monitor',id:note.record.id,signature:{name:attendant.display_name,agreed:true}});
  assert.equal(signed.signature.operator_signature_name,attendant.display_name);
  assert.ok(signed.signature.acknowledged_at);
  await assert.rejects(qualityAcknowledge(pool,attendant,{kind:'monitor',id:note.record.id,signature:{name:attendant.display_name,agreed:true}}),e=>e.status===409);
  const rows=(await pg.query("SELECT action FROM audit_log WHERE action LIKE 'quality_%'")).rows;
  assert.ok(rows.some(x=>x.action==='quality_monitor_published'));
  assert.ok(rows.some(x=>x.action==='quality_monitor_acknowledged'));
 }finally{await pg.close();}
});
test('acompanhamento mensal consolida histórico, TMA, nota e requer ciência separada do operador',async()=>{
 const {pg,pool,manager,attendant}=await setup();
 try{
  const m1=await qualitySaveMonitor(pool,manager,auditor(form(attendant.id)),{publish:true});
  const r2=ratings();r2['1.1']='no';
  const m2=await qualitySaveMonitor(pool,manager,auditor(form(attendant.id,{protocolCad:'CAD-190-002',auditDay:'2026-11-13',durationSeconds:340,ratings:r2})),{publish:true});
  const data={operatorId:attendant.id,month,shiftTeam:'Noturno',strengths:'Atende com empatia.',recurringGaps:'Confirmar endereço.',
    correctiveAction:'Treino e escuta conjunta do áudio.',managementAction:'training',auditorName:manager.display_name,auditorAgreed:true};
  const created=await qualitySaveFollowup(pool,manager,data,{publish:true});
  assert.equal(created.record.status,'published');
  assert.equal(created.record.snapshot.summary.count,2);
  assert.equal(created.record.snapshot.summary.average,97.5);
  assert.equal(created.record.snapshot.summary.tmaSeconds,360);
  assert.equal(created.record.snapshot.history.length,2);
  const b=await qualityBoard(pool,attendant,month);
  assert.equal(b.followups.length,1);assert.equal(b.overview.pendingSignature,2);
  await qualityAcknowledge(pool,attendant,{kind:'followup',id:created.record.id,signature:{name:attendant.display_name,agreed:true}});
  assert.ok((await qualityBoard(pool,attendant,month)).followups[0].acknowledged_at);
  await assert.rejects(qualitySaveFollowup(pool,manager,data,{publish:false}),e=>e.status===403);
 }finally{await pg.close();}
});
