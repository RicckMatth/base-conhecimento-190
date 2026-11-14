import {randomUUID} from 'node:crypto';
import {QUALITY_BLOCKS,QUALITY_CRITICAL,canAuditQuality,qualityScore,qualitySummary,qualityDate,qualityMonth,qualityText,qualityDuration,qualityManagement,qualitySignature} from './quality-core.js';

const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const period=m=>m+'-01';
const auditTypes=['audio','live'],shiftPeriods=['weekday','weekend'];
const val=(v,options,label)=>{if(!options.includes(v))throw fail(label+' inválido.');return v;};
async function recordAudit(c,actor,action,id){await c.query('INSERT INTO audit_log(id,actor_id,action,target) VALUES($1,$2,$3,$4)',[randomUUID(),actor.id,action,id]);}
async function transaction(pool,fn){
 const c=await pool.connect();
 try{await c.query('BEGIN');const out=await fn(c);await c.query('COMMIT');return out;}
 catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
async function operator(pool,id){
 if(!uuid(id))throw fail('Selecione um operador válido.');
 const r=await pool.query('SELECT id,display_name,username,operational_role,active FROM users WHERE id=$1',[id]);
 if(!r.rows[0]?.active)throw fail('Operador não encontrado ou inativo.',404);
 return r.rows[0];
}
const ownOrAuditor=(actor,row)=>actor.role==='admin'||row.operator_id===actor.id||canAuditQuality(actor)&&row.auditor_id===actor.id;
function canChange(actor,row){
 if(!canAuditQuality(actor)||row.status!=='draft'||!(actor.role==='admin'||row.auditor_id===actor.id))
  throw fail('Apenas o avaliador responsável pode alterar o rascunho.',403);
}
function monitorFields(v,{publish=false}={}){
 if(!qualityDate(v?.auditDay))throw fail('Data de auditoria inválida.');
 const day=v.auditDay;
 const protocol=qualityText(v.protocolCad,90);
 const duration=qualityDuration(v.durationSeconds);
 const type=val(v.auditType,auditTypes,'Tipo de auditoria');
 const shift=val(v.shiftPeriod,shiftPeriods,'Período');
 const ratings=v.ratings||{},critical=v.critical||[];
 const scoring=qualityScore(ratings,critical,{complete:publish});
 if(publish&&protocol.length<2)throw fail('Informe o protocolo CAD antes de publicar a avaliação.');
 const strengths=qualityText(v.strengths,4000),improvements=qualityText(v.improvements,4000),
  corrective=qualityText(v.correctiveAction,4000),management=qualityManagement(v.managementAction);
 if(publish&&(!strengths||!improvements||!corrective||!management))
  throw fail('Preencha pontos fortes, oportunidades de melhoria, ação corretiva e providência gerencial antes de publicar.');
 if(publish&&critical.length&&!corrective)throw fail('Penalidade crítica exige plano de ação imediato.');
 return {day,protocol,duration,type,shift,ratings,critical,scoring,strengths,improvements,corrective,management};
}
function followupFields(v){
 if(!qualityMonth(v?.month))throw fail('Mês de acompanhamento inválido.');
 return {month:v.month,shift:qualityText(v.shiftTeam,100),strengths:qualityText(v.strengths,4000),
  gaps:qualityText(v.recurringGaps,4000),corrective:qualityText(v.correctiveAction,4000),management:qualityManagement(v.managementAction)};
}
function reportVisibility(actor){
 return actor.role==='admin'?'(x.operator_id=$1 OR TRUE)':canAuditQuality(actor)?
  "(x.operator_id=$1 AND x.status='published' OR x.auditor_id=$1)":
  "(x.operator_id=$1 AND x.status='published')";
}
export async function qualityBoard(pool,actor,month){
 if(!qualityMonth(month))throw fail('Mês inválido.');
 const manager=canAuditQuality(actor),scope=reportVisibility(actor);
 const [mon,follow,users]=await Promise.all([
  pool.query("SELECT x.*,operator.display_name AS operator_name,operator.username AS operator_username,auditor.display_name AS auditor_name FROM quality_monitors x JOIN users operator ON operator.id=x.operator_id JOIN users auditor ON auditor.id=x.auditor_id WHERE to_char(x.audit_day,'YYYY-MM')=$2 AND "+scope+" ORDER BY x.audit_day DESC,x.created_at DESC",[actor.id,month]),
  pool.query("SELECT x.*,operator.display_name AS operator_name,operator.username AS operator_username,auditor.display_name AS auditor_name FROM quality_followups x JOIN users operator ON operator.id=x.operator_id JOIN users auditor ON auditor.id=x.auditor_id WHERE x.period=$2::date AND "+scope+" ORDER BY x.updated_at DESC",[actor.id,period(month)]),
  manager?pool.query("SELECT id,display_name,username,operational_role FROM users WHERE active=true AND operational_role='attendant' ORDER BY display_name LIMIT 400"):Promise.resolve({rows:[]})
 ]);
 const items=mon.rows.filter(x=>x.status==='published');
 const signed=items.filter(x=>x.acknowledged_at);
 return {month,canAudit:manager,operators:users.rows,monitors:mon.rows,followups:follow.rows,
  overview:{published:items.length,pendingSignature:items.filter(x=>x.operator_id===actor.id&&!x.acknowledged_at).length,
   signed:signed.length,average:qualitySummary(items).average},criteria:QUALITY_BLOCKS,criticalOptions:QUALITY_CRITICAL};
}
export async function qualitySaveMonitor(pool,actor,v,{publish=false}={}){
 if(!canAuditQuality(actor))throw fail('Somente responsáveis de qualidade podem cadastrar monitorias.',403);
 return transaction(pool,async c=>{
  let row=null,op;
  if(v?.id){
   if(!uuid(v.id))throw fail('Identificador inválido.');
   const q=await c.query('SELECT * FROM quality_monitors WHERE id=$1 FOR UPDATE',[v.id]);row=q.rows[0];
   if(!row)throw fail('Monitoria não encontrada.',404);
   canChange(actor,row);
   op=await operator(c,row.operator_id);
  }else{
   op=await operator(c,v?.operatorId);
   if(actor.id===op.id)throw fail('Não é permitido avaliar a própria conta.');
  }
  const f=monitorFields(v,{publish});
  const signature=publish?qualitySignature({name:v.auditorName,agreed:v.auditorAgreed},actor.display_name).name:null;
  let result;
  if(row){
   result=await c.query("UPDATE quality_monitors SET protocol_cad=$2,audit_day=$3::date,duration_seconds=$4,audit_type=$5,shift_period=$6,ratings=$7::jsonb,critical=$8::jsonb,score=$9,raw_score=$10,points_earned=$11,points_available=$12,strengths=$13,improvements=$14,corrective_action=$15,management_action=$16,status=$17,auditor_signature=CASE WHEN $18::text IS NOT NULL THEN $18 ELSE auditor_signature END,published_at=CASE WHEN $17='published' THEN now() ELSE published_at END,updated_at=now() WHERE id=$1 RETURNING *",
    [row.id,f.protocol,f.day,f.duration,f.type,f.shift,JSON.stringify(f.ratings),JSON.stringify(f.critical),
     f.scoring.score,f.scoring.raw,f.scoring.awarded,f.scoring.available,f.strengths,f.improvements,f.corrective,f.management,
     publish?'published':'draft',signature]);
  }else{
   const id=randomUUID();
   result=await c.query("INSERT INTO quality_monitors(id,operator_id,auditor_id,protocol_cad,audit_day,duration_seconds,audit_type,shift_period,ratings,critical,score,raw_score,points_earned,points_available,strengths,improvements,corrective_action,management_action,status,auditor_signature,published_at) VALUES($1,$2,$3,$4,$5::date,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,CASE WHEN $19='published' THEN now() ELSE NULL END) RETURNING *",
    [id,op.id,actor.id,f.protocol,f.day,f.duration,f.type,f.shift,JSON.stringify(f.ratings),JSON.stringify(f.critical),f.scoring.score,f.scoring.raw,
     f.scoring.awarded,f.scoring.available,f.strengths,f.improvements,f.corrective,f.management,publish?'published':'draft',signature]);
  }
  await recordAudit(c,actor,publish?'quality_monitor_published':'quality_monitor_draft_saved',result.rows[0].id);
  return {record:result.rows[0],message:publish?'Nota publicada para ciência do operador.':'Rascunho salvo.'};
 });
}
async function monthlySnapshot(c,operatorId,month){
 const q=await c.query("SELECT id,audit_day::text AS audit_day,protocol_cad,duration_seconds,score,critical,improvements,strengths FROM quality_monitors WHERE operator_id=$1 AND status='published' AND to_char(audit_day,'YYYY-MM')=$2 ORDER BY audit_day,id",[operatorId,month]);
 const monitors=q.rows,summary=qualitySummary(monitors.map(x=>({...x,status:'published'})));
 return {month,summary,history:monitors};
}
export async function qualitySaveFollowup(pool,actor,v,{publish=false}={}){
 if(!canAuditQuality(actor))throw fail('Apenas responsáveis de qualidade podem elaborar acompanhamentos.',403);
 const f=followupFields(v);
 const op=await operator(pool,v.operatorId);
 if(op.id===actor.id)throw fail('Não é permitido acompanhar a própria conta.');
 return transaction(pool,async c=>{
  let existing=(await c.query('SELECT * FROM quality_followups WHERE operator_id=$1 AND period=$2::date FOR UPDATE',[op.id,period(f.month)])).rows[0];
  if(existing)canChange(actor,existing);
  const snapshot=await monthlySnapshot(c,op.id,f.month);
  if(publish){
   if(snapshot.summary.count===0)throw fail('É necessária ao menos uma monitoria publicada neste mês.');
   if(!f.strengths||!f.gaps||!f.corrective||!f.management)throw fail('Preencha o feedback, as não conformidades, a ação acordada e a providência gerencial.');
  }
  const sign=publish?qualitySignature({name:v.auditorName,agreed:v.auditorAgreed},actor.display_name).name:null;
  let row;
  if(existing)row=await c.query("UPDATE quality_followups SET shift_team=$2,strengths=$3,recurring_gaps=$4,corrective_action=$5,management_action=$6,status=$7,snapshot=$8::jsonb,auditor_signature=CASE WHEN $9::text IS NOT NULL THEN $9 ELSE auditor_signature END,published_at=CASE WHEN $7='published' THEN now() ELSE published_at END,updated_at=now() WHERE id=$1 RETURNING *",
   [existing.id,f.shift,f.strengths,f.gaps,f.corrective,f.management,publish?'published':'draft',publish?JSON.stringify(snapshot):null,sign]);
  else row=await c.query("INSERT INTO quality_followups(id,operator_id,auditor_id,period,shift_team,strengths,recurring_gaps,corrective_action,management_action,status,snapshot,auditor_signature,published_at) VALUES($1,$2,$3,$4::date,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,CASE WHEN $10='published' THEN now() ELSE NULL END) RETURNING *",
   [randomUUID(),op.id,actor.id,period(f.month),f.shift,f.strengths,f.gaps,f.corrective,f.management,publish?'published':'draft',publish?JSON.stringify(snapshot):null,sign]);
  await recordAudit(c,actor,publish?'quality_followup_published':'quality_followup_draft_saved',row.rows[0].id);
  return {record:row.rows[0],message:publish?'Acompanhamento mensal publicado para ciência.':'Acompanhamento mensal salvo como rascunho.'};
 });
}
export async function qualityAcknowledge(pool,actor,v){
 const kind=val(v?.kind,['monitor','followup'],'Tipo de documento');
 if(!uuid(v?.id))throw fail('Documento inválido.');
 const sig=qualitySignature(v.signature,actor.display_name);
 const table=kind==='monitor'?'quality_monitors':'quality_followups';
 return transaction(pool,async c=>{
  const rows=await c.query('SELECT id,operator_id,status,acknowledged_at FROM '+table+' WHERE id=$1 FOR UPDATE',[v.id]);
  const item=rows.rows[0];
  if(!item||item.operator_id!==actor.id)throw fail('Este documento não foi destinado à sua conta.',403);
  if(item.status!=='published')throw fail('Documento não publicado.',409);
  if(item.acknowledged_at)throw fail('A ciência deste documento já foi registrada.',409);
  const result=await c.query('UPDATE '+table+' SET acknowledged_at=now(),operator_signature_name=$2,operator_signature_image=$3,updated_at=now() WHERE id=$1 RETURNING id,acknowledged_at,operator_signature_name',[v.id,sig.name,sig.image]);
  await recordAudit(c,actor,'quality_'+kind+'_acknowledged',v.id);
  return {signature:result.rows[0],message:'Ciência registrada com a identidade autenticada e a data/hora do servidor. O registro não significa concordância com a avaliação.'};
 });
}
