'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {QUALITY_BLOCKS,QUALITY_CRITICAL,QUALITY_MANAGEMENT,QUALITY_MAX,QUALITY_ACKNOWLEDGE,qualityScore,qualitySummary,qualityClass} from '../lib/quality-core.js';

const pad=v=>String(v).padStart(2,'0');
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
const monthNow=()=>today().slice(0,7);
const printDate=date=>date?new Date(date.includes('T')?date:date+'T12:00:00Z').toLocaleString('pt-BR',date.includes('T')?{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}:{dateStyle:'short',timeZone:'UTC'}):'—';
const duration=s=>s==null?'—':Math.floor(Number(s)/60)+'m '+pad(Number(s)%60)+'s';
const number=v=>v==null?'—':Number(v).toLocaleString('pt-BR',{maximumFractionDigits:1});
const longMonth=m=>new Date(m+'-01T12:00:00Z').toLocaleDateString('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'});
const management=v=>QUALITY_MANAGEMENT.find(x=>x[0]===v)?.[1]||'—';
const newMonitor=(id='')=>({id:null,operatorId:id,protocolCad:'',auditDay:today(),durationSeconds:0,auditType:'audio',shiftPeriod:'weekday',ratings:{},critical:[],strengths:'',improvements:'',correctiveAction:'',managementAction:'',auditorName:'',auditorAgreed:false});
const newFollowup=(month,id='')=>({operatorId:id,month,shiftTeam:'',strengths:'',recurringGaps:'',correctiveAction:'',managementAction:'',auditorName:'',auditorAgreed:false});
async function api(path,options={}){
 const response=await fetch('/api/quality'+path,{credentials:'same-origin',cache:'no-store',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});
 let data={};try{data=await response.json();}catch{}
 if(!response.ok)throw new Error(data.error||'Falha ao consultar a área de qualidade.');
 return data;
}
function getAvg(monitors,operatorId){return qualitySummary(monitors.filter(m=>m.operator_id===operatorId&&m.status==='published'));}
function classification(v){return v==null?'Não classificado':qualityClass(v).label;}
function ScoreTag({score,critical=[]}){return <span className={'qm-score '+(score==null?'neutral':score>=90?'great':score>=75?'good':'bad')}>{score==null?'—':score+'/100'}{critical?.length?' · tolerância zero':''}</span>;}
function SignCanvas({onData,clearToken}){
 const ref=useRef(null),drawing=useRef(false),painted=useRef(false);
 useEffect(()=>{const c=ref.current;if(!c)return;const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#142c42';painted.current=false;onData('');},[clearToken,onData]);
 function coords(e){const r=ref.current.getBoundingClientRect();return {x:(e.clientX-r.left)*ref.current.width/r.width,y:(e.clientY-r.top)*ref.current.height/r.height};}
 function begin(e){e.preventDefault();const c=ref.current;c.setPointerCapture(e.pointerId);const ctx=c.getContext('2d'),p=coords(e);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+.2,p.y+.2);ctx.stroke();drawing.current=true;painted.current=true;}
 function move(e){if(!drawing.current)return;e.preventDefault();const ctx=ref.current.getContext('2d'),p=coords(e);ctx.lineTo(p.x,p.y);ctx.stroke();}
 function end(){if(!drawing.current)return;drawing.current=false;onData(painted.current?ref.current.toDataURL('image/png'):'');}
 return <canvas className="qm-sign-canvas" ref={ref} width={720} height={150} onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end} aria-label="Campo de assinatura desenhada, opcional" role="img"/>;
}
function SignatureLine({name,date,image,label}){
 return <div className="qm-signature-line">{image&&<img src={image} alt="Assinatura desenhada pelo operador"/>}
  <div className="qm-sign-stroke"/><strong>{name||'Assinatura pendente'}</strong><small>{label} · {date?printDate(date):'Data pendente'}</small></div>;
}
function MonitorPrint({record}){
 const ratings=record.ratings||{};
 return <section className="qm-paper">
  <header className="qm-paper-header"><span>GESTÃO DA QUALIDADE (TQM / ISO 9000) · USO INTERNO COPOM / CIOSP</span><h2>Ficha de Monitoria e Auditoria de Qualidade — Atendimento 190</h2></header>
  <div className="qm-paper-fields">
   <p><b>Analista / Operador:</b> {record.operator_name}</p><p><b>Matrícula / ID:</b> {record.operator_username}</p><p><b>Data:</b> {printDate(record.audit_day)}</p>
   <p><b>Supervisor / Auditor:</b> {record.auditor_name}</p><p><b>Protocolo / N° CAD:</b> {record.protocol_cad}</p><p><b>Duração:</b> {duration(record.duration_seconds)}</p>
   <p><b>Turno:</b> {record.shift_period==='weekend'?'Final de semana / pico':'Dia útil'}</p><p><b>Tipo:</b> {record.audit_type==='live'?'Tempo real (escuta ativa)':'Áudio retrospectivo'}</p>
  </div>
  <h3>1. Critérios de avaliação operacional e comportamental (máximo: 100 pontos)</h3>
  <table className="qm-print-table"><thead><tr><th>Critério</th><th>Descrição</th><th>Pts</th><th>Sim</th><th>Não</th><th>N/A</th></tr></thead><tbody>{QUALITY_BLOCKS.map((b,i)=><FragmentRow key={b.id} block={b} index={i} ratings={ratings}/>)}</tbody></table>
  <h3>2. Penalidades críticas — tolerância zero (nota geral zero e feedback imediato)</h3>
  <div className="qm-paper-critical">{QUALITY_CRITICAL.map(c=><div key={c.id}><b>{record.critical?.includes(c.id)?'☒':'☐'} {c.label}</b> — {c.description}</div>)}</div>
  <h3>3. Resultado final, diagnóstico e plano de ação (PDCA)</h3>
  <div className="qm-paper-results"><div><small>PONTUAÇÃO FINAL</small><strong>{record.score} / 100</strong>{record.points_available!==100&&<p>Base aplicável: {record.points_available} pontos · N/A proporcional</p>}</div><div><small>CLASSIFICAÇÃO</small><strong>{classification(record.score)}</strong></div><div><small>PROVIDÊNCIA GERENCIAL</small><strong>{management(record.management_action)}</strong></div></div>
  <div className="qm-paper-notes"><p><b>Pontos fortes:</b> {record.strengths||'—'}</p><p><b>Não conformidades / melhorias:</b> {record.improvements||'—'}</p><p><b>Ação corretiva acordada:</b> {record.corrective_action||'—'}</p></div>
  <div className="qm-paper-signatures"><SignatureLine name={record.auditor_signature} date={record.published_at} label="Supervisor / Auditor de Qualidade"/><SignatureLine name={record.operator_signature_name} image={record.operator_signature_image} date={record.acknowledged_at} label="Ciência do operador avaliado"/></div>
  <p className="qm-print-foot">O recebimento da nota não implica concordância. Ficha digital gerada a partir do registro imutável publicado.</p>
 </section>;
}
function FragmentRow({block,index,ratings}){return <>{<tr className="qm-table-group"><th colSpan={6}>BLOCO {index+1} — {block.name.toUpperCase()} ({block.max} pontos)</th></tr>}{block.items.map(x=><tr key={x.id}><td><b>{x.id} {x.label}</b></td><td>{x.description}</td><td>{x.points}</td><td>{ratings[x.id]==='yes'?'☒':'☐'}</td><td>{ratings[x.id]==='no'?'☒':'☐'}</td><td>{ratings[x.id]==='na'?'☒':'☐'}</td></tr>)}</>;}
function FollowupPrint({record}){
 const summary=record.snapshot?.summary||{},history=record.snapshot?.history||[];
 return <section className="qm-paper">
  <header className="qm-paper-header"><h2>Ficha de Acompanhamento Individual do Operador — 190</h2><span>Gestão da Qualidade (TQM / ISO 9000) · Evolução de desempenho, auditorias e plano de ação (COPOM / CIOSP)</span></header>
  <div className="qm-paper-fields"><p><b>Operador Avaliado:</b> {record.operator_name}</p><p><b>Matrícula / ID:</b> {record.operator_username}</p><p><b>Período / Mês:</b> {record.period?.slice(0,7)}</p><p><b>Supervisor / Auditor:</b> {record.auditor_name}</p><p><b>Turno / Equipe:</b> {record.shift_team||'—'}</p><p><b>Qtd. Auditorias:</b> {summary.count||0}</p></div>
  <h3>1. Indicadores consolidados do operador</h3><div className="qm-paper-results"><div><small>MÉDIA GERAL</small><strong>{number(summary.average)} / 100</strong></div><div><small>DURAÇÃO MÉDIA (TMA)</small><strong>{duration(summary.tmaSeconds)}</strong></div><div><small>CLASSIFICAÇÃO</small><strong>{classification(summary.average)}</strong></div></div>
  <p className="qm-paper-emphasis">Ocorrências de tolerância zero: {summary.criticalCount?summary.criticalCount+' auditoria(s)':'Nenhuma registrada no período'}</p>
  <h3>2. Mapeamento técnico por bloco de avaliação</h3>
  <div className="qm-paper-blocks">{QUALITY_BLOCKS.map((b,i)=><p key={b.id}><b>Bloco {i+1} — {b.name} ({b.max} pts):</b> {b.items.map(x=>x.label).join('; ')}.</p>)}</div>
  <h3>3. Histórico das auditorias realizadas no período</h3>
  <table className="qm-print-table"><thead><tr><th>Data</th><th>Protocolo CAD</th><th>Duração</th><th>Nota final</th><th>Principal ponto observado</th></tr></thead><tbody>{history.map(a=><tr key={a.id}><td>{printDate(a.audit_day)}</td><td>{a.protocol_cad}</td><td>{duration(a.duration_seconds)}</td><td>{a.score}/100</td><td>{a.improvements||'—'}</td></tr>)}</tbody></table>
  <h3>4. Feedback, plano de ação (PDCA) e providência gerencial</h3>
  <div className="qm-paper-notes"><p><b>Pontos fortes (reforço positivo):</b> {record.strengths||'—'}</p><p><b>Não conformidades recorrentes:</b> {record.recurring_gaps||'—'}</p><p><b>Ação corretiva acordada:</b> {record.corrective_action||'—'}</p><p><b>Providência gerencial:</b> {management(record.management_action)}</p></div>
  <div className="qm-paper-signatures"><SignatureLine name={record.auditor_signature} date={record.published_at} label="Supervisor / Auditor de Qualidade"/><SignatureLine name={record.operator_signature_name} image={record.operator_signature_image} date={record.acknowledged_at} label="Ciência do operador avaliado"/></div>
  <p className="qm-print-foot">Ciência eletrônica autenticada do recebimento. Não constitui concordância obrigatória nem certificado digital qualificado.</p>
 </section>;
}
export default function Quality({user}){
 const [month,setMonth]=useState(monthNow()),[view,setView]=useState('overview'),[board,setBoard]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [monitor,setMonitor]=useState(newMonitor()),[followup,setFollowup]=useState(newFollowup(month)),[selected,setSelected]=useState(null),[ack,setAck]=useState(null);
 const [signName,setSignName]=useState(''),[signAgreed,setSignAgreed]=useState(false),[signImage,setSignImage]=useState(''),[signClear,setSignClear]=useState(0);
 const [printDoc,setPrintDoc]=useState(null),[printReady,setPrintReady]=useState(false);
 const canAudit=board?.canAudit||false;
 const load=useCallback(async()=>{
  setError('');const value=await api('?month='+encodeURIComponent(month));setBoard(value);return value;
 },[month]);
 useEffect(()=>{let active=true;api('?month='+encodeURIComponent(month)).then(x=>{if(active){setBoard(x);setError('');}}).catch(e=>{if(active){setError(e.message);setBoard(null);}});return()=>{active=false;};},[month]);
 useEffect(()=>{if(printReady&&printDoc){window.requestAnimationFrame(()=>window.print());setPrintReady(false);}},[printReady,printDoc]);
 const monitors=board?.monitors||[],followups=board?.followups||[],operators=board?.operators||[];
 const mine=monitors.filter(m=>m.operator_id===user.id&&m.status==='published');
 const pending=[...monitors.map(m=>({...m,kind:'monitor'})),...followups.map(f=>({...f,kind:'followup'}))].filter(x=>x.operator_id===user.id&&x.status==='published'&&!x.acknowledged_at);
 const monitorById=id=>monitors.find(x=>x.id===id);
 const followById=id=>followups.find(x=>x.id===id);
 const preview=useMemo(()=>{try{return qualityScore(monitor.ratings,monitor.critical,{complete:false});}catch{return null;}},[monitor.ratings,monitor.critical]);
 const selectedPublished=selected?.kind==='monitor'?monitorById(selected.id):selected?.kind==='followup'?followById(selected.id):null;
 function startMonitor(){const id=operators[0]?.id||'';setMonitor(newMonitor(id));setView('monitor');setSelected(null);setError('');setNotice('');}
 function startFollowup(){const id=operators[0]?.id||'';setFollowup(newFollowup(month,id));setView('followup');setSelected(null);setError('');setNotice('');}
 function editMonitor(m){setMonitor({id:m.id,operatorId:m.operator_id,protocolCad:m.protocol_cad,auditDay:m.audit_day?.slice(0,10),durationSeconds:m.duration_seconds,auditType:m.audit_type,shiftPeriod:m.shift_period,ratings:m.ratings||{},critical:m.critical||[],strengths:m.strengths,improvements:m.improvements,correctiveAction:m.corrective_action,managementAction:m.management_action||'',auditorName:'',auditorAgreed:false});setView('monitor');setError('');setNotice('');}
 function editFollow(f){setFollowup({operatorId:f.operator_id,month:f.period?.slice(0,7),shiftTeam:f.shift_team,strengths:f.strengths,recurringGaps:f.recurring_gaps,correctiveAction:f.corrective_action,managementAction:f.management_action||'',auditorName:'',auditorAgreed:false});setView('followup');setError('');setNotice('');}
 function openItem(kind,id){setSelected({kind,id});setView('detail');setError('');setNotice('');}
 function printItem(kind,item){setPrintDoc({kind,item});setPrintReady(true);}
 async function sendMonitor(publish){
  setBusy(true);setError('');setNotice('');
  try{const data=await api('/monitor',{method:'POST',body:JSON.stringify({...monitor,publish})});await load();setNotice(data.message);if(publish){setView('overview');setSelected(null);}else setMonitor(v=>({...v,id:data.record.id}));}catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function sendFollowup(publish){
  setBusy(true);setError('');setNotice('');
  try{const data=await api('/followup',{method:'POST',body:JSON.stringify({...followup,publish})});await load();setNotice(data.message);if(publish){setView('overview');setSelected(null);}}catch(e){setError(e.message);}finally{setBusy(false);}
 }
 function showAck(kind,item){setAck({kind,id:item.id,title:kind==='monitor'?'Monitoria do protocolo '+item.protocol_cad:'Acompanhamento de '+longMonth(item.period.slice(0,7))});setSignName('');setSignAgreed(false);setSignImage('');setSignClear(v=>v+1);setError('');}
 async function acknowledge(){
  if(!ack)return;
  setBusy(true);setError('');setNotice('');
  try{
   const result=await api('/ack',{method:'POST',body:JSON.stringify({kind:ack.kind,id:ack.id,signature:{name:signName,agreed:signAgreed,image:signImage}})});
   await load();setAck(null);setNotice(result.message);
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 function loadSelectedFollowup(id){const f=followups.find(x=>x.operator_id===id&&x.period?.startsWith(month));if(f?.status==='draft')editFollow(f);else setFollowup(newFollowup(month,id));}
 return <div className="qm-app">
  <section className="qm-hero"><div><span className="qm-overline">CENTRO DE INTELIGÊNCIA JURÍDICA 190 · GESTÃO DA QUALIDADE</span><h1>Qualidade de atendimento</h1><p>Monitorias, avaliação operacional, evolução de desempenho e ciência eletrônica. Critérios das fichas de qualidade COPOM / CIOSP.</p></div><div className="qm-hero-mark">190<span>QUALIDADE</span></div></section>
  <div className="qm-toolbar"><div className="qm-tabs">
   <button type="button" aria-pressed={view==='overview'} onClick={()=>setView('overview')}>Visão geral</button>
   <button type="button" aria-pressed={view==='mine'} onClick={()=>setView('mine')}>Minhas avaliações {pending.length>0&&<b>{pending.length}</b>}</button>
   {canAudit&&<button type="button" aria-pressed={view==='monitor'} onClick={startMonitor}>Nova monitoria</button>}
   {canAudit&&<button type="button" aria-pressed={view==='followup'} onClick={startFollowup}>Acompanhamento mensal</button>}
  </div><label className="qm-month">Período <input type="month" value={month} onChange={e=>{setMonth(e.target.value);setView('overview');}} min="2020-01" max="2100-12"/></label></div>
  {error&&<div className="qm-alert error" role="alert">{error}</div>}
  {notice&&<div className="qm-alert ok" role="status">{notice}</div>}
  {!board&&<div className="qm-empty">Não foi possível carregar a área de qualidade. <button type="button" onClick={()=>load().catch(e=>setError(e.message))}>Tentar novamente</button></div>}
  {board&&<>
   {view==='overview'&&<>
    <div className="qm-stats"><div><small>Monitorias publicadas no período</small><strong>{board.overview.published}</strong><span>Registros acessíveis à sua conta</span></div><div><small>Média das avaliações</small><strong>{number(board.overview.average)}<i> / 100</i></strong><span>{classification(board.overview.average)}</span></div><div><small>Minha ciência pendente</small><strong>{pending.length}</strong><span>Notas entregues e ainda não assinadas</span></div><div><small>Documentos assinados</small><strong>{monitors.filter(x=>x.acknowledged_at).length+followups.filter(x=>x.acknowledged_at).length}</strong><span>Ciência registrada no servidor</span></div></div>
    {pending.length>0&&<div className="qm-notification"><div><b>Você tem {pending.length} documento(s) para tomar ciência.</b><p>Confira a nota e o conteúdo antes de assinar. Sua assinatura não representa concordância obrigatória.</p></div><button type="button" onClick={()=>setView('mine')}>Ver documentos</button></div>}
    <section className="qm-panel"><div className="qm-panel-heading"><div><span className="qm-overline">AVALIAÇÕES</span><h2>Monitorias de {longMonth(month)}</h2><p>Notas, observações e andamento da ciência.</p></div>{canAudit&&<button className="qm-primary" type="button" onClick={startMonitor}>+ Nova monitoria</button>}</div>
     {monitors.length?<div className="qm-records">{monitors.map(x=><button type="button" className="qm-record" key={x.id} onClick={()=>openItem('monitor',x.id)}><div className="qm-record-icon">◎</div><div className="qm-record-main"><strong>{x.operator_name}</strong><small>CAD {x.protocol_cad||'Sem protocolo'} · {printDate(x.audit_day)} · Avaliador: {x.auditor_name}</small></div><ScoreTag score={x.score} critical={x.critical}/><span className={'qm-status '+x.status}>{x.status==='draft'?'Rascunho':x.acknowledged_at?'Ciência registrada':'Aguardando ciência'}</span><span>›</span></button>)}</div>:<p className="qm-empty">Nenhuma monitoria disponível neste mês. {canAudit?'Crie a primeira avaliação para iniciar a qualidade.':'Suas avaliações publicadas aparecerão aqui.'}</p>}
    </section>
    <section className="qm-panel"><div className="qm-panel-heading"><div><span className="qm-overline">EVOLUÇÃO MENSAL</span><h2>Fichas de acompanhamento individual</h2><p>Média proporcional, TMA, histórico e plano PDCA.</p></div>{canAudit&&<button className="qm-secondary" type="button" onClick={startFollowup}>Preparar acompanhamento</button>}</div>
     {followups.length?<div className="qm-records">{followups.map(x=><button type="button" className="qm-record" key={x.id} onClick={()=>openItem('followup',x.id)}><div className="qm-record-icon">▤</div><div className="qm-record-main"><strong>{x.operator_name}</strong><small>{longMonth(month)} · Responsável: {x.auditor_name}</small></div><ScoreTag score={x.snapshot?.summary?.average}/><span className={'qm-status '+x.status}>{x.status==='draft'?'Rascunho':x.acknowledged_at?'Ciência registrada':'Aguardando ciência'}</span><span>›</span></button>)}</div>:<p className="qm-empty">Nenhum acompanhamento mensal disponível.</p>}
    </section>
   </>}
   {view==='mine'&&<section className="qm-panel"><div className="qm-panel-heading"><div><span className="qm-overline">RECEBIMENTO DE NOTAS</span><h2>Minhas avaliações</h2><p>Confira os registros publicados para sua conta e assine a ciência individualmente.</p></div></div>
    {[...mine.map(x=>({...x,kind:'monitor'})),...followups.filter(x=>x.operator_id===user.id&&x.status==='published').map(x=>({...x,kind:'followup'}))].length?
     <div className="qm-records">{[...mine.map(x=>({...x,kind:'monitor'})),...followups.filter(x=>x.operator_id===user.id&&x.status==='published').map(x=>({...x,kind:'followup'}))].map(x=><button className="qm-record" key={x.kind+x.id} type="button" onClick={()=>openItem(x.kind,x.id)}><div className="qm-record-icon">{x.kind==='monitor'?'◎':'▤'}</div><div className="qm-record-main"><strong>{x.kind==='monitor'?'Monitoria CAD '+x.protocol_cad:'Acompanhamento '+longMonth(x.period.slice(0,7))}</strong><small>Publicado em {printDate(x.published_at)} · {x.auditor_name}</small></div><ScoreTag score={x.kind==='monitor'?x.score:x.snapshot?.summary?.average}/><span className={'qm-status '+(x.acknowledged_at?'published':'draft')}>{x.acknowledged_at?'Assinado':'Pendente de ciência'}</span></button>)}</div>:
     <div className="qm-empty">Você ainda não recebeu avaliações publicadas neste período.</div>}
   </section>}
   {view==='monitor'&&canAudit&&<section className="qm-panel qm-form">
    <div className="qm-panel-heading"><div><span className="qm-overline">FICHA 01 · MONITORIA</span><h2>{monitor.id?'Editar monitoria em rascunho':'Nova monitoria de atendimento'}</h2><p>Marque Sim, Não ou N/A em cada critério. A pontuação é calculada automaticamente.</p></div><button className="qm-secondary" type="button" onClick={()=>setView('overview')}>Voltar</button></div>
    <div className="qm-field-grid">
     <label>Operador avaliado<select disabled={!!monitor.id} value={monitor.operatorId} onChange={e=>setMonitor(v=>({...v,operatorId:e.target.value}))}><option value="">Selecione o operador</option>{operators.map(x=><option key={x.id} value={x.id}>{x.display_name} · {x.username}</option>)}</select></label>
     <label>Protocolo / Nº CAD<input value={monitor.protocolCad} maxLength={90} onChange={e=>setMonitor(v=>({...v,protocolCad:e.target.value}))} placeholder="Identificador do atendimento"/></label>
     <label>Data da monitoria<input type="date" value={monitor.auditDay} onChange={e=>setMonitor(v=>({...v,auditDay:e.target.value}))}/></label>
     <label>Duração (segundos)<input type="number" min={0} max={72000} value={monitor.durationSeconds} onChange={e=>setMonitor(v=>({...v,durationSeconds:Number(e.target.value)||0}))}/><small>{duration(monitor.durationSeconds)}</small></label>
     <label>Tipo de auditoria<select value={monitor.auditType} onChange={e=>setMonitor(v=>({...v,auditType:e.target.value}))}><option value="audio">Áudio retrospectivo</option><option value="live">Tempo real (escuta ativa)</option></select></label>
     <label>Turno / período<select value={monitor.shiftPeriod} onChange={e=>setMonitor(v=>({...v,shiftPeriod:e.target.value}))}><option value="weekday">Dia útil</option><option value="weekend">Final de semana / pico</option></select></label>
    </div>
    <div className="qm-score-preview"><span>NOTA PRELIMINAR</span><strong>{preview?.score==null?'—':preview.score}<small> / 100</small></strong><div><b>{preview?.critical?'Tolerância zero: nota geral 0':classification(preview?.score)}</b><small>{preview?.available||0} de {QUALITY_MAX} pontos aplicáveis</small></div></div>
    {QUALITY_BLOCKS.map((b,i)=><section className="qm-criteria" key={b.id}><div className="qm-criteria-title"><span>{pad(i+1)}</span><h3>{b.name}</h3><strong>{b.max} PTS</strong></div>{b.items.map(item=><div className="qm-criterion" key={item.id}><div><strong>{item.id} · {item.label}</strong><p>{item.description}</p></div><span className="qm-criterion-points">{item.points} pts</span><div className="qm-choice" role="group" aria-label={item.label}>{[['yes','Sim'],['no','Não'],['na','N/A']].map(([v,label])=><button type="button" key={v} aria-pressed={monitor.ratings[item.id]===v} onClick={()=>setMonitor(d=>({...d,ratings:{...d.ratings,[item.id]:v}}))}>{label}</button>)}</div></div>)}</section>)}
    <section className="qm-critical-panel"><span className="qm-overline">ATENÇÃO · TOLERÂNCIA ZERO</span><h3>Penalidades críticas</h3><p>Qualquer ocorrência marcada zera a nota geral e exige feedback imediato, conforme a ficha original.</p><div className="qm-critical-grid">{QUALITY_CRITICAL.map(c=><label key={c.id}><input type="checkbox" checked={monitor.critical.includes(c.id)} onChange={e=>setMonitor(d=>({...d,critical:e.target.checked?[...d.critical,c.id]:d.critical.filter(x=>x!==c.id)}))}/><span><b>{c.label}</b><small>{c.description}</small></span></label>)}</div></section>
    <div className="qm-field-grid qm-text-grid">
     <label>Pontos fortes / reforço positivo<textarea rows={3} value={monitor.strengths} onChange={e=>setMonitor(v=>({...v,strengths:e.target.value}))} placeholder="O que o operador executou bem"/></label>
     <label>Não conformidades e pontos de melhoria<textarea rows={3} value={monitor.improvements} onChange={e=>setMonitor(v=>({...v,improvements:e.target.value}))} placeholder="Pontos observados, sem incluir dados sigilosos do atendimento"/></label>
     <label>Ação corretiva acordada (PDCA)<textarea rows={3} value={monitor.correctiveAction} onChange={e=>setMonitor(v=>({...v,correctiveAction:e.target.value}))} placeholder="Medida, responsável e forma de acompanhamento"/></label>
     <label>Providência gerencial<select value={monitor.managementAction} onChange={e=>setMonitor(v=>({...v,managementAction:e.target.value}))}><option value="">Selecione</option>{QUALITY_MANAGEMENT.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
    </div>
    <div className="qm-publish-box"><h3>Validação do supervisor / auditor</h3><p>Ao publicar, a nota e as observações são fechadas para edição e disponibilizadas ao operador para ciência.</p><label>Nome do auditor (igual ao cadastro)<input value={monitor.auditorName} onChange={e=>setMonitor(v=>({...v,auditorName:e.target.value}))} placeholder={user.name}/></label><label className="qm-check"><input type="checkbox" checked={monitor.auditorAgreed} onChange={e=>setMonitor(v=>({...v,auditorAgreed:e.target.checked}))}/>Confirmo que realizei esta avaliação e assumo responsabilidade pelo lançamento.</label></div>
    <div className="qm-form-actions"><button type="button" disabled={busy} className="qm-secondary" onClick={()=>sendMonitor(false)}>{busy?'Salvando…':'Salvar rascunho'}</button><button type="button" disabled={busy} className="qm-primary" onClick={()=>sendMonitor(true)}>{busy?'Publicando…':'Publicar nota para ciência'}</button></div>
   </section>}
   {view==='followup'&&canAudit&&<section className="qm-panel qm-form">
    <div className="qm-panel-heading"><div><span className="qm-overline">FICHA 02 · ACOMPANHAMENTO</span><h2>Acompanhamento individual mensal</h2><p>Os indicadores são consolidados automaticamente pelas monitorias publicadas.</p></div><button className="qm-secondary" type="button" onClick={()=>setView('overview')}>Voltar</button></div>
    <div className="qm-field-grid"><label>Operador avaliado<select value={followup.operatorId} onChange={e=>loadSelectedFollowup(e.target.value)}><option value="">Selecione o operador</option>{operators.map(x=><option key={x.id} value={x.id}>{x.display_name} · {x.username}</option>)}</select></label><label>Mês do acompanhamento<input type="month" value={month} disabled/></label><label>Turno / equipe<input value={followup.shiftTeam} onChange={e=>setFollowup(v=>({...v,shiftTeam:e.target.value}))} placeholder="Ex.: equipe noturna"/></label></div>
    {followup.operatorId&&<><div className="qm-stats"><div><small>Monitorias</small><strong>{getAvg(monitors,followup.operatorId).count}</strong></div><div><small>Média de notas</small><strong>{number(getAvg(monitors,followup.operatorId).average)}</strong></div><div><small>TMA</small><strong>{duration(getAvg(monitors,followup.operatorId).tmaSeconds)}</strong></div><div><small>Tolerância zero</small><strong>{getAvg(monitors,followup.operatorId).criticalCount}</strong></div></div>
    <div className="qm-field-grid qm-text-grid"><label>Pontos fortes / reforço positivo<textarea rows={4} value={followup.strengths} onChange={e=>setFollowup(v=>({...v,strengths:e.target.value}))}/></label><label>Não conformidades recorrentes<textarea rows={4} value={followup.recurringGaps} onChange={e=>setFollowup(v=>({...v,recurringGaps:e.target.value}))}/></label><label>Ação corretiva acordada (PDCA)<textarea rows={4} value={followup.correctiveAction} onChange={e=>setFollowup(v=>({...v,correctiveAction:e.target.value}))}/></label><label>Providência gerencial<select value={followup.managementAction} onChange={e=>setFollowup(v=>({...v,managementAction:e.target.value}))}><option value="">Selecione</option>{QUALITY_MANAGEMENT.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label></div>
    <div className="qm-publish-box"><h3>Assinatura do auditor</h3><label>Nome igual ao cadastro<input value={followup.auditorName} onChange={e=>setFollowup(v=>({...v,auditorName:e.target.value}))} placeholder={user.name}/></label><label className="qm-check"><input type="checkbox" checked={followup.auditorAgreed} onChange={e=>setFollowup(v=>({...v,auditorAgreed:e.target.checked}))}/>Confirmo os dados consolidados e as providências registradas.</label></div>
    <div className="qm-form-actions"><button type="button" className="qm-secondary" disabled={busy} onClick={()=>sendFollowup(false)}>Salvar rascunho</button><button type="button" className="qm-primary" disabled={busy} onClick={()=>sendFollowup(true)}>Publicar acompanhamento</button></div></>}
   </section>}
   {view==='detail'&&selectedPublished&&<section className="qm-panel qm-detail"><div className="qm-panel-heading"><div><span className="qm-overline">{selected.kind==='monitor'?'FICHA DE MONITORIA':'ACOMPANHAMENTO INDIVIDUAL'}</span><h2>{selectedPublished.operator_name}</h2><p>Avaliador: {selectedPublished.auditor_name} · Publicação: {printDate(selectedPublished.published_at)}</p></div><button className="qm-secondary" type="button" onClick={()=>setView('overview')}>Voltar</button></div>
    {selected.kind==='monitor'?<><div className="qm-detail-score"><ScoreTag score={selectedPublished.score} critical={selectedPublished.critical}/><span>{classification(selectedPublished.score)}</span><small>Protocolo CAD {selectedPublished.protocol_cad} · {printDate(selectedPublished.audit_day)} · {duration(selectedPublished.duration_seconds)}</small></div><div className="qm-detail-blocks">{QUALITY_BLOCKS.map(b=><div key={b.id}><strong>{b.name} · {b.max} pts</strong><ul>{b.items.map(i=><li key={i.id}><span>{i.id} {i.label}</span><b>{selectedPublished.ratings?.[i.id]==='yes'?'Sim':selectedPublished.ratings?.[i.id]==='no'?'Não':'N/A'}</b></li>)}</ul></div>)}</div></>:<><div className="qm-detail-score"><ScoreTag score={selectedPublished.snapshot?.summary?.average}/><span>{classification(selectedPublished.snapshot?.summary?.average)}</span><small>{selectedPublished.snapshot?.summary?.count||0} monitorias · TMA {duration(selectedPublished.snapshot?.summary?.tmaSeconds)}</small></div><div className="qm-records">{(selectedPublished.snapshot?.history||[]).map(x=><div className="qm-record" key={x.id}><div className="qm-record-main"><strong>CAD {x.protocol_cad}</strong><small>{printDate(x.audit_day)} · {duration(x.duration_seconds)}</small></div><ScoreTag score={x.score}/></div>)}</div></>}
    <div className="qm-detail-notes"><div><b>Pontos fortes</b><p>{selectedPublished.strengths||'—'}</p></div><div><b>{selected.kind==='monitor'?'Pontos de melhoria':'Não conformidades recorrentes'}</b><p>{selected.kind==='monitor'?selectedPublished.improvements:selectedPublished.recurring_gaps}</p></div><div><b>Ação corretiva acordada</b><p>{selectedPublished.corrective_action||'—'}</p></div><div><b>Providência gerencial</b><p>{management(selectedPublished.management_action)}</p></div></div>
    <div className="qm-ack-status">{selectedPublished.acknowledged_at?<><b>Ciência registrada em {printDate(selectedPublished.acknowledged_at)}</b><p>Operador: {selectedPublished.operator_signature_name}</p></>:<><b>Ciência ainda não registrada</b><p>O operador deverá confirmar o recebimento da nota pelo próprio acesso autenticado.</p></>}</div>
    <div className="qm-form-actions">
     {selectedPublished.status==='draft'&&canAudit&&selectedPublished.auditor_id===user.id&&<button type="button" className="qm-primary" onClick={()=>selected.kind==='monitor'?editMonitor(selectedPublished):editFollow(selectedPublished)}>Editar rascunho</button>}
     {selectedPublished.status==='published'&&<button type="button" className="qm-secondary" onClick={()=>printItem(selected.kind,selectedPublished)}>Imprimir / salvar PDF</button>}
     {selectedPublished.status==='published'&&selectedPublished.operator_id===user.id&&!selectedPublished.acknowledged_at&&<button type="button" className="qm-primary" onClick={()=>showAck(selected.kind,selectedPublished)}>Registrar minha ciência</button>}
    </div>
   </section>}
   {view==='detail'&&!selectedPublished&&<div className="qm-empty">Documento não disponível neste período. <button type="button" onClick={()=>setView('overview')}>Voltar</button></div>}
  </>}
  {ack&&<div className="qm-modal-backdrop" role="presentation"><div className="qm-sign-modal" role="dialog" aria-modal="true" aria-labelledby="qm-ack-title">
   <div className="qm-panel-heading"><div><span className="qm-overline">ASSINATURA DO OPERADOR</span><h2 id="qm-ack-title">Registrar ciência da nota</h2><p>{ack.title}</p></div><button className="qm-secondary" type="button" onClick={()=>setAck(null)} disabled={busy}>Fechar</button></div>
   <div className="qm-ack-message">{QUALITY_ACKNOWLEDGE}</div>
   <label>Digite seu nome completo exatamente como consta no cadastro<input autoComplete="name" value={signName} onChange={e=>setSignName(e.target.value)} placeholder={user.name}/></label>
   <div className="qm-sign-pad"><div><strong>Assinatura desenhada (opcional)</strong><button type="button" onClick={()=>setSignClear(v=>v+1)}>Limpar desenho</button></div><SignCanvas onData={setSignImage} clearToken={signClear}/><small>Você pode assinar com o mouse, dedo ou caneta. Se não desenhar, seu nome digitado ficará registrado como ciência eletrônica.</small></div>
   <label className="qm-check"><input type="checkbox" checked={signAgreed} onChange={e=>setSignAgreed(e.target.checked)}/>Li a avaliação e confirmo o recebimento, sem obrigação de concordar com a nota.</label>
   <button type="button" className="qm-primary qm-full" disabled={busy||!signAgreed||!signName.trim()} onClick={acknowledge}>{busy?'Registrando…':'Assinar ciência e registrar recebimento'}</button>
   <p className="qm-modal-foot">A ciência é vinculada exclusivamente à sua conta autenticada e carimbada com data/hora do servidor. Não equivale a assinatura digital qualificada ICP-Brasil.</p>
  </div></div>}
  {printDoc&&<div className="qm-print">{printDoc.kind==='monitor'?<MonitorPrint record={printDoc.item}/>:<FollowupPrint record={printDoc.item}/>}</div>}
 </div>;
}
