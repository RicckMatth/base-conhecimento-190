'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import FloorSchedule from './floor-schedule.jsx';

const DESKS=Array.from({length:32},(_,i)=>i+1);
const CELL_OPTIONS=[
  ['Uso na bancada','Uso de celular na bancada de atendimento'],
  ['Durante atendimento','Uso de celular durante atendimento ativo'],
  ['Possível risco de informação','Possível captura de informações da operação']
];
const TECH_OPTIONS=[
  ['Hardware & Periféricos',['Headset sem áudio ou microfone','Mouse ou teclado não responde','Monitor sem vídeo','Conector com mau contato']],
  ['Sistema & Lentidão',['Sistema de atendimento travou','Computador muito lento','Bloqueio de login','Reinicialização inesperada']],
  ['Rede & VoIP',['Conexão ou VPN indisponível','Ramal VoIP não registra','Sem acesso à rede','Quedas em ligação']],
  ['Energia & Elétrica',['Computador não liga','Tomada sem energia','Cabo de energia com mau contato','No-break em alerta']]
];
const formatDesk=n=>'PA-'+String(n).padStart(2,'0');
const formatDate=value=>new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
const safeCsv=v=>{
  let value=String(v??'').replace(/\r?\n/g,' ');
  if(/^[\s]*[=+\-@]/.test(value))value="'"+value;
  return '"'+value.replace(/"/g,'""')+'"';
};

async function request(path,options={}){
  const response=await fetch('/api/floor'+path,{credentials:'same-origin',cache:'no-store',...options,
    headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});
  let result={};try{result=await response.json();}catch{}
  if(!response.ok)throw new Error(result.error||'Não foi possível comunicar com o servidor.');
  return result;
}
function DeskPicker({value,onChange}){
  return <div className="fc-picker">
    <label>Posição de atendimento (PA) <span aria-hidden="true">*</span></label>
    <input aria-label="Número da posição de atendimento" type="number" min="1" max="999" required value={value} onChange={e=>onChange(e.target.value)} placeholder="Ex.: 14"/>
    <small>Selecione uma posição no mapa ou digite uma PA de 1 a 999.</small>
  </div>;
}
function Status({value}){
  const status=value==='Resolvido'?'resolved':value==='Em atendimento'?'working':'pending';
  return <span className={'fc-status '+status}>{value}</span>;
}
export default function FloorControl({isAdmin=false}){
  const [tab,setTab]=useState('reports');
  const [cell,setCell]=useState({desk:'',category:CELL_OPTIONS[0][1],description:''});
  const [tech,setTech]=useState({desk:'',category:TECH_OPTIONS[0][0],urgency:'Moderado',description:'',asset:''});
  const [events,setEvents]=useState([]);
  const [summary,setSummary]=useState({celular:0,computador:0,open:0});
  const [selectedDesk,setSelectedDesk]=useState(14);
  const [filter,setFilter]=useState('all');
  const [busy,setBusy]=useState(false);
  const [updating,setUpdating]=useState('');
  const [feedback,setFeedback]=useState(null);
  const [lastUpdate,setLastUpdate]=useState(null);

  const refresh=useCallback(async()=>{
    if(!isAdmin)return;
    try{const data=await request('/events');setEvents(data.events||[]);
      setSummary(data.summary||{celular:0,computador:0,open:0});setLastUpdate(new Date());}
    catch(error){setFeedback({type:'error',text:error.message});}
  },[isAdmin]);
  useEffect(()=>{
    if(!isAdmin)return;
    refresh();const id=setInterval(refresh,20000);
    return()=>clearInterval(id);
  },[isAdmin,refresh]);

  const filtered=useMemo(()=>events.filter(e=>(filter==='all'||e.kind===filter)),[events,filter]);
  const selectedEvents=useMemo(()=>events.filter(e=>Number(e.desk)===selectedDesk&&e.status!=='Resolvido'),[events,selectedDesk]);
  const chooseDesk=number=>{setSelectedDesk(number);setCell(p=>({...p,desk:String(number)}));setTech(p=>({...p,desk:String(number)}));};
  const statusFor=number=>{
    const active=events.filter(e=>Number(e.desk)===number&&e.status!=='Resolvido');
    return active.some(e=>e.kind==='celular')?'cell':active.some(e=>e.kind==='computador')?'pc':'clear';
  };
  async function submit(event,kind){
    event.preventDefault();if(busy)return;
    setBusy(true);setFeedback(null);
    const data=kind==='celular'?cell:tech;
    try{
      const result=await request('/events',{method:'POST',body:JSON.stringify({kind,...data,desk:Number(data.desk)})});
      setFeedback({type:'ok',text:'Registro '+result.protocol+' criado no servidor. A equipe responsável deverá consultar o painel de gestão para tratá-lo.'});
      if(kind==='celular')setCell({...cell,description:''});
      else setTech({...tech,description:'',asset:''});
      await refresh();
    }catch(error){setFeedback({type:'error',text:error.message});}
    finally{setBusy(false);}
  }
  async function updateStatus(id,status){
    setUpdating(id);setFeedback(null);
    try{await request('/events',{method:'PATCH',body:JSON.stringify({id,status})});await refresh();}
    catch(error){setFeedback({type:'error',text:error.message});}
    finally{setUpdating('');}
  }
  function exportCsv(){
    const cols=['Protocolo','Tipo','Mesa','Categoria','Impacto','Status','Descrição','Patrimônio','Data'];
    const rows=filtered.map(e=>[e.protocol,e.kind,formatDesk(e.desk),e.category,e.urgency||'',e.status,e.description,e.asset||'',formatDate(e.created_at)]);
    const csv='\uFEFF'+[cols,...rows].map(row=>row.map(safeCsv).join(';')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='relatorio-gestao-piso.csv';a.click();URL.revokeObjectURL(url);
  }

  return <section className="fc-wrap">
    <header className="fc-hero">
      <div><span className="fc-eyebrow">Indra | Minsait · Módulo integrado à Base 190</span>
        <h1>Gestão inteligente de piso</h1>
        <p>Comunicações de conformidade e suporte técnico para posições de atendimento, em um fluxo centralizado.</p>
        <span className="fc-pilot">Ambiente piloto · uso real sujeito à autorização institucional</span>
      </div>
      <div className="fc-hero-mark" aria-hidden="true">PA<span>32</span></div>
    </header>
    <div className="fc-tabs" role="tablist" aria-label="Seções do painel operacional">
      <button role="tab" aria-selected={tab==='reports'} className={tab==='reports'?'active':''} onClick={()=>setTab('reports')}>Central de reportes</button>
      <button role="tab" aria-selected={tab==='map'} className={tab==='map'?'active':''} onClick={()=>setTab('map')}>Mapa de PAs</button>
      <button role="tab" aria-selected={tab==='schedules'} className={tab==='schedules'?'active':''} onClick={()=>setTab('schedules')}>◷ Escalas e pausas <span className="fc-tab-new">NOVO</span></button>
      {isAdmin&&<button role="tab" aria-selected={tab==='events'} className={tab==='events'?'active':''} onClick={()=>setTab('events')}>Gestão de eventos {summary.open>0?'('+summary.open+')':''}</button>}
    </div>
    {feedback&&<div role={feedback.type==='error'?'alert':'status'} className={'fc-feedback '+feedback.type}>{feedback.text}<button type="button" onClick={()=>setFeedback(null)} aria-label="Fechar aviso">×</button></div>}
    {isAdmin&&<div className="fc-stats">
      <div className="fc-stat"><span>Reportes de conformidade abertos</span><strong className="rose">{summary.celular}</strong><small>Aguardando verificação</small></div>
      <div className="fc-stat"><span>Chamados de TI abertos</span><strong className="sky">{summary.computador}</strong><small>Inclui em atendimento</small></div>
      <div className="fc-stat"><span>Eventos em aberto</span><strong>{summary.open}</strong><small>Atualiza automaticamente a cada 20s</small></div>
    </div>}
    {tab==='schedules'&&<FloorSchedule/>}
    {tab==='reports'&&<>
      <div className="fc-forms">
        <article className="fc-panel">
          <div className="fc-panel-head cell"><span className="fc-symbol">◈</span><div><small>COMPLIANCE OPERACIONAL</small><h2>Reportar uso de celular</h2><p>Registre apenas fatos observados, sem nomes ou julgamentos.</p></div></div>
          <form className="fc-form" onSubmit={e=>submit(e,'celular')}>
            <DeskPicker value={cell.desk} onChange={desk=>setCell({...cell,desk})}/>
            <div><label htmlFor="fc-cell-category">Situação observada</label>
              <div className="fc-choice-list">{CELL_OPTIONS.map(([title,option])=><label className="fc-choice" key={option}><input type="radio" name="fc-cell-reason" checked={cell.category===option} onChange={()=>setCell({...cell,category:option})}/><span>{title}</span></label>)}</div>
            </div>
            <div><label htmlFor="fc-cell-notes">Informações objetivas (opcional)</label><textarea id="fc-cell-notes" rows={3} maxLength={600} value={cell.description} onChange={e=>setCell({...cell,description:e.target.value})} placeholder="Ex.: aparelho apoiado ao lado do teclado."/></div>
            <button className="fc-action cell" type="submit" disabled={busy}>{busy?'Registrando…':'Registrar reporte para avaliação'}</button>
            <p className="fc-disclaimer">O reporte não comprova infração. A identidade do solicitante não é gravada no registro, mas não há garantia de anonimato absoluto devido a possíveis logs de infraestrutura. A verificação compete à supervisão autorizada.</p>
          </form>
        </article>
        <article className="fc-panel">
          <div className="fc-panel-head pc"><span className="fc-symbol">▣</span><div><small>SERVICE DESK · SUPORTE DE PISO</small><h2>Problema no computador</h2><p>Abra um chamado técnico para a PA com falha.</p></div></div>
          <form className="fc-form" onSubmit={e=>submit(e,'computador')}>
            <div className="fc-two"><DeskPicker value={tech.desk} onChange={desk=>setTech({...tech,desk})}/>
              <div><label htmlFor="fc-asset">Patrimônio ou identificador (opcional)</label><input id="fc-asset" maxLength={100} value={tech.asset} onChange={e=>setTech({...tech,asset:e.target.value})} placeholder="Ex.: IND-PA-08"/></div></div>
            <div><label>Categoria da falha</label><div className="fc-categories">{TECH_OPTIONS.map(([name])=><button type="button" key={name} className={tech.category===name?'selected':''} onClick={()=>setTech({...tech,category:name,description:''})}>{name}</button>)}</div></div>
            <div><label>Impacto operacional</label><div className="fc-categories urgencies">{['Baixo','Moderado','Crítico (PA Parada)'].map(x=><button type="button" key={x} className={tech.urgency===x?'selected':''} onClick={()=>setTech({...tech,urgency:x})}>{x}</button>)}</div></div>
            <div><label>Sintoma / diagnóstico rápido</label><div className="fc-chips">{(TECH_OPTIONS.find(([key])=>key===tech.category)?.[1]||[]).map(x=><button type="button" key={x} onClick={()=>setTech({...tech,description:x})}>{x}</button>)}</div>
              <textarea aria-label="Descrição do problema técnico" required minLength={5} maxLength={600} rows={3} value={tech.description} onChange={e=>setTech({...tech,description:e.target.value})} placeholder="Descreva a falha, sem senhas ou informações pessoais."/></div>
            <button className="fc-action pc" type="submit" disabled={busy}>{busy?'Registrando…':'Abrir chamado técnico'}</button>
            <p className="fc-disclaimer">Chamados são armazenados no banco e disponibilizados à gestão autenticada. O painel não substitui o sistema oficial de TI nem envia notificações externas.</p>
          </form>
        </article>
      </div>
      <div className="fc-info"><b>Fluxo de operação</b><p>Escolha uma PA, selecione a categoria e envie. O servidor gera um protocolo persistente. Supervisores com perfil administrativo podem acompanhar e atualizar o estado do evento. Para uma equipe real, configure previamente a política de acesso e a retenção dos dados.</p></div>
    </>}
    {tab==='map'&&<>
      <div className="fc-map-header"><div><h2>Mapa visual das estações</h2><p>Mapa ilustrativo com 32 posições; a numeração digitada pode ir até PA-999.</p></div><div className="fc-legend"><span><i className="clear"/>Normal / sem estado exposto</span>{isAdmin&&<><span><i className="cell"/>Reporte pendente</span><span><i className="pc"/>Chamado TI</span></>}</div></div>
      <div className="fc-map-grid">{DESKS.map(n=><button key={n} type="button" onClick={()=>chooseDesk(n)}
        aria-pressed={selectedDesk===n} className={'fc-map-desk '+(isAdmin?statusFor(n):'clear')+(selectedDesk===n?' selected':'')}>
        <small>PA</small><strong>{String(n).padStart(2,'0')}</strong><span className="fc-map-dot"/></button>)}</div>
      <div className="fc-selected"><div><strong>{formatDesk(selectedDesk)} selecionada</strong>
        <p>{isAdmin?(selectedEvents.length?selectedEvents.length+' registro(s) ainda aberto(s) para esta PA.':'Nenhum registro aberto para esta PA.'):'Selecione uma PA para preencher os formulários de reporte.'}</p></div>
        <button type="button" onClick={()=>{chooseDesk(selectedDesk);setTab('reports');}}>Abrir formulário para esta PA</button></div>
    </>}
    {isAdmin&&tab==='events'&&<>
      <div className="fc-events-toolbar"><div><h2>Central de ocorrências</h2><p>Registros pendentes de verificação. Não representam comprovação de infração.</p>{lastUpdate&&<small>Última consulta: {lastUpdate.toLocaleTimeString('pt-BR')}</small>}</div>
        <div className="fc-toolbar-actions"><select aria-label="Filtrar eventos" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todos</option><option value="celular">Conformidade</option><option value="computador">Suporte TI</option></select>
          <button type="button" onClick={refresh}>Atualizar</button><button type="button" disabled={!filtered.length} onClick={exportCsv}>Exportar CSV</button></div>
      </div>
      <div className="fc-event-list">{filtered.length?filtered.map(e=><article className="fc-event" key={e.id}>
        <div className="fc-event-top"><span className="fc-event-pa">{formatDesk(e.desk)}</span><span className={'fc-kind '+(e.kind==='celular'?'cell':'pc')}>{e.kind==='celular'?'Conformidade':'Suporte TI'}</span><span className="fc-protocol">{e.protocol}</span><Status value={e.status}/></div>
        <h3>{e.category}</h3><p>{e.description||'Sem observações adicionais.'}</p>
        <div className="fc-event-bottom"><small>{formatDate(e.created_at)} · {e.urgency||'Em análise'}{e.asset?' · Patrimônio '+e.asset:''}</small>
          <div>{e.status==='Pendente'&&<button type="button" disabled={!!updating} onClick={()=>updateStatus(e.id,'Em atendimento')}>Iniciar atendimento</button>}
            {e.status!=='Resolvido'&&<button type="button" disabled={!!updating} onClick={()=>updateStatus(e.id,'Resolvido')}>Concluir após verificação</button>}</div></div>
      </article>):<div className="fc-empty">Nenhum registro encontrado para o filtro selecionado.</div>}</div>
      <p className="fc-disclaimer">Acesso exclusivo do administrador. Os registros contêm alegações ainda não verificadas e precisam de procedimento de tratamento definido pela instituição.</p>
    </>}
    <details className="fc-overview"><summary>Sobre o painel e sua integração</summary>
      <p>Este módulo reproduz a proposta do Portal Operacional Indra Minsait dentro do Centro de Inteligência Jurídica 190. O banco de dados é compartilhado com a Base 190, mas os eventos de piso ficam isolados da biblioteca jurídica, das regras de classificação e do Gemini. O mapa é ilustrativo e não indica a planta real nem o estado de ocupação das posições.</p>
    </details>
  </section>;
}
