'use client';
import dynamic from 'next/dynamic';
const Documentation=dynamic(()=>import('./nexus-documentation.jsx'),{loading:()=> <p role="status">Carregando Nexus Docs…</p>,ssr:false});
import AnalysisFeedback from './analysis-feedback.jsx';
import GeminiInsights from './gemini-insights.jsx';
import LegalReference from './legal-reference.jsx';
import WritingReview from './writing-review.jsx';
import StartupScreen from './startup-screen.jsx';
import FloorControl from './floor-control.jsx';
import Quality from './quality.jsx';
import { Icon, categoryIcon } from './icons.jsx';
import { useEffect,useMemo,useRef,useState } from 'react';

async function call(path,options={}) {
  const response=await fetch('/api'+path,{credentials:'same-origin',cache:'no-store',...options,
    headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});
  let data={};
  try{data=await response.json();}catch{}
  if(!response.ok)throw new Error(data.error||'Falha na comunicação com o servidor.');
  return data;
}
const body=(value)=>JSON.stringify(value);
const emptyEntry=()=>({code:'',title:'',category:'Proteção',priority:'Média',summary:'',body:'',tags:[],revision:0});
const toEntries=(value)=>value.split(',').map(x=>x.trim()).filter(Boolean);
const formatDate=(v)=>v?new Date(v).toLocaleString('pt-BR'):'—';
const Btn=({children,onClick,className='',disabled=false,type='button'})=><button type={type} className={'btn '+className} disabled={disabled} onClick={onClick}>{children}</button>;
const Tag=({priority})=><span className={'badge '+(priority==='Crítica'?'crit':priority==='Alta'?'high':'')}>{priority||'Média'}</span>;

export default function Home(){
  const [loadingPhase,setLoadingPhase]=useState('session');
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [user,setUser]=useState(null),[dark,setDark]=useState(false);
  const [notice,setNotice]=useState(''),[success,setSuccess]=useState('');
  const [catalogIssue,setCatalogIssue]=useState(''),[catalogDegraded,setCatalogDegraded]=useState(false),[catalogRefreshing,setCatalogRefreshing]=useState(false);
  const [docsOpened,setDocsOpened]=useState(false);
  const [screen,setScreen]=useState('home'),[requestMode,setRequestMode]=useState(false);
  const [login,setLogin]=useState({username:'',password:''});
  const [passwordForm,setPasswordForm]=useState({current:'',next:'',confirm:''});
  const [request,setRequest]=useState({username:'',name:'',reason:''});
  const [entries,setEntries]=useState([]),[brainRules,setBrainRules]=useState({base:[],extras:[],custom:[]});
  const [search,setSearch]=useState(''),[cat,setCat]=useState('Todas'),[selectedId,setSelectedId]=useState(null);
  const [priorityFilter,setPriorityFilter]=useState('Todas');
  const [catalogLimit,setCatalogLimit]=useState(60);
  const [relato,setRelato]=useState(''),[analysis,setAnalysis]=useState(null);
  const [pendingSadeReport,setPendingSadeReport]=useState('');
  const [ai,setAI]=useState(null),[aiTesting,setAITesting]=useState(false),[aiTestResult,setAITestResult]=useState('');
  const [adminRequests,setAdminRequests]=useState([]),[adminUsers,setAdminUsers]=useState([]),[events,setEvents]=useState([]);
  const [credential,setCredential]=useState(null);
  const [editor,setEditor]=useState(emptyEntry()),[ruleDraft,setRuleDraft]=useState({code:'',officialNature:'',category:'Proteção',priority:'Média',group1:'',group2:'',explanation:''});
  const [revisionHistory,setRevisionHistory]=useState([]);
  const isAdmin=user?.role==='admin';

  function ok(message){setSuccess(message);setNotice('');}
  function err(error){setNotice(error?.message||String(error));setSuccess('');}
  function clear(){setNotice('');setSuccess('');}
  function theme(){
    setDark(v=>{const next=!v;localStorage.setItem('base190_theme',next?'dark':'light');
      document.documentElement.dataset.theme=next?'dark':'light';return next;});
  }
  async function refreshCatalog(){
    setCatalogRefreshing(true);
    try{
      // Consultas independentes: uma falha em regras não deve apagar 769 fichas.
      const [catalog,rules]=await Promise.allSettled([call('/entries'),call('/rules')]);
      if(catalog.status==='fulfilled'&&Array.isArray(catalog.value.entries))setEntries(catalog.value.entries);
      if(rules.status==='fulfilled'&&Array.isArray(rules.value.base))setBrainRules(rules.value);
      const errors=[catalog,rules].filter(x=>x.status==='rejected').map(x=>x.reason?.message||'Falha de consulta');
      const degraded=[catalog,rules].filter(x=>x.status==='fulfilled'&&x.value.degraded).map(x=>x.value.warning).filter(Boolean);
      setCatalogDegraded(degraded.length>0);
      setCatalogIssue(errors.length?'Falha ao consultar '+(catalog.status==='rejected'?'o catálogo':'as regras')+'. '+errors.join(' ')+' Tente recarregar.':degraded[0]||'');
      return !errors.length&&!degraded.length;
    }finally{setCatalogRefreshing(false);}
  }
  async function refreshAdmin(){
    const [a,b]=await Promise.all([call('/admin/requests'),call('/admin/users')]);
    setAdminRequests(a.requests);setAdminUsers(b.users);
  }
  useEffect(()=>{
    const stored=localStorage.getItem('base190_theme');
    const preferDark=stored==='dark';
    document.documentElement.dataset.theme=preferDark?'dark':'light';setDark(preferDark);
    let live=true;
    (async()=>{try{
      const a=await call('/session');
      if(!live)return;
      setUser(a.user);setLoadingPhase('catalog');
      const [catalog,rules]=await Promise.allSettled([call('/entries'),call('/rules')]);
      if(live){
        if(catalog.status==='fulfilled'&&Array.isArray(catalog.value.entries))setEntries(catalog.value.entries);
        if(rules.status==='fulfilled'&&Array.isArray(rules.value.base))setBrainRules(rules.value);
        const errors=[catalog,rules].filter(x=>x.status==='rejected').map(x=>x.reason?.message||'Falha de consulta');
        const degraded=[catalog,rules].filter(x=>x.status==='fulfilled'&&x.value.degraded).map(x=>x.value.warning).filter(Boolean);
        setCatalogDegraded(degraded.length>0);
        setCatalogIssue(errors.length?'Não foi possível carregar '+(catalog.status==='rejected'?'o catálogo':'as regras')+'. '+errors.join(' '):degraded[0]||'');
      }
    }catch(e){if(live && !/Sessão ausente|Sessão expirada|não autorizado/i.test(e.message))setNotice(e.message);}
    finally{if(live)setLoading(false);}})();
    return()=>{live=false;};
  },[]);
  useEffect(()=>{
    if(!user||user.mustChangePassword)return;
    call('/ai/status').then(setAI).catch(()=>setAI(null));
  },[user?.id,user?.mustChangePassword]);
  async function testAI(){
    if(!user?.canTestGemini)return;
    setAITesting(true);setAITestResult('');
    try{const data=await call('/admin/ai/test',{method:'POST',body:'{}'});setAITestResult(data.result?.resposta||'Configuração consultada.');}
    catch(e){setAITestResult(e.message);}finally{setAITesting(false);}
  }
  async function submitLogin(event){
    event.preventDefault();clear();setBusy(true);
    try{const data=await call('/auth/login',{method:'POST',body:body(login)});setUser(data.user);setScreen('home');setLogin({username:'',password:''});await refreshCatalog();}
    catch(e){err(e);}finally{setBusy(false);}
  }
  async function submitRequest(event){
    event.preventDefault();clear();setBusy(true);
    try{const data=await call('/access-requests',{method:'POST',body:body(request)});ok(data.message);setRequest({username:'',name:'',reason:''});}
    catch(e){err(e);}finally{setBusy(false);}
  }
  async function changePassword(event){
    event.preventDefault();clear();
    if(passwordForm.next!==passwordForm.confirm)return err(new Error('A confirmação não corresponde à nova senha.'));
    setBusy(true);
    try{
      const x=await call('/auth/change-password',{method:'POST',body:body({current:passwordForm.current,next:passwordForm.next})});
      setUser(null);setPasswordForm({current:'',next:'',confirm:''});ok(x.message);
    }catch(e){err(e);}finally{setBusy(false);}
  }
  async function logout(){
    const waits=[];window.dispatchEvent(new CustomEvent('base190:flush-editors',{detail:{waits}}));const drafts=await Promise.all(waits);if(drafts.some(result=>result!==true)&&!confirm('Não foi possível salvar a recuperação. Sair mesmo assim pode perder alterações. Continuar?'))return;
    setBusy(true);try{await call('/auth/logout',{method:'POST',body:'{}'});}catch(e){err(e);}
    setDocsOpened(false);setUser(null);setScreen('home');setEntries([]);setBrainRules({base:[],extras:[],custom:[]});setBusy(false);setCredential(null);
  }
  async function go(next){
    if(!window.dispatchEvent(new Event('base190:before-navigation',{cancelable:true})))return;
    if(next==='brain')next='chat';
    if(next==='docs')setDocsOpened(true);
    clear();setScreen(next);setCredential(null);
    if(next==='access'){try{await refreshAdmin();}catch(e){err(e);}}
    if(next==='audit'){try{const x=await call('/admin/audit');setEvents(x.events);}catch(e){err(e);}}
    if(next==='rules'){try{const x=await call('/rules');setBrainRules(x);}catch(e){err(e);}}
  }
  async function analyze(e){
    e?.preventDefault?.();clear();const text=relato.trim();if(text.length<3)return err(new Error('Informe o relato ou a dúvida para análise.'));
    setRelato('');setPendingSadeReport(text);setScreen('chat');
  }
  function openEntry(id){setSelectedId(id);go('detail');}
  const selected=entries.find(e=>e.id===selectedId);
  const categories=useMemo(()=>['Todas',...new Set(entries.map(e=>e.category))], [entries]);
  const filtered=useMemo(()=>entries.filter(e=>(cat==='Todas'||e.category===cat)&&(priorityFilter==='Todas'||e.priority===priorityFilter)&&
    (!search.trim()||[e.title,e.code,e.category,e.summary,e.body,...(e.tags||[])].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
      .includes(search.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()))),[entries,cat,search,priorityFilter]);
  useEffect(()=>setCatalogLimit(60),[search,cat,priorityFilter]);
  const totalRules=(brainRules.base?.length||0)+(brainRules.extras?.length||0)+(brainRules.custom?.length||0);
  function editEntry(entry){if(entry?.readOnly||catalogDegraded){setCatalogIssue('A edição está indisponível no catálogo de contingência. Recarregue os dados do banco antes de modificar uma ficha.');return;}setEditor(entry?{...entry,tags:entry.tags||[]}:emptyEntry());setRevisionHistory([]);go('editor');}
  async function saveEntry(e){
    e.preventDefault();clear();setBusy(true);
    try{
      if(editor.id)await call('/admin/entries',{method:'PATCH',body:body(editor)});
      else await call('/admin/entries',{method:'POST',body:body(editor)});
      await refreshCatalog();ok('Ficha salva com histórico de revisões.');setScreen('catalog');
    }catch(e){err(e);}finally{setBusy(false);}
  }
  async function loadHistory(){
    try{const d=await call('/admin/entries/revisions?id='+encodeURIComponent(editor.id));setRevisionHistory(d.revisions);}
    catch(e){err(e);}
  }
  async function manageRequest(id,action){
    clear();setBusy(true);
    try{
      const x=await call('/admin/requests',{method:'POST',body:body({id,action})});
      if(x.temporaryPassword){const r=adminRequests.find(a=>a.id===id);
        setCredential({user:r?.username||'',pass:x.temporaryPassword});}
      ok(x.message);await refreshAdmin();
    }catch(e){err(e);}finally{setBusy(false);}
  }
  async function setAccount(id,active){
    clear();setBusy(true);
    try{const x=await call('/admin/users',{method:'PATCH',body:body({id,active})});ok(x.message);await refreshAdmin();}
    catch(e){err(e);}finally{setBusy(false);}
  }
  async function resetPassword(id,username){
    clear();setBusy(true);
    try{const x=await call('/admin/users/reset',{method:'POST',body:body({id})});
      setCredential({user:username,pass:x.temporaryPassword});ok('Senha temporária criada; sessões anteriores revogadas.');}
    catch(e){err(e);}finally{setBusy(false);}
  }
  async function createRule(e){
    e.preventDefault();clear();setBusy(true);
    try{
      const payload={...ruleDraft,group1:toEntries(ruleDraft.group1),group2:toEntries(ruleDraft.group2)};
      await call('/admin/rules',{method:'POST',body:body(payload)});
      const r=await call('/rules');setBrainRules(r);
      setRuleDraft({code:'',officialNature:'',category:'Proteção',priority:'Média',group1:'',group2:'',explanation:''});ok('Nova regra adicionada ao assistente.');
    }catch(e){err(e);}finally{setBusy(false);}
  }
  async function deleteRule(id){
    if(!window.confirm('Excluir esta regra personalizada?'))return;
    clear();try{await call('/admin/rules',{method:'DELETE',body:body({id})});setBrainRules(await call('/rules'));ok('Regra excluída.');}
    catch(e){err(e);}
  }
  function entryGrid(items){return <div className="cards">{items.map(a=><button key={a.id} className="record-card" onClick={()=>openEntry(a.id)}>
    <div className="toolbar"><span className="badge">{a.code}</span><Tag priority={a.priority}/></div>
    <div className="record-symbol"><Icon name={categoryIcon(a.category)} size={23}/><span>{a.category}</span></div><h3>{a.title}</h3><p>{a.summary}</p>
    <div className="end"><small>{a.category}</small><b style={{color:'var(--blue)'}}>Consultar <Icon name="arrow" size={15}/></b></div>
  </button>)}</div>}
  function triageView(result){
    const pending=result?.triage?.pending||result?.principal?.triageQuestions?.map((question,i)=>({id:String(i),question}))||[];
    const answered=result?.triage?.answered?.length||0;
    return <section className="triage-panel" aria-label="Triagem contextual"><div className="triage-heading"><Icon name="audit" size={19}/><h3>Perguntas de triagem</h3><span className="badge">{pending.length} pendente{pending.length===1?'':'s'}</span></div>
      <p className="triage-caption">{answered>0?`${answered} pergunta(s) já respondida(s) no relato foram ocultadas.`:'Confirme somente as informações que ainda faltam no relato.'}</p>
      {pending.length?<ul className="triage-questions">{pending.map((q,i)=><li key={q.id}><span className="triage-index">{String(i+1).padStart(2,'0')}</span><div>{q.question}{q.reason==='conflicting'&&<small className="triage-conflict">Há informações divergentes no relato. Confirme.</small>}</div></li>)}</ul>:<p className="triage-complete"><Icon name="shield" size={18}/> As perguntas previstas para esta natureza já estão respondidas no relato. Confira os dados antes de concluir.</p>}
    </section>;
  }
  async function reanalyzeResult(result,roleOverrides){
    const reply=await call('/analyze',{method:'POST',body:body({text:result.originalReport,roleOverrides})});
    setAnalysis(prev=>prev===result?reply.result:prev);
    setChatMessages(prev=>prev.map(m=>m.result===result?{...m,result:reply.result}:m));
  }
  function chatAnswer(result){
    if(!result)return <p>Sem resposta da Base 190.</p>;
    if(result.tipo==='faq'||result.tipo==='ia'||result.tipo==='local-triage')return <div className="chat-answer"><span className="badge">{result.source==='gemini'?'Gemini · resposta complementar':'Base local · sem consulta à IA'}</span><h3>{result.titulo||'Orientação'}</h3>{result.contextUsed&&<p className="helpnote" role="note">{result.contextNote||'Complemento interpretado com o relato anterior desta conversa. Confira os fatos antes de utilizar.'}</p>}<p className="assistant-text" style={{whiteSpace:'pre-line'}}>{result.resposta}</p>{(result.tipo==='ia'||result.tipo==='local-triage')&&<GeminiInsights key={JSON.stringify([result.originalReport,result.roleAnalysis])} result={result} onReanalyze={roles=>reanalyzeResult(result,roles)}/>} {result.tipo==='local-triage'&&<WritingReview original={result.originalReport} aiConfigured={Boolean(ai?.configured)}/>}  {!!result.references?.length&&<details><summary>Fichas consultadas</summary><ul>{result.references.map(r=><li key={r.code}>{r.code} · {r.title}</li>)}</ul></details>}{result.tipo==='ia'&&<><small>Conteúdo gerado por IA. Confira as informações antes de utilizar.</small><AnalysisFeedback key={result.feedbackTicket||'legacy'} result={result}/></>}</div>;
    if(result.tipo!=='classificacao')return <div className="chat-answer"><b>Análise não conclusiva</b><p>{result.mensagem||'Verifique o relato e consulte os procedimentos oficiais.'}</p></div>;
    const main=result.principal||{};
    return <div className="chat-answer">
      <div className="chat-answer-title"><span>Natureza sugerida</span><Tag priority={main.priority}/></div>
      <h3>{main.officialNature||'Não identificada'}</h3>
      <div className="chat-tags"><span>{main.code||'Código a confirmar'}</span><span>Índice heurístico {result.indiceHeuristico??'—'}/99</span></div>
      {main.explanation&&<p>{main.explanation}</p>}
      <LegalReference legal={main.legal}/>
      {triageView(result)}
      {result.relatoRevisado&&<WritingReview original={result.termoOriginal} suggested={result.relatoRevisado} aiConfigured={Boolean(ai?.configured)}/>}
      {!!result.secundarias?.length&&<details><summary>Outras hipóteses</summary><p>{result.secundarias.slice(0,4).map(x=>x.officialNature).filter(Boolean).join(' • ')}</p></details>}
      <small>Orientação assistiva, não homologada; confirme natureza, prioridade e informações.</small>
    </div>;
  }
  function resultView(result=analysis){
    if(!result)return <div className="helpnote">O Cérebro utiliza regras de linguagem e palavras-chave. O operador deve confirmar as informações e a natureza conforme o protocolo em vigor.</div>;
    if(result.tipo==='ia'||result.tipo==='local-triage')return <div className="card result-result">{chatAnswer(result)}</div>;
    if(result.tipo==='faq')return <div className="card result-result"><span className="eyebrow">Dúvida operacional</span><h2>{result.titulo}</h2><p style={{whiteSpace:'pre-wrap'}}>{result.resposta}</p></div>;
    if(result.tipo==='indefinido')return <div className="card result-result"><span className="badge">Não conclusivo</span><h2>Natureza não identificada com segurança</h2><p>{result.mensagem}</p></div>;
    const a=result.principal;
    return <div className="card result-result">
      <div className="toolbar"><span className="eyebrow">Sugestão de natureza</span><Tag priority={a.priority}/></div>
      <h2>{a.officialNature}</h2>
      <div className="btn-row"><span className="badge">{a.code}</span><span className="score">Índice heurístico: {result.indiceHeuristico}/99 — não é probabilidade de acerto</span></div>
      <p>{a.explanation}</p>
      <LegalReference legal={a.legal}/>
      <p><b>Termos detectados:</b> {(result.termosDetectados||[]).join(', ')||'—'}</p>
      {triageView(result)}
      {result.relatoRevisado&&<WritingReview original={result.termoOriginal} suggested={result.relatoRevisado} aiConfigured={Boolean(ai?.configured)}/>}
      {!!result.secundarias?.length&&<><h3>Outras hipóteses</h3><p>{result.secundarias.map(x=>x.officialNature).join(' • ')}</p></>}
      <div className="helpnote">A ferramenta não define tipificação, prioridade de despacho ou medidas policiais. Não inclua nomes, endereços completos ou dados sigilosos em relatos de teste.</div>
    </div>;
  }

  if(loading)return <StartupScreen phase={loadingPhase}/>;

  if(!user)return <div className="login-shell">
    <section className="login-art">
      <span className="mark">190</span><span className="eyebrow" style={{color:'#aecbff'}}>CENTRAL DE INTELIGÊNCIA E CONHECIMENTO</span>
      <h1>Conhecimento para decisões mais informadas.</h1>
      <p>Consulte naturezas, analise relatos e esclareça dúvidas com o Chat 190 em uma plataforma com permissões controladas.</p>
      <div className="feature-pills"><span><Icon name="lock"/> Acesso autorizado</span><span><Icon name="brain"/> Triagem de relatos</span><span><Icon name="book"/> Base pesquisável</span><span><Icon name="shield"/> Gestão administrativa</span></div>
      <small style={{color:'#aebfe0'}}>Ambiente de apoio. Classificações e orientações devem ser revisadas e homologadas pela instituição.</small>
    </section>
    <section className="login-form"><div className="login-card">
      <div className="toolbar"><span className="badge">ACESSO À BASE 190</span><Btn className="ghost tiny" onClick={theme}><Icon name={dark?'sun':'moon'} size={17}/>{dark?'Tema claro':'Tema escuro'}</Btn></div>
      <div><h2>{requestMode?'Solicitar acesso':'Bem-vindo de volta'}</h2><p className="muted">{requestMode?'Preencha o pedido. O administrador avaliará o acesso.':'Entre com sua conta previamente autorizada.'}</p></div>
      {notice&&<div className="notice" role="alert">{notice}</div>}{success&&<div className="notice success" role="status">{success}</div>}
      {requestMode?<form className="stack" onSubmit={submitRequest}>
        <div><label htmlFor="reqName">Nome de identificação</label><input id="reqName" autoComplete="name" required value={request.name} onChange={e=>setRequest({...request,name:e.target.value})} placeholder="Seu nome"/></div>
        <div><label htmlFor="reqUser">Usuário desejado</label><input id="reqUser" required minLength={4} pattern="[a-zA-Z0-9._-]+" value={request.username} onChange={e=>setRequest({...request,username:e.target.value})} placeholder="nome.sobrenome"/></div>
        <div><label htmlFor="reqReason">Justificativa (opcional)</label><textarea id="reqReason" maxLength={500} value={request.reason} onChange={e=>setRequest({...request,reason:e.target.value})} placeholder="Motivo do acesso, sem informações sigilosas"/></div>
        <Btn type="submit" disabled={busy} className="full">Enviar solicitação</Btn>
      </form>:<form className="stack" onSubmit={submitLogin}>
        <div><label htmlFor="username">Usuário</label><input id="username" required autoComplete="username" value={login.username} onChange={e=>setLogin({...login,username:e.target.value})} placeholder="Seu usuário"/></div>
        <div><label htmlFor="password">Senha</label><input id="password" type="password" required autoComplete="current-password" value={login.password} onChange={e=>setLogin({...login,password:e.target.value})} placeholder="Digite sua senha"/></div>
        <Btn type="submit" disabled={busy} className="full">{busy?'Verificando…':'Entrar na plataforma →'}</Btn>
      </form>}
      <Btn className="secondary full" onClick={()=>{setRequestMode(!requestMode);clear();}}>{requestMode?'Já possuo acesso — entrar':'Solicitar acesso'}</Btn>
      <div className="divider"/><p className="hint">Acesso individual e autorizado. Entre em contato com o administrador para solicitar ajuda.</p>
    </div></section>
  </div>;

  if(user.mustChangePassword)return <section className="login-form" style={{minHeight:'100vh'}}>
    <form className="login-card card" onSubmit={changePassword}>
      <span className="badge">SEGURANÇA DA CONTA</span><h2>Defina uma nova senha</h2>
      <p className="muted">A credencial inicial é provisória. Para continuar, escolha uma senha exclusiva para esta plataforma.</p>
      {notice&&<div className="notice" role="alert">{notice}</div>}{success&&<div className="notice success" role="status">{success}</div>}
      <div><label htmlFor="old-pass">Senha atual</label><input id="old-pass" type="password" autoComplete="current-password" required value={passwordForm.current} onChange={e=>setPasswordForm({...passwordForm,current:e.target.value})}/></div>
      <div><label htmlFor="new-pass">Nova senha forte</label><input id="new-pass" type="password" autoComplete="new-password" required minLength={12} value={passwordForm.next} onChange={e=>setPasswordForm({...passwordForm,next:e.target.value})}/></div>
      <div><label htmlFor="confirm-pass">Confirme a nova senha</label><input id="confirm-pass" type="password" autoComplete="new-password" required value={passwordForm.confirm} onChange={e=>setPasswordForm({...passwordForm,confirm:e.target.value})}/></div>
      <small>Use 12 ou mais caracteres, maiúsculas, minúsculas, números e símbolo.</small>
      <Btn type="submit" className="full" disabled={busy}>Alterar senha e encerrar sessão</Btn>
      <Btn className="secondary full" onClick={logout}>Sair sem alterar</Btn>
    </form>
  </section>;

  const links=[['home','Visão geral','home'],['docs','Base de conhecimento','book'],['catalog','Catálogo','book'],['chat','Chat 190','brain'],['floor','Gestão de piso','shield'],['quality','Qualidade','audit']];
  const adminLinks=[['editor','Editar textos','edit'],['access','Autorizar acessos','users'],['rules','Regras do assistente','settings'],['audit','Auditoria','audit']];
  return <div className="shell">
    <aside className="sidebar">
      <div className="logo"><div className="logoicon">190</div><div><strong>Base 190</strong><small>CONHECIMENTO OPERACIONAL</small></div></div>
      <span className="nav-caption">CENTRAL</span>
      {links.map(([id,label,icon])=><button key={id} className={'nav-btn '+(screen===id?'active':'')} onClick={()=>go(id)} aria-current={screen===id?'page':undefined}><Icon name={icon}/>{label}</button>)}
      {isAdmin&&<><span className="nav-caption">ADMINISTRAÇÃO</span>{adminLinks.map(([id,label,icon])=><button key={id} className={'nav-btn '+(screen===id?'active':'')} onClick={()=>id==='editor'?editEntry(null):go(id)} aria-current={screen===id?'page':undefined}><Icon name={icon}/>{label}</button>)}</>}
      <div className="sidebar-bottom"><p className="who">{user.name}<br/><small>{user.username} • {isAdmin?'Admin':'Consulta'}</small></p><button className="nav-btn" onClick={logout} disabled={busy}><Icon name="logout"/> Sair</button></div>
    </aside>
    <div className="main">
      <header className="topbar"><div><b>{screen==='docs'?'Base de conhecimento':screen==='home'?'Visão geral':screen==='brain'?'Análise de relatos':screen==='chat'?'Chat 190':screen==='floor'?'Gestão de piso':screen==='quality'?'Qualidade 190':screen==='catalog'?'Catálogo':screen==='detail'?'Ficha operacional':screen==='editor'?'Editor de conteúdo':screen==='access'?'Controle de acesso':screen==='rules'?'Matriz de regras':'Auditoria'}</b><p className="muted">Base de Conhecimento • Ambiente autenticado</p></div>
        <div className="btn-row"><Btn className="ghost tiny" onClick={()=>go('chat')}>Abrir chat 190</Btn><span className="badge">{isAdmin?'Administrador':'Usuário de consulta'}</span><Btn className="ghost tiny" onClick={theme}><Icon name={dark?'sun':'moon'} size={17}/>{dark?'Claro':'Escuro'}</Btn></div>
      </header>
      <main className="content spaced">
        {notice&&<div className="notice" role="alert">{notice}</div>}{success&&<div className="notice success" role="status">{success}</div>}
        {catalogIssue&&<div className="notice" role="alert" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
          <span>{catalogIssue}{catalogDegraded?' Consulta em modo de contingência: não é confirmação de que as alterações do banco estejam sincronizadas.':''}</span>
          <Btn className="secondary tiny" disabled={catalogRefreshing} onClick={()=>{refreshCatalog().catch(err);}}>{catalogRefreshing?'Verificando…':'Tentar novamente'}</Btn>
        </div>}

        {screen==='home'&&<>
          <section className="hero"><div className="hero-orbit" aria-hidden="true"><Icon name="shield" size={114}/></div><span className="eyebrow">CHAT 190 • ASSISTENTE UNIFICADO</span><h1>Clareza para cada atendimento.</h1>
            <p>Descreva uma ocorrência ou faça uma pergunta sobre uma natureza. O Chat 190 consulta o catálogo, explica quando usar cada ficha e sinaliza o que precisa ser confirmado.</p>
            <form className="search-row" onSubmit={analyze}><input value={relato} onChange={e=>setRelato(e.target.value)} aria-label="Relato ou dúvida para análise" placeholder="Ex.: quando usar a natureza de roubo?"/><Btn type="submit" disabled={busy}>Consultar no Chat 190 →</Btn></form>
          </section>
          <div className="grid3"><div className="card stat"><small><Icon name="book"/> Fichas no catálogo</small><strong>{catalogIssue&&!entries.length?'—':entries.length}</strong><span className="badge">{catalogDegraded?'Contingência · somente leitura':'Conhecimento'}</span></div>
            <div className="card stat"><small><Icon name="brain"/> Regras de classificação</small><strong>{catalogIssue&&!totalRules?'—':totalRules}</strong><span className="badge">{catalogDegraded?'Regras locais':'Chat 190'}</span></div>
            <div className="card stat"><small><Icon name="shield"/> Nível de acesso</small><strong style={{fontSize:21}}>{isAdmin?'Administrador':'Consulta'}</strong><span className="badge">Sessão autenticada</span></div></div>
          <section className="domain-section"><div className="panel-head"><div><span className="eyebrow">CONSULTA POR ÁREA</span><h2>Encontre o contexto do atendimento</h2></div><span className="badge">{categories.length-1} áreas</span></div><div className="domain-grid">{categories.filter(c=>c!=='Todas').map(c=><button className="domain-card" key={c} onClick={()=>{setCat(c);setSearch('');setPriorityFilter('Todas');go('catalog');}}><Icon name={categoryIcon(c)} size={24}/><b>{c}</b><small>{entries.filter(e=>e.category===c).length} fichas</small><Icon name="arrow" size={16}/></button>)}</div></section>
          <section><div className="panel-head"><div><h2>Naturezas em destaque</h2><p className="muted">Consulte fichas e orientações existentes</p></div><Btn className="secondary" onClick={()=>go('catalog')}>Ver catálogo →</Btn></div>{entryGrid(entries.slice(0,6))}</section>
          <div className="helpnote">Os exemplos da base não constituem códigos ou protocolos oficiais homologados. É proibido utilizar a ferramenta para inserir dados sigilosos sem autorização institucional.</div>
        </>}

        {docsOpened&&<div hidden={screen!=='docs'}><Documentation onExit={()=>go('home')} isAdmin={isAdmin} active={screen==='docs'}/></div>}
        {screen==='floor'&&<FloorControl isAdmin={isAdmin}/>}
        {screen==='quality'&&<Quality user={user}/>}
        {screen==='catalog'&&<>
          <div className="panel-head"><div><span className="eyebrow">BIBLIOTECA OPERACIONAL</span><h1>Catálogo de naturezas</h1><p className="muted">Busque por título, código, resumo, conteúdo ou palavra-chave.</p></div>{isAdmin&&<Btn onClick={()=>editEntry(null)}><Icon name="plus" size={18}/> Nova ficha</Btn>}</div>
          <div className="card catalog-filters"><div><label htmlFor="search">Pesquisa</label><input id="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Código, natureza, palavra-chave…"/></div><div><label htmlFor="category">Categoria</label><select id="category" value={cat} onChange={e=>setCat(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></div><div><label htmlFor="priority-filter">Prioridade sugerida</label><select id="priority-filter" value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)}>{['Todas','Crítica','Alta','Média','Consulta'].map(v=><option key={v}>{v}</option>)}</select></div></div>
          <p className="catalog-note"><Icon name="shield" size={16}/> Relação COPOM corrigida: 769 naturezas importadas do CSV recebido. IDs NAT são códigos internos desta plataforma; as descrições foram acrescentadas para consulta e dependem de validação institucional.</p><div className="toolbar"><p className="muted">{filtered.length} resultado(s)</p><Btn className="ghost tiny" onClick={()=>{setSearch('');setCat('Todas');setPriorityFilter('Todas');}}>Limpar filtros</Btn></div>
          {filtered.length?<>{entryGrid(filtered.slice(0,catalogLimit))}{filtered.length>catalogLimit&&<div className="toolbar" style={{justifyContent:'center',padding:'18px 0'}}><Btn className="secondary" onClick={()=>setCatalogLimit(v=>v+60)}>Ver mais naturezas ({Math.min(filtered.length-catalogLimit,60)} próximas)</Btn></div>}</>:<div className="card empty-state"><Icon name="search" size={36}/><h2>Nenhuma ficha encontrada</h2><p className="muted">Tente outro termo ou remova os filtros de categoria e prioridade.</p></div>}
        </>}

        {screen==='detail'&&selected&&<section className="card spaced">
          <div className="toolbar"><Btn className="secondary tiny" onClick={()=>go('catalog')}>← Voltar</Btn>{isAdmin&&<Btn onClick={()=>editEntry(selected)}><Icon name="edit" size={17}/> Editar ficha</Btn>}</div>
          <div><div className="btn-row"><span className="badge">{selected.code}</span><Tag priority={selected.priority}/><span className="muted">{selected.category}</span></div><h1 style={{marginTop:12}}>{selected.title}</h1></div>
          <p className="muted">{selected.summary}</p><LegalReference legal={selected.legal}/>{!!selected.triageQuestions?.length&&<details className="triage-panel"><summary>Roteiro completo de triagem ({selected.triageQuestions.length} perguntas)</summary><ul>{selected.triageQuestions.map(q=><li key={q}>{q}</li>)}</ul><small>Na análise de um relato, as perguntas já respondidas são ocultadas automaticamente.</small></details>}<div className="divider"/><pre className="record-detail">{selected.body}</pre>
          <div className="btn-row">{(selected.tags||[]).map(t=><span key={t} className="badge">#{t}</span>)}</div>
          <small>Revisão {selected.revision} • Atualizado em {formatDate(selected.updated_at)} • Validar legislação, código e procedimento antes do uso.</small>
        </section>}

        {screen==='chat'&&<section className="sade-workspace" aria-label="Chat 190 — Inteligência Tática SADE">
          <div className="sade-integrated-notice">
            <Icon name="shield" size={16}/>
            <span>Motor SADE integrado • Triagem local, sem envio a serviços de IA. Utilize somente relatos fictícios ou anonimizados e confirme as sugestões pelo protocolo institucional.</span>
          </div>
          <iframe
            className="sade-embed-frame"
            src="/copom-sade-190.html"
            title="Chat 190 — Assistente de Triagem Inteligente SADE"
            sandbox="allow-scripts"
            allow="clipboard-write"
            referrerPolicy="no-referrer"
            onLoad={(event)=>{
              if(!pendingSadeReport)return;
              event.currentTarget.contentWindow?.postMessage({type:'base190:sade-report',text:pendingSadeReport},'*');
              setPendingSadeReport('');
            }}
          />
        </section>}
        {screen==='brain'&&<>{busy&&<div className="analysis-loading" role="status" aria-live="polite"><span className="analysis-spinner"/><div><strong>Analisando o relato…</strong><p>Reconhecendo fatos, papéis e naturezas diretamente pelo catálogo local. Nenhuma chamada ao Gemini.</p></div></div>}<div className="panel-head"><div><span className="eyebrow">ANÁLISE CONTEXTUAL DE RELATOS</span><h1>Cérebro 190</h1><p className="muted">Motor SADE offline com reconhecimento de papéis, negações, armas e sugestões do catálogo. Gemini é opcional e exclusivo para aprimorar o texto.</p></div><span className="badge">{totalRules} regras</span></div>
          <form className="card spaced" onSubmit={analyze}><div><label htmlFor="brain-input">Relato de teste (sem dados pessoais)</label><textarea id="brain-input" rows={5} value={relato} onChange={e=>setRelato(e.target.value)} placeholder="Descreva o fato observado ou relatado, sem nomes e endereços…"/></div>
            <div className="btn-row"><Btn type="submit" disabled={busy}><Icon name="brain" size={18}/>{busy?'Analisando…':'Analisar relato'}</Btn><Btn className="secondary" onClick={()=>{setRelato('');setAnalysis(null);}}>Limpar</Btn></div></form>
          {resultView()}
          <div className="card"><h3>Exemplos fictícios para teste</h3><div className="btn-row" style={{marginTop:12}}>
            {['Uma mulher está sendo agredida pelo ex-companheiro.','Duas pessoas anunciaram assalto com uma pistola e levaram o celular.','Um indivíduo enviou um falso comprovante de PIX para aplicar um golpe.','Há fumaça e chamas saindo de um apartamento.'].map((t,i)=><Btn className="secondary tiny" key={i} onClick={()=>{setRelato(t);setAnalysis(null);}}>{'Cenário '+(i+1)}</Btn>)}
          </div></div>
        </>}

        {isAdmin&&screen==='editor'&&<>
          <div className="panel-head"><div><span className="eyebrow">ÁREA RESTRITA</span><h1>{editor.id?'Editar ficha':'Publicar nova ficha'}</h1><p className="muted">Somente o administrador principal pode publicar ou alterar conteúdo.</p></div><Btn className="secondary" onClick={()=>go('catalog')}>Ir ao catálogo</Btn></div>
          <div className="card"><label htmlFor="choose-entry">Editar uma ficha já cadastrada</label><select id="choose-entry" value={editor.id||''} onChange={e=>{const item=entries.find(x=>x.id===e.target.value);setEditor(item?{...item}:emptyEntry());setRevisionHistory([]);}}>
            <option value="">— Criar ficha nova —</option>{entries.map(a=><option value={a.id} key={a.id}>{a.code} · {a.title}</option>)}</select></div>
          <form className="card spaced" onSubmit={saveEntry}>
            <div className="grid2"><div><label htmlFor="entry-code">Código</label><input id="entry-code" required value={editor.code} onChange={e=>setEditor({...editor,code:e.target.value})}/></div><div><label htmlFor="entry-name">Título da natureza</label><input id="entry-name" required value={editor.title} onChange={e=>setEditor({...editor,title:e.target.value})}/></div></div>
            <div className="grid2"><div><label htmlFor="entry-category">Categoria</label><input id="entry-category" required value={editor.category} onChange={e=>setEditor({...editor,category:e.target.value})}/></div><div><label htmlFor="entry-priority">Prioridade orientativa</label><select id="entry-priority" value={editor.priority} onChange={e=>setEditor({...editor,priority:e.target.value})}>{['Crítica','Alta','Média','Baixa'].map(x=><option key={x}>{x}</option>)}</select></div></div>
            <div><label htmlFor="entry-summary">Resumo</label><textarea id="entry-summary" required rows={3} value={editor.summary} onChange={e=>setEditor({...editor,summary:e.target.value})}/></div>
            <div><label htmlFor="entry-body">Conteúdo operacional em texto simples</label><textarea id="entry-body" required rows={12} value={editor.body} onChange={e=>setEditor({...editor,body:e.target.value})}/><small>Texto simples é exibido sem executar HTML ou scripts.</small></div>
            <div><label htmlFor="entry-tags">Palavras-chave separadas por vírgula</label><input id="entry-tags" value={(editor.tags||[]).join(', ')} onChange={e=>setEditor({...editor,tags:toEntries(e.target.value)})}/></div>
            <div className="btn-row"><Btn type="submit" disabled={busy}>{busy?'Salvando…':'Salvar publicação'}</Btn>{editor.id&&<Btn className="secondary" onClick={loadHistory}>Ver histórico de revisões</Btn>}</div>
          </form>
          {!!revisionHistory.length&&<div className="card"><h3>Versões anteriores (somente leitura)</h3><div className="stack" style={{marginTop:12}}>{revisionHistory.map((x,i)=><details key={i}><summary>Revisão {x.revision} • {formatDate(x.created_at)}</summary><pre className="record-detail">{x.snapshot.body}</pre></details>)}</div></div>}
        </>}

        {isAdmin&&screen==='access'&&<>
          <div><span className="eyebrow">CONTROLE EXCLUSIVO DE ACESSOS</span><h1>Solicitações e usuários</h1><p className="muted">Aprovação cria somente usuários simples. A conta principal não pode ser rebaixada ou desativada por esta interface.</p></div>
          {credential&&<div className="card spaced" style={{borderColor:'var(--blue)'}}>
            <h3>Credencial provisória — exibição única</h3><p>Usuário: <b>{credential.user}</b></p><div className="secret">{credential.pass}</div>
            <div className="btn-row"><Btn onClick={()=>navigator.clipboard?.writeText(credential.user+'\n'+credential.pass)}>Copiar credencial</Btn><Btn className="secondary" onClick={()=>setCredential(null)}>Ocultar senha</Btn></div>
            <div className="helpnote">Entregue essa credencial ao usuário por canal seguro. Ela não será exibida novamente. Solicite a troca de senha por procedimento administrativo.</div>
          </div>}
          <div className="card"><div className="panel-head"><h2>Solicitações de acesso</h2><span className="badge">{adminRequests.filter(x=>x.status==='pending').length} pendente(s)</span></div>
            <div className="table-scroll"><table><thead><tr><th>Solicitante</th><th>Justificativa</th><th>Data / Situação</th><th>Decisão</th></tr></thead><tbody>
              {adminRequests.map(x=><tr key={x.id}><td><b>{x.display_name}</b><br/><small>{x.username}</small></td><td>{x.reason||'—'}</td><td><small>{formatDate(x.created_at)}</small><br/><span className="badge">{x.status}</span></td><td>{x.status==='pending'?<div className="btn-row"><Btn className="tiny" disabled={busy} onClick={()=>manageRequest(x.id,'approve')}>Aprovar</Btn><Btn className="secondary tiny" disabled={busy} onClick={()=>manageRequest(x.id,'reject')}>Recusar</Btn></div>:'Resolvida'}</td></tr>)}
            </tbody></table></div>
            {!adminRequests.length&&<p className="muted">Nenhuma solicitação até o momento.</p>}
          </div>
          <div className="card"><div className="panel-head"><h2>Contas autorizadas</h2><span className="badge">{adminUsers.length} contas</span></div>
            <div className="table-scroll"><table><thead><tr><th>Usuário</th><th>Perfil</th><th>Estado</th><th>Ações</th></tr></thead><tbody>
              {adminUsers.map(x=><tr key={x.id}><td><b>{x.display_name}</b><br/><small>{x.username}</small></td><td>{x.role==='admin'?'Administrador principal':'Consulta'}</td><td><span className="badge">{x.active?'Ativo':'Bloqueado'}</span></td><td>{x.role==='admin'?'Conta protegida':<div className="btn-row">
                <Btn className="secondary tiny" disabled={busy} onClick={()=>setAccount(x.id,!x.active)}>{x.active?'Bloquear':'Reativar'}</Btn>
                <Btn className="ghost tiny" disabled={busy} onClick={()=>resetPassword(x.id,x.username)}>Redefinir senha</Btn>
              </div>}</td></tr>)}
            </tbody></table></div>
          </div>
        </>}

        {isAdmin&&screen==='rules'&&<>
          <div><span className="eyebrow">MATRIZ SEMÂNTICA</span><h1>Naturezas e regras do assistente</h1><p className="muted">Catálogo de 769 naturezas importadas do CSV. As fichas servem de consulta; o Chat 190 usa correspondências suficientemente claras e respostas programadas. Regras personalizadas continuam sob controle administrativo.</p></div>
          <form className="card spaced" onSubmit={createRule}>
            <h2>Adicionar natureza personalizada</h2>
            <div className="grid2"><div><label>Código da regra</label><input required value={ruleDraft.code} onChange={e=>setRuleDraft({...ruleDraft,code:e.target.value})} placeholder="EX.: TRI-101"/></div>
              <div><label>Nome da natureza</label><input required value={ruleDraft.officialNature} onChange={e=>setRuleDraft({...ruleDraft,officialNature:e.target.value})}/></div></div>
            <div className="grid2"><div><label>Categoria</label><input value={ruleDraft.category} onChange={e=>setRuleDraft({...ruleDraft,category:e.target.value})}/></div>
              <div><label>Prioridade</label><select value={ruleDraft.priority} onChange={e=>setRuleDraft({...ruleDraft,priority:e.target.value})}>{['Crítica','Alta','Média','Baixa'].map(x=><option key={x}>{x}</option>)}</select></div></div>
            <div><label>Grupo de gatilhos obrigatórios (separar por vírgulas)</label><input required value={ruleDraft.group1} onChange={e=>setRuleDraft({...ruleDraft,group1:e.target.value})} placeholder="fraude, golpe, falso"/></div>
            <div><label>Segundo grupo combinado (opcional)</label><input value={ruleDraft.group2} onChange={e=>setRuleDraft({...ruleDraft,group2:e.target.value})} placeholder="pix, banco, transferência"/></div>
            <div><label>Explicação para o operador</label><textarea value={ruleDraft.explanation} onChange={e=>setRuleDraft({...ruleDraft,explanation:e.target.value})}/></div>
            <Btn type="submit" disabled={busy}>＋ Salvar regra no banco</Btn>
          </form>
          <div className="card spaced"><div className="panel-head"><h2>Catálogo e regras visíveis ({totalRules})</h2><span className="badge">{brainRules.custom?.length||0} personalizadas</span></div>
            {brainRules.custom?.map(x=><div key={x.id} className="record-item"><div><b>{x.definition.officialNature}</b><p>{x.definition.code} • {x.definition.category} • Personalizada</p></div><Btn className="danger tiny" onClick={()=>deleteRule(x.id)}>Excluir</Btn></div>)}
            {brainRules.extras?.concat(brainRules.base||[]).slice(0,120).map((x,i)=><div key={x.id||i} className="record-item"><div><b>{x.officialNature}</b><p>{x.code} • {x.category} • Natureza importada</p></div><Tag priority={x.priority}/></div>)}{(brainRules.base?.length||0)>120&&<p className="muted">Exibindo as primeiras 120 naturezas nesta visão. Para consultar todas as 769 com descrição, use o Catálogo.</p>}
          </div>
        </>}

        {isAdmin&&screen==='audit'&&<><div><span className="eyebrow">RASTREABILIDADE</span><h1>Registro de auditoria</h1><p className="muted">Log básico das ações de gestão e autenticação.</p></div><div className="card table-scroll">
          <table><thead><tr><th>Data</th><th>Operador</th><th>Ação</th><th>Alvo</th></tr></thead><tbody>{events.map((a,i)=><tr key={i}><td>{formatDate(a.at)}</td><td>{a.username||'—'}</td><td>{a.action}</td><td>{a.target||'—'}</td></tr>)}</tbody></table>
          {!events.length&&<p className="muted">Nenhum evento registrado.</p>}
        </div></>}
        <footer className="footer-note">Base de Conhecimento 190 • Uso controlado • Classificação automática assistiva, sujeita à revisão e homologação</footer>
      </main>
    </div>
  </div>;
}

