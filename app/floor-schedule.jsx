'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';

const ROLE_LABEL={attendant:'Atendente',manager:'Gestor · Supervisor',coordinator:'Coordenador',dev:'Dev'};
const ROLE_MARK={attendant:'◉',manager:'◆',coordinator:'✦',dev:'⌘'};
const ROLE_ORDER=['attendant','manager','coordinator','dev'];
const WEEKDAYS=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
const OFF_DAYS=[['1','Segunda-feira'],['2','Terça-feira'],['3','Quarta-feira'],['4','Quinta-feira'],['5','Sexta-feira'],['6','Sábado'],['0','Domingo']];
const ROUND_OPTIONS=[['0','Livre · qualquer minuto'],['5','De 5 em 5 minutos'],['10','De 10 em 10 minutos'],['15','De 15 em 15 minutos'],['30','De 30 em 30 minutos']];
const PAD=n=>String(n).padStart(2,'0');
const LOCAL_DAY=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
const asUTC=value=>new Date(value+'T12:00:00Z');
const dayISO=date=>date.toISOString().slice(0,10);
const addDays=(day,delta)=>dayISO(new Date(asUTC(day).getTime()+delta*86400000));
const monday=day=>addDays(day,-((asUTC(day).getUTCDay()+6)%7));
const monthShift=(month,delta)=>{const [year,m]=month.split('-').map(Number);const d=new Date(Date.UTC(year,m-1+delta,1));return d.getUTCFullYear()+'-'+PAD(d.getUTCMonth()+1);};
const dateDisplay=value=>new Date(value+'T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'UTC',day:'2-digit',month:'short'});
const longMonth=month=>new Date(month+'-15T12:00:00Z').toLocaleDateString('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'});
const weekday=value=>WEEKDAYS[(asUTC(value).getUTCDay()+6)%7];
const forDay=(day,all)=>all.find(x=>x.day===day);
const csvText=value=>'"'+String(value??'').replace(/\r?\n/g,' ').replace(/^([\s]*)([=+@-])/,"$1'$2").replace(/"/g,'""')+'"';
const hours=end=>end||'—';

function can(role,target,kind){
 if(role==='dev')return true;
 if(kind==='breaks')return role==='manager'&&target==='attendant';
 if(kind==='days'||kind==='shift')return role==='manager'&&target==='attendant'||role==='coordinator'&&target==='manager';
 return false;
}
async function api(path,opts={}){
 const res=await fetch('/api/floor/schedules'+path,{credentials:'same-origin',cache:'no-store',...opts,
  headers:{...(opts.body?{'Content-Type':'application/json'}:{}),...opts.headers}});
 let result={};try{result=await res.json();}catch{}
 if(!res.ok)throw Error(result.error||'Não foi possível atualizar as escalas.');
 return result;
}
const breakItems=[{key:'break_1',label:'1ª pausa',duration:'10 min',sort:'01'},{key:'break_2',label:'Pausa principal',duration:'20 min',sort:'02'},{key:'break_3',label:'3ª pausa',duration:'10 min',sort:'03'}];
function ScheduleBadge({entry,compact=false}){
 if(!entry)return <span className="rs-badge unplanned"><i/>Não planejado</span>;
 if(entry.is_off)return <span className="rs-badge rest"><i/>Folga{!compact&&entry.off_source==='manual'?' · manual':''}</span>;
 return <div className={'rs-work-pill '+(compact?'compact':'')}>
  <span><i/>Trabalho</span>{!compact&&<small>{entry.start_time}–{entry.end_time}</small>}
 </div>;
}
function EmployeeAvatar({person,size='normal'}){
 const names=(person?.display_name||person?.username||'?').trim().split(/\s+/);
 const initials=(names[0]?.[0]||'')+(names.length>1?names.at(-1)[0]:'');
 return <span className={'rs-avatar '+size+' '+(person?.operational_role||'attendant')}>{initials.toUpperCase()}</span>;
}
function UserPill({person}){
 return <span className={'rs-role-pill '+(person.operational_role||'attendant')}><span>{ROLE_MARK[person.operational_role]||'◉'}</span>{ROLE_LABEL[person.operational_role]||'Atendente'}</span>;
}
function MonthCalendar({days,selectedId,entries,selectedDate,onSelect,role,targetRole}){
 const first=days[0],offset=(asUTC(first).getUTCDay()+6)%7;
 const blanks=Array.from({length:offset},(_,i)=>'pad-'+i);
 return <div className="rs-calendar">
  {WEEKDAYS.map(d=><span key={d} className="rs-calendar-weekday">{d}</span>)}
  {[...blanks,...days].map(date=>{
   if(date.startsWith('pad-'))return <span key={date} className="rs-calendar-blank"/>;
   const e=entries.find(x=>x.user_id===selectedId&&x.day===date);
   const today=date===LOCAL_DAY(),isOff=!!e?.is_off,isUnplanned=!e;
   return <button type="button" key={date} onClick={()=>onSelect(date)} className={'rs-calendar-day '+(isOff?'off':isUnplanned?'unplanned':'work')+(selectedDate===date?' selected':'')+(today?' today':'')} title={dateDisplay(date)+' · '+(isOff?'Folga':isUnplanned?'Não planejado':'Trabalho')}>
    <span className="rs-calendar-day-number">{Number(date.slice(-2))}{today&&<b>hoje</b>}</span>
    <span className="rs-calendar-day-label">{isOff?'☼ Folga':isUnplanned?'·': '● Turno'}</span>
    {e&&!isOff&&<small>{e.start_time}</small>}
    {(e?.off_source==='manual'||e?.break_source==='manual')&&<span className="rs-manual-dot" title="Alteração manual"/>}
   </button>;
  })}
  <div className="rs-calendar-legend"><span><i className="work"/>Trabalho</span><span><i className="off"/>Folga</span><span><i className="pending"/>Sem escala</span><span className="rs-caption">Selecione um dia para detalhes {can(role,targetRole,'days')?'e ajustes':''}.</span></div>
 </div>;
}
export default function FloorSchedule(){
 const [month,setMonth]=useState(LOCAL_DAY().slice(0,7));
 const [view,setView]=useState('week');
 const [data,setData]=useState(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[message,setMessage]=useState(null);
 const [search,setSearch]=useState(''),[roleFilter,setRoleFilter]=useState('all');
 const [selectedId,setSelectedId]=useState(''),[selectedDate,setSelectedDate]=useState(LOCAL_DAY());
 const [weekStart,setWeekStart]=useState(monday(LOCAL_DAY()));
 const [selectedGroup,setSelectedGroup]=useState('attendant');
 const [breakDraft,setBreakDraft]=useState(['','','']);
 const [shiftDraft,setShiftDraft]=useState({start:'08:00',end:'14:20'});
 const [offDraft,setOffDraft]=useState('random');
 const [roundDraft,setRoundDraft]=useState('0');
 const [roundSelection,setRoundSelection]=useState('profile');
 const [rolePending,setRolePending]=useState('');
 const load=useCallback(async()=>{
  setLoading(true);
  try{const next=await api('?month='+month);setData(next);setMessage(null);}
  catch(e){setMessage({kind:'error',text:e.message});}
  finally{setLoading(false);}
 },[month]);
 useEffect(()=>{void load();},[load]);
 const people=useMemo(()=>data?.users||[],[data]);
 const entries=useMemo(()=>data?.entries||[],[data]);
 const profiles=useMemo(()=>new Map((data?.profiles||[]).map(p=>[p.user_id,p])),[data]);
 const role=data?.currentRole||'attendant';
 const selected=people.find(p=>p.id===selectedId)||people[0]||null;
 useEffect(()=>{if(people.length&&!people.some(p=>p.operational_role===selectedGroup&&can(role,p.operational_role,'days'))){const eligibleRole=ROLE_ORDER.find(k=>people.some(p=>p.operational_role===k)&&can(role,k,'days'));if(eligibleRole)setSelectedGroup(eligibleRole);}},[role,people,selectedGroup]);
 useEffect(()=>{if(people.length&&(!selectedId||!people.some(p=>p.id===selectedId)))setSelectedId(people[0].id);},[people,selectedId]);
 const selectedProfile=selected&&profiles.get(selected.id)||{start_time:'08:00',end_time:'14:20',fixed_off_weekday:null,break_round_minutes:0};
 useEffect(()=>{setOffDraft(selectedProfile.fixed_off_weekday==null?'random':String(selectedProfile.fixed_off_weekday));},[selected?.id,selectedProfile.fixed_off_weekday]);
 useEffect(()=>{setRoundDraft(String(selectedProfile.break_round_minutes||0));},[selected?.id,selectedProfile.break_round_minutes]);
 useEffect(()=>{setShiftDraft({start:selectedProfile.start_time,end:selectedProfile.end_time});},[selectedId,selectedProfile.start_time,selectedProfile.end_time]);
 const currentEntry=selected&&entries.find(e=>e.user_id===selected.id&&e.day===selectedDate);
 useEffect(()=>setBreakDraft([currentEntry?.break_1||'',currentEntry?.break_2||'',currentEntry?.break_3||'']),[selectedId,selectedDate,currentEntry?.break_1,currentEntry?.break_2,currentEntry?.break_3]);
 useEffect(()=>{if(!selectedDate.startsWith(month))setSelectedDate(month+'-01');if(!weekStart.startsWith(month))setWeekStart(monday(month+'-01'));},[month]);
 const filteredPeople=useMemo(()=>people.filter(p=>(roleFilter==='all'||roleFilter===p.operational_role)&&[p.display_name,p.username].join(' ').toLowerCase().includes(search.toLowerCase())),[people,roleFilter,search]);
 const monthCount=entries.filter(x=>!x.is_off).length,offCount=entries.filter(x=>x.is_off).length;
 const selectedEntries=entries.filter(e=>e.user_id===selected?.id);
 const workingCount=selectedEntries.filter(x=>!x.is_off).length,restCount=selectedEntries.filter(x=>x.is_off).length;
 const selectedCap=selected?.operational_role;
 const eligible=people.filter(p=>can(role,p.operational_role,selectedGroup==='attendant'?'days':'days')&&p.operational_role===selectedGroup);
 const weekdayDates=Array.from({length:7},(_,i)=>addDays(weekStart,i));
 const addMessage=(text,kind='success')=>{setMessage({kind,text});};
 async function mutate(path,method,body,successText){
  setBusy(true);
  try{const result=await api(path,{method,body:JSON.stringify(body)});const fresh=await api('?month='+month);setData(fresh);addMessage(result.message||successText||'Atualização salva no servidor.');return result;}
  catch(err){addMessage(err.message,'error');return null;}
  finally{setBusy(false);}
 }
 function moveWeek(delta){
  const next=addDays(weekStart,delta*7);
  setWeekStart(next);
  if(next.slice(0,7)!==month)setMonth(next.slice(0,7));
 }
 async function generate(kind){
  if(!eligible.length){addMessage('Selecione um grupo que seu perfil pode administrar.','error');return;}
  const users=eligible.slice(0,100),name=kind==='days'?'folgas 6×1':'pausas 10–20–10';
  if(!window.confirm('Gerar '+name+' para '+users.length+' pessoa(s) em '+longMonth(month)+'? Ajustes manuais existentes serão preservados.'))return;
  await mutate('/generate','POST',{month,kind,userIds:users.map(p=>p.id),...(roundSelection==='profile'?{}:{roundMinutes:Number(roundSelection)})});
 }
 function exportCsv(){
  const rows=[['Data','Nome','Usuário','Perfil','Situação','Início','Fim','Pausa 10','Pausa 20','Pausa 10']];
  for(const p of filteredPeople)for(const e of entries.filter(x=>x.user_id===p.id))rows.push([e.day,p.display_name,p.username,ROLE_LABEL[p.operational_role],e.is_off?'Folga':'Trabalho',e.start_time,e.end_time,e.is_off?'':e.break_1,e.is_off?'':e.break_2,e.is_off?'':e.break_3]);
  const blob=new Blob(['\ufeff'+rows.map(x=>x.map(csvText).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='escalas-'+month+'.csv';a.click();URL.revokeObjectURL(url);
 }
 const updateRole=async(person,next)=>{setRolePending(person.id);await mutate('/roles','PATCH',{targetId:person.id,role:next},'Perfil atualizado.');setRolePending('');};
 return <div className="rs-wrap">
   <header className="rs-hero">
     <div className="rs-hero-orb a"/><div className="rs-hero-orb b"/>
     <div className="rs-hero-content"><div className="rs-kicker"><span className="rs-live-dot"/> CENTRAL DE ESCALAS · PLANEJAMENTO OPERACIONAL</div>
       <h2>Equipes alinhadas. <em>Rotina em equilíbrio.</em></h2><p>Planejamento 6×1, folgas e pausas 10–20–10 em uma única visão colaborativa, com controle de acesso por função.</p>
       <div className="rs-hero-tags"><span>◷ Visão semanal</span><span>▦ Folgas mensais</span><span>✦ Pausas inteligentes</span><span>⌁ Sincronizado com PostgreSQL</span></div>
     </div>
     <div className="rs-hero-right"><span>SEU PERFIL</span><strong>{ROLE_MARK[role]||'◉'} {ROLE_LABEL[role]||'Atendente'}</strong><small>{role==='dev'?'Administração operacional completa':role==='coordinator'?'Edita escalas de gestores':role==='manager'?'Edita escalas e pausas dos atendentes':'Consulta das escalas da equipe'}</small></div>
   </header>
   {message&&<div className={'rs-message '+message.kind} role={message.kind==='error'?'alert':'status'}><span>{message.kind==='error'?'⚠':'✓'}</span>{message.text}<button onClick={()=>setMessage(null)} aria-label="Fechar aviso">×</button></div>}
   <div className="rs-kpis"><article><span>Equipe ativa</span><strong>{people.length}</strong><small>Profissionais cadastrados</small><i>👥</i></article><article><span>Turnos planejados</span><strong>{monthCount}</strong><small>Registros no período</small><i>◷</i></article><article><span>Folgas</span><strong>{offCount}</strong><small>Ciclo 6×1</small><i>☼</i></article><article><span>Pausas configuradas</span><strong>{entries.filter(e=>!e.is_off&&e.break_1&&e.break_2&&e.break_3).length}</strong><small>Sequência 10 · 20 · 10 min</small><i>☕</i></article></div>
   <div className="rs-toolbar"><div className="rs-toolbar-title"><strong>Planejamento da equipe</strong><small>{longMonth(month)}</small></div><div className="rs-toolbar-actions">
    <button type="button" className="rs-month-arrow" onClick={()=>setMonth(monthShift(month,-1))} aria-label="Mês anterior">‹</button>
    <input type="month" aria-label="Selecionar mês" min="2020-01" max="2100-12" value={month} onChange={e=>{if(e.target.value)setMonth(e.target.value);}}/>
    <button type="button" className="rs-month-arrow" onClick={()=>setMonth(monthShift(month,1))} aria-label="Próximo mês">›</button>
    <button type="button" onClick={load} disabled={loading} title="Atualizar"><span>↻</span> Atualizar</button>
    <button type="button" className="rs-export" onClick={exportCsv} disabled={!entries.length}>↓ CSV</button>
   </div></div>
   <div className="rs-nav" role="tablist" aria-label="Visões da escala">{[['week','◷','Visão semanal'],['month','▦','Calendário mensal'],['breaks','☕','Escala de pausas'],['team','♧','Equipe e acessos']].map(([key,icon,label])=><button role="tab" key={key} aria-selected={view===key} className={view===key?'active':''} onClick={()=>setView(key)}><span>{icon}</span>{label}</button>)}</div>
   {loading&&!data?<div className="rs-empty">Carregando profissionais e escalas…</div>:<>
   {view==='week'&&<div className="rs-card"><div className="rs-card-head"><div><small>VISÃO OPERACIONAL</small><h3>Escala semanal 6×1</h3><p>Distribuição de turnos e folgas por profissional.</p></div><div className="rs-week-nav"><button onClick={()=>moveWeek(-1)} title="Semana anterior">‹</button><strong>{dateDisplay(weekdayDates[0])} — {dateDisplay(weekdayDates[6])}</strong><button onClick={()=>moveWeek(1)} title="Próxima semana">›</button></div></div>
      <div className="rs-team-filter"><input type="search" aria-label="Buscar profissional" placeholder="⌕ Buscar atendente, gestor ou coordenador…" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Filtrar perfil" value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}><option value="all">Todos os perfis</option>{ROLE_ORDER.map(k=><option key={k} value={k}>{ROLE_LABEL[k]}</option>)}</select></div>
      <div className="rs-table-scroll"><table className="rs-week-table"><thead><tr><th>Profissional</th>{weekdayDates.map(d=><th key={d} className={d===LOCAL_DAY()?'today':''}>{weekday(d)}<br/><b>{Number(d.slice(-2))}</b></th>)}</tr></thead><tbody>{filteredPeople.map(p=><tr key={p.id}><th><div className="rs-table-person"><EmployeeAvatar person={p}/><span><strong>{p.display_name}</strong><small>{ROLE_LABEL[p.operational_role]}</small></span></div></th>{weekdayDates.map(date=>{const record=entries.find(e=>e.user_id===p.id&&e.day===date);return <td key={date}><button className="rs-week-day" type="button" disabled={!date.startsWith(month)} onClick={()=>{setSelectedId(p.id);setSelectedDate(date);setView('month');}} title={p.display_name+' · '+dateDisplay(date)}><ScheduleBadge entry={record}/></button></td>;})}</tr>)}{!filteredPeople.length&&<tr><td colSpan={8} className="rs-table-empty">Nenhum profissional encontrado.</td></tr>}</tbody></table></div>
      <div className="rs-tip">✦ A escala usa uma folga a cada sete dias. Alterações manuais e regras de domingos/feriados precisam ser revisadas pela coordenação antes da aplicação.</div>
   </div>}
   {view==='month'&&<div className="rs-detail-grid">
    <div className="rs-card"><div className="rs-card-head"><div><small>PLANEJAMENTO MENSAL</small><h3>Calendário de folgas</h3><p>Folgas, jornadas e exceções por profissional.</p></div><div className="rs-count-chip">6 <span>×</span> 1</div></div>
     <div className="rs-person-picker"><select aria-label="Escolher profissional" value={selected?.id||''} onChange={e=>setSelectedId(e.target.value)}>{people.map(p=><option key={p.id} value={p.id}>{p.display_name} · {ROLE_LABEL[p.operational_role]}</option>)}</select></div>
     {selected&&<div className="rs-person-summary"><EmployeeAvatar person={selected} size="large"/><div><strong>{selected.display_name}</strong><UserPill person={selected}/></div><div className="rs-person-counts"><span>{workingCount} turnos</span><span>{restCount} folgas</span></div></div>}
     {selected&&<MonthCalendar days={data?.dates||[]} selectedId={selected.id} entries={entries} selectedDate={selectedDate} onSelect={setSelectedDate} role={role} targetRole={selectedCap}/>}
    </div>
    <aside className="rs-card rs-day-panel"><div className="rs-card-head"><div><small>DETALHES DO DIA</small><h3>{dateDisplay(selectedDate)}</h3><p>{weekday(selectedDate)} · {selected?.display_name||'Equipe'}</p></div><span className="rs-detail-symbol">◫</span></div>
     {selected&&<><ScheduleBadge entry={currentEntry}/><div className="rs-day-schedule"><div><small>Início do turno</small><strong>{currentEntry?.start_time||selectedProfile.start_time}</strong></div><div><small>Fim do turno</small><strong>{currentEntry?.end_time||selectedProfile.end_time}</strong></div></div>
      <div className="rs-subtitle">Pausas programadas</div><div className="rs-mini-breaks">{breakItems.map(b=><div key={b.key}><span>{b.sort}</span><strong>{b.label} <small>{b.duration}</small></strong><b>{currentEntry?.is_off?'—':hours(currentEntry?.[b.key])}</b></div>)}</div>
      {can(role,selectedCap,'days')&&<div className="rs-manual-actions"><small>AJUSTE MANUAL DE FOLGA</small><div><button disabled={busy||!selectedDate.startsWith(month)} className="rs-rest-btn" onClick={()=>mutate('/day','PATCH',{targetId:selected.id,date:selectedDate,kind:'days',off:true},'Folga registrada.')}>☼ Marcar folga</button><button disabled={busy||!selectedDate.startsWith(month)} className="rs-work-btn" onClick={()=>mutate('/day','PATCH',{targetId:selected.id,date:selectedDate,kind:'days',off:false},'Turno registrado.')}>◷ Marcar trabalho</button></div></div>}
      {currentEntry?.off_source==='manual'&&<p className="rs-note">✎ Dia configurado manualmente. Gerações automáticas não substituirão essa escolha.</p>}
      <div className="rs-weekday-settings">
        <div className="rs-setting-heading"><span className="rs-setting-icon">☼</span><div><strong>Dia fixo de folga</strong><small>Uma folga por semana · ciclo 6×1</small></div></div>
        <p>Escolha o dia que se repetirá semanalmente para <b>{selected.display_name}</b>. Você pode voltar à distribuição automática a qualquer momento.</p>
        <div className="rs-weekday-choice"><select aria-label="Dia fixo de folga do profissional" disabled={!can(role,selectedCap,'days')||busy} value={offDraft} onChange={e=>setOffDraft(e.target.value)}><option value="random">✧ Automático · distribuir folgas</option>{OFF_DAYS.map(([value,label])=><option key={value} value={value}>{label} · toda semana</option>)}</select>
        {can(role,selectedCap,'days')&&<button type="button" disabled={busy||(offDraft==='random'?selectedProfile.fixed_off_weekday==null:Number(offDraft)===selectedProfile.fixed_off_weekday)} onClick={()=>mutate('/preferences','PATCH',{targetId:selected.id,fixedOffWeekday:offDraft==='random'?null:Number(offDraft)},'Dia de folga salvo. Gere novamente o mês para atualizar os dias automáticos.')}>Salvar dia fixo</button>}</div>
        <div className="rs-setting-note">{selectedProfile.fixed_off_weekday==null?'✧ Preferência atual: folga distribuída automaticamente.':'✓ Preferência atual: toda '+(OFF_DAYS.find(([value])=>Number(value)===selectedProfile.fixed_off_weekday)?.[1]||'semana')+'.'} <span>Alterações manuais de dias específicos continuam preservadas.</span></div>
      </div>
      <div className="rs-shift-settings"><small>JORNADA PADRÃO · {selected.display_name}</small><div><label>Entrada<input aria-label="Entrada do turno" type="time" disabled={!can(role,selectedCap,'shift')} value={shiftDraft.start} onChange={e=>setShiftDraft(p=>({...p,start:e.target.value}))}/></label><label>Saída<input aria-label="Saída do turno" type="time" disabled={!can(role,selectedCap,'shift')} value={shiftDraft.end} onChange={e=>setShiftDraft(p=>({...p,end:e.target.value}))}/></label></div>{can(role,selectedCap,'shift')&&<button disabled={busy} onClick={()=>mutate('/shift','PATCH',{targetId:selected.id,start:shiftDraft.start,end:shiftDraft.end},'Novo turno padrão salvo. Aplique ao gerar próximos períodos.')}>Salvar jornada padrão</button>}<p>Turnos que cruzam a meia-noite são aceitos. A nova jornada será aplicada aos dias gerados posteriormente.</p></div>
     </>}
    </aside>
   </div>}
   {view==='breaks'&&<div className="rs-detail-grid"><div className="rs-card"><div className="rs-card-head"><div><small>GESTÃO DE INTERVALOS</small><h3>Pausas de atendimento</h3><p>Dois descansos de 10 min e um de 20 min, conforme a configuração da operação.</p></div><span className="rs-coffee">☕</span></div>
     <div className="rs-person-picker"><select aria-label="Profissional das pausas" value={selected?.id||''} onChange={e=>setSelectedId(e.target.value)}>{people.map(p=><option key={p.id} value={p.id}>{p.display_name} · {ROLE_LABEL[p.operational_role]}</option>)}</select></div>
     <div className="rs-break-guide">{breakItems.map((b,i)=><div key={b.key} className="rs-break-guide-part"><div className="rs-guide-ring">{b.sort}</div><span>{b.label}<strong>{b.duration}</strong></span>{i!==2&&<i/>}</div>)}</div>
     {selected&&<div className="rs-break-month"><div className="rs-break-month-head"><span>Data</span><span>Turno</span><span>Pausa 10</span><span>Pausa 20</span><span>Pausa 10</span></div>{(data?.dates||[]).map(date=>{const entry=forDay(date,selectedEntries);return <button type="button" key={date} className={'rs-break-row '+(selectedDate===date?'active':'')} onClick={()=>setSelectedDate(date)}><span>{weekday(date)} {Number(date.slice(-2))}</span><span>{entry?.is_off?'FOLGA':entry?'Turno':'—'}</span><span>{entry?.break_1||'—'}</span><span>{entry?.break_2||'—'}</span><span>{entry?.break_3||'—'}</span></button>;})}</div>}
    </div>
    <aside className="rs-card rs-break-edit"><div className="rs-card-head"><div><small>INTERVALOS DO DIA</small><h3>{dateDisplay(selectedDate)}</h3><p>{selected?.display_name||'Selecione alguém'}</p></div><span className="rs-detail-symbol">✎</span></div>
     {selected&&<><ScheduleBadge entry={currentEntry}/><div className="rs-break-inputs">{breakItems.map((b,i)=><label key={b.key}><span><i>{b.sort}</i>{b.label}<small>{b.duration}</small></span><input type="time" aria-label={b.label} disabled={!can(role,selectedCap,'breaks')||!currentEntry||currentEntry.is_off} value={breakDraft[i]} onChange={e=>setBreakDraft(p=>p.map((x,n)=>n===i?e.target.value:x))}/></label>)}</div>
      {can(role,selectedCap,'breaks')&&<button className="rs-primary" disabled={busy||!currentEntry||currentEntry.is_off||breakDraft.some(x=>!x)} onClick={()=>mutate('/day','PATCH',{targetId:selected.id,date:selectedDate,kind:'breaks',breaks:breakDraft},'Pausas atualizadas.')}>✓ Salvar pausas deste dia</button>}
      {!can(role,selectedCap,'breaks')&&<div className="rs-locked">⌁ Apenas gestores/supervisores podem ajustar as pausas de atendentes. O perfil Dev possui acesso administrativo.</div>}
      <div className="rs-round-settings"><div className="rs-setting-heading"><span className="rs-setting-icon">◷</span><div><strong>Pausas em número redondo</strong><small>Horários com minutos exatos e previsíveis</small></div></div>
      <p>O gerador procura horários próximos do ideal, sem sobrepor as pausas ou sair da jornada. Exemplos em múltiplos de 10: <b>09:00, 10:20, 11:40</b>.</p>
      <select aria-label="Arredondamento das pausas deste atendente" disabled={!can(role,selectedCap,'breaks')||busy} value={roundDraft} onChange={e=>setRoundDraft(e.target.value)}>{ROUND_OPTIONS.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
      {can(role,selectedCap,'breaks')&&<button type="button" disabled={busy||Number(roundDraft)===(selectedProfile.break_round_minutes||0)} onClick={()=>mutate('/preferences','PATCH',{targetId:selected.id,breakRoundMinutes:Number(roundDraft)},'Arredondamento salvo. Gere as pausas novamente para aplicar.')}>Salvar preferência de pausas</button>}
      <small>Configuração atual: {ROUND_OPTIONS.find(([key])=>Number(key)===(selectedProfile.break_round_minutes||0))?.[1]||'Livre'}. A configuração vale para as próximas gerações, sem alterar pausas já salvas manualmente.</small></div>
      <div className="rs-break-reminder"><strong>Regras da sequência</strong><p>Os intervalos devem permanecer dentro do turno, na ordem 10–20–10, sem sobreposição. Jornadas noturnas também são aceitas.</p></div>
     </>}</aside>
   </div>}
   {view==='team'&&<div className="rs-card"><div className="rs-card-head"><div><small>ESTRUTURA OPERACIONAL</small><h3>Equipe e níveis de acesso</h3><p>Perfis definidos no banco de dados. A atribuição de funções é restrita ao Dev.</p></div><span className="rs-detail-symbol">♧</span></div>
    <div className="rs-role-key">{ROLE_ORDER.map(k=><div key={k}><span className={'rs-role-icon '+k}>{ROLE_MARK[k]}</span><strong>{ROLE_LABEL[k]}</strong><small>{people.filter(p=>p.operational_role===k).length} membro(s)</small></div>)}</div>
    <div className="rs-team-list">{people.map(p=><div className="rs-team-member" key={p.id}><EmployeeAvatar person={p} size="large"/><div><strong>{p.display_name}</strong><small>{p.username}</small></div><UserPill person={p}/>{role==='dev'&&p.operational_role!=='dev'?<select aria-label={'Alterar perfil de '+p.display_name} disabled={busy||rolePending===p.id} value={p.operational_role} onChange={e=>{const next=e.target.value;if(window.confirm('Alterar o perfil operacional de '+p.display_name+' para '+ROLE_LABEL[next]+'?'))void updateRole(p,next);}}>{ROLE_ORDER.filter(k=>k!=='dev').map(k=><option key={k} value={k}>{ROLE_LABEL[k]}</option>)}</select>:<span className="rs-readonly">{p.operational_role==='dev'?'🔒 Conta Dev protegida':'Somente leitura'}</span>}</div>)}</div>
    <div className="rs-access-info"><strong>🔐 Permissões da escala</strong><p><b>Atendente:</b> consulta todas as escalas. <b>Gestor/Supervisor:</b> edita folgas, jornadas e pausas de atendentes. <b>Coordenador:</b> edita folgas e jornadas de gestores. <b>Dev:</b> administra os perfis e pode corrigir escalas conforme necessário. Todas as alterações são verificadas no servidor e auditadas.</p></div>
   </div>}
   {(role==='manager'||role==='coordinator'||role==='dev')&&<section className="rs-automation"><div className="rs-automation-icon">✧</div><div className="rs-automation-text"><small>PLANEJAMENTO ASSISTIDO</small><h3>Gerador de escalas mensais</h3><p>Respeita os dias fixos de folga de cada profissional e permite pausas com horários redondos. Preserva todas as alterações manuais.</p><div className="rs-automation-target"><label htmlFor="rs-role-group">Gerar para</label><select id="rs-role-group" value={selectedGroup} onChange={e=>setSelectedGroup(e.target.value)}>{ROLE_ORDER.filter(k=>people.some(p=>p.operational_role===k)&&can(role,k,'days')).map(k=><option key={k} value={k}>{ROLE_LABEL[k]}</option>)}</select><span>{eligible.length} profissional(is)</span></div></div><div className="rs-automation-buttons"><label className="rs-generation-round"><strong>Arredondar pausas</strong><select aria-label="Arredondamento para esta geração" value={roundSelection} onChange={e=>setRoundSelection(e.target.value)}><option value="profile">Usar preferência individual</option>{ROUND_OPTIONS.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select><span>Escolha só para esta geração; não substitui a preferência salva de cada profissional.</span></label><button disabled={busy||!eligible.length} className="rs-primary" onClick={()=>generate('days')}>☼ Gerar folgas 6×1</button><button disabled={busy||!eligible.length||!can(role,selectedGroup,'breaks')} onClick={()=>generate('breaks')}>☕ Gerar pausas 10–20–10</button><small>{busy?'Processando…':'Cada geração é salva no banco e registrada na auditoria.'}</small></div></section>}
   <p className="rs-footer-note">O planejamento gerado é uma proposta operacional. Verifique cobertura mínima, turnos, domingos, feriados, legislação aplicável e acordos coletivos antes de colocá-lo em prática. Escalas já ajustadas manualmente são preservadas nas novas gerações.</p>
   </>}
 </div>;
}
