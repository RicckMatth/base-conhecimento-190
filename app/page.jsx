'use client';
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
const REMOTE_CONSENT_KEY='base190.remoteConsent.v2';
const Btn=({children,onClick,className='',disabled=false,type='button'})=><button type={type} className={'btn '+className} disabled={disabled} onClick={onClick}>{children}</button>;
const Tag=({priority})=><span className={'badge '+(priority==='Crítica'?'crit':priority==='Alta'?'high':'')}>{priority||'Média'}</span>;

export default function Home(){
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [user,setUser]=useState(null),[dark,setDark]=useState(false);
  const [notice,setNotice]=useState(''),[success,setSuccess]=useState('');
  const [screen,setScreen]=useState('home'),[requestMode,setRequestMode]=useState(false);
  const [login,setLogin]=useState({username:'',password:''});
  const [passwordForm,setPasswordForm]=useState({current:'',next:'',confirm:''});
  const [request,setRequest]=useState({username:'',name:'',reason:''});
  const [entries,setEntries]=useState([]),[brainRules,setBrainRules]=useState({base:[],extras:[],custom:[]});
  const [search,setSearch]=useState(''),[cat,setCat]=useState('Todas'),[selectedId,setSelectedId]=useState(null);
  const [relato,setRelato]=useState(''),[analysis,setAnalysis]=useState(null);
  const [extensionOnline,setExtensionOnline]=useState(false);
  const [extensionAnalysis,setExtensionAnalysis]=useState(null);
  const [extensionReceivedAt,setExtensionReceivedAt]=useState(null);
  const [remoteEnabled,setRemoteEnabled]=useState(false);
  const [chatMessages,setChatMessages]=useState([]);
  const [chatInput,setChatInput]=useState('');
  const [chatSending,setChatSending]=useState(false);
  const chatBottomRef=useRef(null);
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
    const [catalog,rules]=await Promise.all([call('/entries'),call('/rules')]);
    setEntries(catalog.entries);setBrainRules(rules);
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
      setUser(a.user);
      const [catalog,rules]=await Promise.all([call('/entries'),call('/rules')]);
      if(live){setEntries(catalog.entries);setBrainRules(rules);}
    }catch(e){if(live && !/Sessão ausente|Sessão expirada|não autorizado/i.test(e.message))setNotice(e.message);}
    finally{if(live)setLoading(false);}})();
    return()=>{live=false;};
  },[]);
  // Ponte visual com a extensão: não concede acesso, não solicita credenciais.
  // Os resultados são eventos transitórios no navegador, sem persistência.
  useEffect(()=>{
    if(!user || user.mustChangePassword)return;
    setRemoteEnabled(sessionStorage.getItem(REMOTE_CONSENT_KEY)===String(user.id));
    const ready=()=>setExtensionOnline(true);
    const receive=e=>{
      const payload=e?.detail;
      if(!payload||typeof payload!=='object'||!payload.result||typeof payload.result!=='object')return;
      if(!['classificacao','faq','indefinido'].includes(payload.result.tipo))return;
      setExtensionOnline(true);
      setExtensionAnalysis(payload.result);
      const now=Date.now();
      setExtensionReceivedAt(now);
      setChatMessages(prev=>[...prev.slice(-23),{id:'ext-'+now+'-'+Math.random().toString(36).slice(2),kind:'answer',origin:'Extensão Relato 190',result:payload.result,at:now}]);
      setScreen('extension');
    };
    window.addEventListener('base190:extension-ready',ready);
    window.addEventListener('base190:extension-result',receive);
    window.dispatchEvent(new CustomEvent('base190:extension-discover'));
    return()=>{
      window.removeEventListener('base190:extension-ready',ready);
      window.removeEventListener('base190:extension-result',receive);
    };
  },[user?.id,user?.mustChangePassword]);
  function activateExtension(){
    window.dispatchEvent(new CustomEvent('base190:extension-discover'));
    setScreen('extension');
  }
  function toggleRemote(){
    if(!user||user.mustChangePassword)return;
    if(remoteEnabled){
      sessionStorage.removeItem(REMOTE_CONSENT_KEY);
      setRemoteEnabled(false);
    }else{
      sessionStorage.setItem(REMOTE_CONSENT_KEY,String(user.id));
      setRemoteEnabled(true);
    }
    window.dispatchEvent(new CustomEvent('base190:remote-authorization-changed'));
  }
  useEffect(()=>{
    if(screen==='extension'&&chatBottomRef.current){
      chatBottomRef.current.scrollIntoView({behavior:'smooth',block:'end'});
    }
  },[chatMessages.length,screen]);
  async function sendChat(event){
    event.preventDefault();
    const text=chatInput.trim();
    if(chatSending||text.length<3||text.length>8000)return;
    const stamp=Date.now();setChatInput('');
    setChatMessages(prev=>[...prev.slice(-23),{id:'user-'+stamp,kind:'user',text,at:stamp}]);
    setChatSending(true);
    try{
      const reply=await call('/analyze',{method:'POST',body:body({text})});
      const now=Date.now();
      setChatMessages(prev=>[...prev.slice(-23),{id:'answer-'+now,kind:'answer',origin:'Cérebro 190',result:reply.result,at:now}]);
      window.dispatchEvent(new CustomEvent('base190:site-analysis',{detail:{result:reply.result,disclaimer:reply.disclaimer}}));
    }catch(error){
      setChatMessages(prev=>[...prev.slice(-23),{id:'error-'+Date.now(),kind:'error',text:error.message||'Falha na análise.',at:Date.now()}]);
    }finally{setChatSending(false);}
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
      sessionStorage.removeItem(REMOTE_CONSENT_KEY);setRemoteEnabled(false);
      setUser(null);setPasswordForm({current:'',next:'',confirm:''});ok(x.message);
    }catch(e){err(e);}finally{setBusy(false);}
  }
  async function logout(){
    sessionStorage.removeItem(REMOTE_CONSENT_KEY);setRemoteEnabled(false);
    setBusy(true);try{await call('/auth/logout',{method:'POST',body:'{}'});}catch(e){err(e);}
    setUser(null);setScreen('home');setEntries([]);setBrainRules({base:[],extras:[],custom:[]});setBusy(false);setCredential(null);
    setExtensionOnline(false);setExtensionAnalysis(null);setExtensionReceivedAt(null);setChatMessages([]);setChatInput('');
  }
  async function go(next){
    clear();setScreen(next);setCredential(null);
    if(next==='access'){try{await refreshAdmin();}catch(e){err(e);}}
    if(next==='audit'){try{const x=await call('/admin/audit');setEvents(x.events);}catch(e){err(e);}}
    if(next==='rules'){try{const x=await call('/rules');setBrainRules(x);}catch(e){err(e);}}
  }
  async function analyze(e){
    e?.preventDefault?.();clear();if(relato.trim().length<3)return err(new Error('Informe o relato para análise.'));
    setBusy(true);try{const x=await call('/analyze',{method:'POST',body:body({text:relato})});
      setAnalysis(x.result);setScreen('brain');
      // Resultado somente para visualização na extensão instalada (sem preenchimento ou envio automático).
      window.dispatchEvent(new CustomEvent('base190:site-analysis',{detail:{result:x.result,disclaimer:x.disclaimer}}));
    }
    catch(e){err(e);}finally{setBusy(false);}
  }
  function openEntry(id){setSelectedId(id);go('detail');}
  const selected=entries.find(e=>e.id===selectedId);
  const categories=useMemo(()=>['Todas',...new Set(entries.map(e=>e.category))], [entries]);
  const filtered=useMemo(()=>entries.filter(e=>(cat==='Todas'||e.category===cat)&&
    (!search.trim()||[e.title,e.code,e.category,e.summary,e.body,...(e.tags||[])].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
      .includes(search.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()))),[entries,cat,search]);
  const totalRules=(brainRules.base?.length||0)+(brainRules.extras?.length||0)+(brainRules.custom?.length||0);
  function editEntry(entry){setEditor(entry?{...entry,tags:entry.tags||[]}:emptyEntry());setRevisionHistory([]);go('editor');}
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
      setRuleDraft({code:'',officialNature:'',category:'Proteção',priority:'Média',group1:'',group2:'',explanation:''});ok('Nova regra adicionada ao Cérebro 190.');
    }catch(e){err(e);}finally{setBusy(false);}
  }
  async function deleteRule(id){
    if(!window.confirm('Excluir esta regra personalizada?'))return;
    clear();try{await call('/admin/rules',{method:'DELETE',body:body({id})});setBrainRules(await call('/rules'));ok('Regra excluída.');}
    catch(e){err(e);}
  }
  function entryGrid(items){return <div className="cards">{items.map(a=><button key={a.id} className="record-card" onClick={()=>openEntry(a.id)}>
    <div className="toolbar"><span className="badge">{a.code}</span><Tag priority={a.priority}/></div>
    <h3>{a.title}</h3><p>{a.summary}</p>
    <div className="end"><small>{a.category}</small><b style={{color:'var(--blue)'}}>Abrir →</b></div>
  </button>)}</div>}
  function chatAnswer(result){
    if(!result)return <p>Sem resposta da Base 190.</p>;
    if(result.tipo==='faq')return <div className="chat-answer"><b>{result.titulo||'Orientação'}</b><p>{result.resposta}</p></div>;
    if(result.tipo!=='classificacao')return <div className="chat-answer"><b>Análise não conclusiva</b><p>{result.mensagem||'Verifique o relato e consulte os procedimentos oficiais.'}</p></div>;
    const main=result.principal||{};
    return <div className="chat-answer">
      <div className="chat-answer-title"><span>Natureza sugerida</span><Tag priority={main.priority}/></div>
      <h3>{main.officialNature||'Não identificada'}</h3>
      <div className="chat-tags"><span>{main.code||'Código a confirmar'}</span><span>Índice heurístico {result.indiceHeuristico??'—'}/99</span></div>
      {main.explanation&&<p>{main.explanation}</p>}
      {!!main.triageQuestions?.length&&<details><summary>Perguntas de triagem ({main.triageQuestions.length})</summary><ul>{main.triageQuestions.map((q,i)=><li key={i}>{q}</li>)}</ul></details>}
      {result.relatoRevisado&&<details><summary>Reformulação sugerida — conferir fatos</summary><p className="chat-rewrite">{result.relatoRevisado}</p><Btn className="secondary tiny" onClick={()=>navigator.clipboard?.writeText(result.relatoRevisado)}>Copiar texto</Btn></details>}
      {!!result.secundarias?.length&&<details><summary>Outras hipóteses</summary><p>{result.secundarias.slice(0,4).map(x=>x.officialNature).filter(Boolean).join(' • ')}</p></details>}
      <small>Orientação assistiva, não homologada; confirme natureza, prioridade e informações.</small>
    </div>;
  }
  function resultView(result=analysis){
    if(!result)return <div className="helpnote">O Cérebro utiliza regras de linguagem e palavras-chave. O operador deve confirmar as informações e a natureza conforme o protocolo em vigor.</div>;
    if(result.tipo==='faq')return <div className="card result-result"><span className="eyebrow">Dúvida operacional</span><h2>{result.titulo}</h2><p style={{whiteSpace:'pre-wrap'}}>{result.resposta}</p></div>;
    if(result.tipo==='indefinido')return <div className="card result-result"><span className="badge">Não conclusivo</span><h2>Natureza não identificada com segurança</h2><p>{result.mensagem}</p></div>;
    const a=result.principal;
    return <div className="card result-result">
      <div className="toolbar"><span className="eyebrow">Sugestão de natureza</span><Tag priority={a.priority}/></div>
      <h2>{a.officialNature}</h2>
      <div className="btn-row"><span className="badge">{a.code}</span><span className="score">Índice heurístico: {result.indiceHeuristico}/99 — não é probabilidade de acerto</span></div>
      <p>{a.explanation}</p>
      <p><b>Termos detectados:</b> {(result.termosDetectados||[]).join(', ')||'—'}</p>
      {!!a.triageQuestions?.length&&<><h3>Perguntas de triagem sugeridas</h3><ul>{a.triageQuestions.map((q,i)=><li key={i}>{q}</li>)}</ul></>}
      {result.relatoRevisado&&<><h3>Reformulação automática — revisar antes de utilizar</h3><pre>{result.relatoRevisado}</pre><Btn className="secondary" onClick={()=>navigator.clipboard?.writeText(result.relatoRevisado)}>Copiar reformulação</Btn></>}
      {!!result.secundarias?.length&&<><h3>Outras hipóteses</h3><p>{result.secundarias.map(x=>x.officialNature).join(' • ')}</p></>}
      <div className="helpnote">A ferramenta não define tipificação, prioridade de despacho ou medidas policiais. Não inclua nomes, endereços completos ou dados sigilosos em relatos de teste.</div>
    </div>;
  }

  if(loading)return <main className="login-form" style={{minHeight:'100vh'}}><div className="card"><h2>Base 190</h2><p>Iniciando conexão segura…</p></div></main>;

  if(!user)return <div className="login-shell">
    <section className="login-art">
      <span className="mark">190</span><span className="eyebrow" style={{color:'#aecbff'}}>CENTRAL DE INTELIGÊNCIA E CONHECIMENTO</span>
      <h1>Conhecimento para decisões mais informadas.</h1>
      <p>Consulte naturezas, analise relatos com o Cérebro 190 e acesse protocolos orientativos em uma plataforma com permissões controladas.</p>
      <div className="feature-pills"><span>🔐 Acesso autorizado</span><span>🧠 Triagem de relatos</span><span>📚 Base pesquisável</span><span>🛡️ Gestão administrativa</span></div>
      <small style={{color:'#aebfe0'}}>Ambiente de apoio. Classificações e orientações devem ser revisadas e homologadas pela instituição.</small>
    </section>
    <section className="login-form"><div className="login-card">
      <div className="toolbar"><span className="badge">BASE 190 • NODE.JS</span><Btn className="ghost tiny" onClick={theme}>{dark?'☀ Tema claro':'☾ Tema escuro'}</Btn></div>
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
      <div className="divider"/><p className="hint">Sessões protegidas por cookie HttpOnly. Alterações e autorizações são verificadas no servidor.</p>
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

  const links=[['home','◈ Início'],['catalog','▤ Catálogo'],['brain','✳ Cérebro 190'],['extension','⇄ Integração 190']];
  const adminLinks=[['editor','✎ Editar textos'],['access','♙ Autorizar acessos'],['rules','⚙ Regras do Cérebro'],['audit','◎ Auditoria']];
  return <div className="shell">
    <aside className="sidebar">
      <div className="logo"><div className="logoicon">190</div><div><strong>Base 190</strong><small>CONHECIMENTO OPERACIONAL</small></div></div>
      <span className="nav-caption">CENTRAL</span>
      {links.map(([id,label])=><button key={id} className={'nav-btn '+(screen===id?'active':'')} onClick={()=>go(id)}>{label}</button>)}
      {isAdmin&&<><span className="nav-caption">ADMINISTRAÇÃO</span>{adminLinks.map(([id,label])=><button key={id} className={'nav-btn '+(screen===id?'active':'')} onClick={()=>id==='editor'?editEntry(null):go(id)}>{label}</button>)}</>}
      <div className="sidebar-bottom"><p className="who">{user.name}<br/><small>{user.username} • {isAdmin?'Admin':'Consulta'}</small></p><button className="nav-btn" onClick={logout} disabled={busy}>↪ Sair</button></div>
    </aside>
    <div className="main">
      <header className="topbar"><div><b>{screen==='home'?'Visão geral':screen==='brain'?'Análise de relatos':screen==='extension'?'Extensão integrada':screen==='catalog'?'Catálogo':screen==='detail'?'Ficha operacional':screen==='editor'?'Editor de conteúdo':screen==='access'?'Controle de acesso':screen==='rules'?'Matriz de regras':'Auditoria'}</b><p className="muted">Base de Conhecimento • Ambiente autenticado</p></div>
        <div className="btn-row"><button className="btn ghost tiny" onClick={activateExtension} type="button">{extensionOnline?'● Extensão conectada':'Abrir chat integrado'}</button><span className="badge">{isAdmin?'Administrador':'Usuário de consulta'}</span><Btn className="ghost tiny" onClick={theme}>{dark?'☀ Claro':'☾ Escuro'}</Btn></div>
      </header>
      <main className="content spaced">
        {notice&&<div className="notice" role="alert">{notice}</div>}{success&&<div className="notice success" role="status">{success}</div>}

        {screen==='home'&&<>
          <section className="hero"><span className="eyebrow">CÉREBRO 190 • TRIAGEM ORIENTATIVA</span><h1>O conhecimento certo, no momento de consultar.</h1>
            <p>Pesquise uma natureza ou descreva um cenário fictício para obter sugestões de triagem, máscaras e classificações que exigem validação humana.</p>
            <form className="search-row" onSubmit={analyze}><input value={relato} onChange={e=>setRelato(e.target.value)} aria-label="Relato para análise" placeholder="Ex.: dois indivíduos roubaram o celular mediante ameaça"/><Btn type="submit" disabled={busy}>Analisar relato →</Btn></form>
          </section>
          <div className="card extension-status">
            <div className="toolbar">
              <div><span className="eyebrow">EXTENSÃO RELATO 190 • TESTE</span>
                <h3 style={{marginTop:5}}>Integração automática com o Chrome</h3>
                <p className="muted">{extensionOnline?'Extensão detectada neste navegador. Resultados serão exibidos nos dois painéis.':'Instale a versão integrada e recarregue esta página para detectar automaticamente.'}</p>
              </div>
              <Btn className="secondary" onClick={activateExtension}>Abrir chat →</Btn>
            </div>
          </div>
          <div className="grid3"><div className="card stat"><small>Fichas no catálogo</small><strong>{entries.length}</strong><span className="badge">Conhecimento</span></div>
            <div className="card stat"><small>Regras de classificação</small><strong>{totalRules}</strong><span className="badge">Cérebro 190</span></div>
            <div className="card stat"><small>Nível de acesso</small><strong style={{fontSize:21}}>{isAdmin?'Administrador':'Consulta'}</strong><span className="badge">Sessão autenticada</span></div></div>
          <section><div className="panel-head"><div><h2>Naturezas em destaque</h2><p className="muted">Consulte fichas e orientações existentes</p></div><Btn className="secondary" onClick={()=>go('catalog')}>Ver catálogo →</Btn></div>{entryGrid(entries.slice(0,6))}</section>
          <div className="helpnote">Os exemplos da base não constituem códigos ou protocolos oficiais homologados. É proibido utilizar a ferramenta para inserir dados sigilosos sem autorização institucional.</div>
        </>}

        {screen==='catalog'&&<>
          <div className="panel-head"><div><span className="eyebrow">BIBLIOTECA OPERACIONAL</span><h1>Catálogo de naturezas</h1><p className="muted">Busque por título, código, resumo, conteúdo ou palavra-chave.</p></div>{isAdmin&&<Btn onClick={()=>editEntry(null)}>＋ Nova ficha</Btn>}</div>
          <div className="card grid2"><div><label htmlFor="search">Pesquisa</label><input id="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Código, natureza, palavra-chave…"/></div><div><label htmlFor="category">Categoria</label><select id="category" value={cat} onChange={e=>setCat(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></div></div>
          <div className="toolbar"><p className="muted">{filtered.length} resultado(s)</p><Btn className="ghost tiny" onClick={()=>{setSearch('');setCat('Todas');}}>Limpar filtros</Btn></div>
          {filtered.length?entryGrid(filtered):<div className="card">Nenhum resultado para os filtros escolhidos.</div>}
        </>}

        {screen==='detail'&&selected&&<section className="card spaced">
          <div className="toolbar"><Btn className="secondary tiny" onClick={()=>go('catalog')}>← Voltar</Btn>{isAdmin&&<Btn onClick={()=>editEntry(selected)}>✎ Editar ficha</Btn>}</div>
          <div><div className="btn-row"><span className="badge">{selected.code}</span><Tag priority={selected.priority}/><span className="muted">{selected.category}</span></div><h1 style={{marginTop:12}}>{selected.title}</h1></div>
          <p className="muted">{selected.summary}</p><div className="divider"/><pre className="record-detail">{selected.body}</pre>
          <div className="btn-row">{(selected.tags||[]).map(t=><span key={t} className="badge">#{t}</span>)}</div>
          <small>Revisão {selected.revision} • Atualizado em {formatDate(selected.updated_at)} • Validar legislação, código e procedimento antes do uso.</small>
        </section>}

        {screen==='extension'&&<section className="integrated-chat">
          <div className="chat-main">
            <header className="chat-head">
              <div className="chat-ident"><span className="chat-avatar">✳</span><div><b>Chat da Base 190</b><small>Extensão integrada · assistência contextual</small></div></div>
              <div className="chat-head-actions"><span className={'chat-pill '+(extensionOnline?'connected':'')}>{extensionOnline?'● Extensão detectada':'○ Extensão ausente'}</span>
                <Btn className="ghost tiny" onClick={()=>setChatMessages([])}>Limpar chat</Btn></div>
            </header>
            <div className="chat-stream" role="log" aria-label="Conversa de análises da integração">
              <div className="chat-bubble-system"><b>Olá! Este é o seu espaço de análise.</b><p>Ao receber um relato da extensão, o chat abrirá automaticamente e mostrará a natureza sugerida, detalhes e perguntas de triagem. Você também pode digitar uma situação fictícia abaixo.</p></div>
              {chatMessages.map(m=><div className={'chat-message '+(m.kind==='user'?'from-user':'from-system')} key={m.id}>
                {m.kind!=='user'&&<span className="chat-message-avatar">190</span>}
                <div className="chat-bubble">
                  <div className="chat-message-meta"><b>{m.kind==='user'?'Você':m.origin||'Sistema'}</b><span>{new Date(m.at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span></div>
                  {m.kind==='answer'?chatAnswer(m.result):<p>{m.text}</p>}
                </div>
              </div>)}
              {chatSending&&<div className="chat-typing">✳ Cérebro 190 analisando…</div>}
              <div ref={chatBottomRef} aria-hidden="true"/>
            </div>
            <div className="chat-compose">
              <form onSubmit={sendChat}>
                <label htmlFor="chat-input" className="sr-only">Descreva um relato fictício para análise</label>
                <textarea id="chat-input" rows={2} maxLength={8000} value={chatInput} onChange={e=>setChatInput(e.target.value)}
                  placeholder="Descreva uma situação fictícia para análise…" onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit();}}}/>
                <Btn type="submit" disabled={chatSending||chatInput.trim().length<3} className="chat-send">{chatSending?'…':'Enviar ↗'}</Btn>
              </form>
              <small>Chat temporário na aba · HTTPS (TLS) · não inserir informações reais ou sigilosas sem autorização</small>
            </div>
          </div>
          <aside className="chat-side">
            <div className="chat-side-top"><span className="eyebrow">CENTRAL DE INTEGRAÇÃO</span><h2>Conexão remota</h2>
              <p>A extensão já é reconhecida automaticamente. Controle aqui quando ela poderá enviar relatos para análise.</p></div>
            <div className={'chat-connection '+(remoteEnabled?'is-on':'')}><span className="chat-connection-dot"/><div><b>{remoteEnabled?'Transmissão autorizada':'Aguardando autorização'}</b><small>{remoteEnabled?'Apenas nesta aba e nesta sessão':'Nenhum envio automático permitido'}</small></div></div>
            <Btn className={remoteEnabled?'secondary full':'full'} onClick={toggleRemote}>{remoteEnabled?'Revogar autorização':'Autorizar conexão remota'}</Btn>
            <p className="chat-small">Ao autorizar, o texto principal do relato poderá ser enviado automaticamente ao servidor da Base 190 enquanto esta aba estiver aberta e sua sessão estiver válida. A extensão não enviará os demais campos separadamente.</p>
            <div className="divider"/>
            <h3>Como funciona</h3>
            <div className="chat-steps"><span><b>01</b> Abra o SADE/simulador</span><span><b>02</b> Digite ou edite o relato</span><span><b>03</b> Receba a análise neste chat</span></div>
            <div className="divider"/>
            <div className="chat-privacy"><b>Segurança da conexão</b><p>A comunicação utiliza HTTPS com TLS e sessão HttpOnly validada no servidor. Não equivale a criptografia ponta a ponta. Você pode revogar a autorização a qualquer momento.</p></div>
            {!extensionOnline&&<a className="chat-download" href="https://github.com/RicckMatth/190-extensao_integrada/archive/refs/heads/main.zip" target="_blank" rel="noopener noreferrer">Baixar extensão de teste ↗</a>}
          </aside>
        </section>}
        {screen==='brain'&&<><div className="panel-head"><div><span className="eyebrow">ANÁLISE CONTEXTUAL DE RELATOS</span><h1>Cérebro 190</h1><p className="muted">Reconhecimento de palavras-chave e contexto, com hipóteses de natureza e perguntas de triagem.</p></div><span className="badge">{totalRules} regras</span></div>
          <form className="card spaced" onSubmit={analyze}><div><label htmlFor="brain-input">Relato de teste (sem dados pessoais)</label><textarea id="brain-input" rows={5} value={relato} onChange={e=>setRelato(e.target.value)} placeholder="Descreva o fato observado ou relatado, sem nomes e endereços…"/></div>
            <div className="btn-row"><Btn type="submit" disabled={busy}>{busy?'Analisando…':'✳ Analisar relato'}</Btn><Btn className="secondary" onClick={()=>{setRelato('');setAnalysis(null);}}>Limpar</Btn></div></form>
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
          <div><span className="eyebrow">MATRIZ SEMÂNTICA</span><h1>Regras de reconhecimento</h1><p className="muted">Amplie os cenários reconhecidos sem alterar o código-fonte. As alterações são armazenadas no servidor.</p></div>
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
          <div className="card spaced"><div className="panel-head"><h2>Regras ativas ({totalRules})</h2><span className="badge">{brainRules.custom?.length||0} personalizadas</span></div>
            {brainRules.custom?.map(x=><div key={x.id} className="record-item"><div><b>{x.definition.officialNature}</b><p>{x.definition.code} • {x.definition.category} • Personalizada</p></div><Btn className="danger tiny" onClick={()=>deleteRule(x.id)}>Excluir</Btn></div>)}
            {brainRules.extras?.concat(brainRules.base||[]).map((x,i)=><div key={x.id||i} className="record-item"><div><b>{x.officialNature}</b><p>{x.code} • {x.category} • Regra de sistema</p></div><Tag priority={x.priority}/></div>)}
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
