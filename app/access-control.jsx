'use client';
import {useEffect,useMemo,useState} from 'react';

const ROLES=[
  {value:'attendant',label:'Atendente'},
  {value:'manager',label:'Gestor / Supervisor'},
  {value:'quality_analyst',label:'Analista de Qualidade'},
  {value:'coordinator',label:'Coordenador'}
];
const LABELS=Object.fromEntries([...ROLES,{value:'dev',label:'Dev'}].map(item=>[item.value,item.label]));
const formatDate=value=>value?new Date(value).toLocaleString('pt-BR'):'—';
const dateLabel=value=>formatDate(value);
async function api(path='',method='GET',body){
  const response=await fetch('/api/management/access'+path,{method,credentials:'same-origin',
    headers:body?{'Content-Type':'application/json'}:undefined,
    body:body?JSON.stringify(body):undefined,cache:'no-store'});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error||'Não foi possível executar a operação.');
  return result;
}
function Status({active}){return <span className={'ac-status '+(active?'enabled':'disabled')}><i/>{active?'Ativo':'Bloqueado'}</span>;}
function Role({role}){return <span className={'ac-role '+(role||'attendant')}>{LABELS[role]||'Atendente'}</span>;}

export default function AccessControl({currentUser,onStateChange=null}){
  const [dataset,setDataset]=useState({users:[],requests:[],permission:''});
  const [tab,setTab]=useState('users');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  const [credential,setCredential]=useState(null);
  const [roleDraft,setRoleDraft]=useState({});
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('all');
  const [showCreate,setShowCreate]=useState(false);
  const [form,setForm]=useState({name:'',username:'',role:'attendant'});

  async function refresh(){
    const result=await api();
    setDataset(result);
    setRoleDraft({});
    return result;
  }
  useEffect(()=>{
    let live=true;
    api().then(result=>{if(live){setDataset(result);setRoleDraft({});}})
      .catch(err=>{if(live)setError(err.message);})
      .finally(()=>{if(live)setLoading(false);});
    return ()=>{live=false;};
  },[]);
  const permission=dataset.permission||currentUser?.operationalRole||'attendant';
  const options=ROLES.filter(role=>permission==='dev'||role.value!=='coordinator');
  const users=dataset.users||[];
  const requests=dataset.requests||[];
  const pending=requests.filter(item=>item.status==='pending');
  const activeCount=users.filter(item=>item.active).length;
  const allowedToManage=person=>person.role!=='admin'&&person.operational_role!=='dev'&&
    person.id!==currentUser?.id&&(permission==='dev'||person.operational_role!=='coordinator');
  const matchingUsers=useMemo(()=>users.filter(person=>{
    const matchesText=[person.username,person.display_name,LABELS[person.operational_role]].join(' ').toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR').trim());
    return matchesText&&(filter==='all'||filter==='active'&&person.active||filter==='blocked'&&!person.active||filter===person.operational_role);
  }),[users,search,filter]);

  useEffect(()=>{
    if(typeof onStateChange==='function'){
      onStateChange({tab,setTab,usersCount:users.length,pendingCount:pending.length,busy});
    }
  },[tab,users.length,pending.length,busy,onStateChange]);

  async function mutate(key,path,method,payload,confirmation){
    if(confirmation&&!window.confirm(confirmation))return;
    setBusy(key);setError('');setSuccess('');
    try{
      const result=await api(path,method,payload);
      if(result.temporaryPassword)setCredential({username:result.username||'',password:result.temporaryPassword});
      if(key==='create'){setShowCreate(false);setForm({name:'',username:'',role:'attendant'});}
      await refresh();
      setSuccess(result.message||'Alteração salva.');
    }catch(err){setError(err.message);}
    finally{setBusy('');}
  }
  function approve(item,decision){
    const selectedRole=roleDraft[item.id]||'attendant';
    mutate('request-'+item.id,'/requests','POST',
      {id:item.id,action:decision,role:selectedRole},
      decision==='reject'?'Recusar esta solicitação de acesso?':undefined);
  }
  function updateRole(person){
    const selectedRole=roleDraft[person.id]||person.operational_role;
    if(selectedRole===person.operational_role)return;
    mutate('user-'+person.id,'/users','PATCH',{id:person.id,action:'role',role:selectedRole},
      'Alterar o cargo de '+person.display_name+' para '+LABELS[selectedRole]+'? A sessão atual desse usuário será encerrada.');
  }
  function updateStatus(person){
    mutate('user-'+person.id,'/users','PATCH',{id:person.id,action:'status',active:!person.active},
      person.active?'Bloquear o acesso de '+person.display_name+' e encerrar as sessões?':'Reativar o acesso de '+person.display_name+'?');
  }
  function resetPassword(person){
    mutate('user-'+person.id,'/users','PATCH',{id:person.id,action:'reset'},
      'Redefinir a senha de '+person.display_name+'? Uma credencial provisória será gerada.');
  }
  function submitNewUser(event){
    event.preventDefault();
    mutate('create','/users','POST',form);
  }
  return <div className="ac-panel">
    <div className="ac-hero">
      <div className="ac-hero-left">
        <span className="ac-overline"><span className="ac-live-dot"/> ADMINISTRAÇÃO CENTRAL · COPOM 190</span>
        <h1>Acessos <span>&</span> Cargos</h1>
        <p>Gerencie quem entra na plataforma e qual função cada profissional exerce. Todas as alterações são registradas e validadas pelo servidor.</p>
        <div className="ac-permission">Seu cargo: <strong>{LABELS[permission]||permission}</strong><span>·</span> Controle restrito a Coordenador e Dev</div>
      </div>
      <button type="button" className="ac-btn ac-btn-hero" onClick={()=>{setShowCreate(true);setTab('users');}} disabled={loading}>+ Novo usuário</button>
    </div>

    {loading?<div className="ac-card ac-loading" role="status">Consultando acessos e solicitações…</div>:<>
      <div className="ac-stats">
        <div className="ac-stat"><small>Contas cadastradas</small><strong>{users.length}</strong><span>Total de profissionais</span></div>
        <div className="ac-stat"><small>Acessos ativos</small><strong>{activeCount}</strong><span>Contas habilitadas</span></div>
        <div className="ac-stat"><small>Solicitações pendentes</small><strong>{pending.length}</strong><span>Aguardando uma decisão</span></div>
        <div className="ac-stat"><small>Coordenadores</small><strong>{users.filter(x=>x.operational_role==='coordinator').length}</strong><span>Equipe de coordenação</span></div>
      </div>
      {error&&<div className="ac-alert ac-error" role="alert">{error}<button type="button" onClick={()=>setError('')}>Fechar</button></div>}
      {success&&<div className="ac-alert ac-success" role="status">{success}<button type="button" onClick={()=>setSuccess('')}>Fechar</button></div>}
      {credential&&<div className="ac-card ac-credential">
        <div><span className="ac-section-kicker">CREDENCIAL DE PRIMEIRO ACESSO</span><h2>Senha provisória gerada</h2><p>Exibida apenas agora. Envie por canal seguro e oriente a troca obrigatória da senha no primeiro login.</p></div>
        <div className="ac-secret"><span>Usuário: <b>{credential.username}</b></span><code>{credential.password}</code></div>
        <div className="ac-actions">
          <button className="ac-btn ac-btn-primary" type="button" onClick={()=>navigator.clipboard?.writeText(credential.username+'\n'+credential.password)}>Copiar credenciais</button>
          <button className="ac-btn ac-btn-muted" type="button" onClick={()=>setCredential(null)}>Ocultar senha</button>
        </div>
      </div>}
      <div className="ac-tabbar" role="tablist" aria-label="Seções de administração de acessos">
        <button role="tab" aria-selected={tab==='users'} className={tab==='users'?'active':''} onClick={()=>setTab('users')}>Profissionais <span>{users.length}</span></button>
        <button role="tab" aria-selected={tab==='requests'} className={tab==='requests'?'active':''} onClick={()=>setTab('requests')}>Solicitações <span>{pending.length}</span></button>
        <button className="ac-refresh" type="button" disabled={Boolean(busy)} onClick={()=>{setError('');refresh().catch(e=>setError(e.message));}}>↻ Atualizar</button>
      </div>

      {tab==='users'&&<section className="ac-card" aria-label="Profissionais e cargos">
        <div className="ac-head"><div><span className="ac-section-kicker">EQUIPE CADASTRADA</span><h2>Profissionais e permissões</h2><p>Altere cargos, bloqueie acessos ou gere novas senhas provisórias.</p></div></div>
        <div className="ac-filters">
          <label className="ac-search"><span>Buscar profissional</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nome ou usuário…"/></label>
          <label><span>Filtrar por</span><select value={filter} onChange={e=>setFilter(e.target.value)}>
            <option value="all">Todos os profissionais</option><option value="active">Somente ativos</option><option value="blocked">Somente bloqueados</option>
            {[...ROLES,{value:'dev',label:'Dev'}].map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
          </select></label>
        </div>
        <div className="ac-table-scroll">
          <table className="ac-table"><thead><tr><th>Profissional</th><th>Cargo atual</th><th>Situação</th><th>Gerenciar cargo</th><th>Ações</th></tr></thead>
            <tbody>{matchingUsers.map(person=>{
              const available=allowedToManage(person);
              const chosen=roleDraft[person.id]||person.operational_role;
              return <tr key={person.id}><td><div className="ac-person"><span className="ac-avatar">{(person.display_name||person.username).trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()}</span><span><b>{person.display_name}</b><small>@{person.username}</small></span></div></td>
                <td><Role role={person.operational_role}/></td><td><Status active={person.active}/></td>
                <td>{available?<div className="ac-role-edit"><select aria-label={'Novo cargo para '+person.display_name} value={chosen} disabled={Boolean(busy)} onChange={e=>setRoleDraft(d=>({...d,[person.id]:e.target.value}))}>{options.map(role=><option key={role.value} value={role.value}>{role.label}</option>)}</select>
                  <button className="ac-btn ac-btn-small ac-btn-primary" type="button" disabled={Boolean(busy)||chosen===person.operational_role} onClick={()=>updateRole(person)}>Salvar</button></div>:<span className="ac-protected">Cargo protegido</span>}</td>
                <td>{available?<div className="ac-actions ac-actions-inline"><button type="button" className="ac-btn ac-btn-small ac-btn-muted" disabled={Boolean(busy)} onClick={()=>updateStatus(person)}>{person.active?'Bloquear':'Reativar'}</button><button type="button" className="ac-btn ac-btn-small ac-btn-muted" disabled={Boolean(busy)} onClick={()=>resetPassword(person)}>Nova senha</button></div>:<small>Somente consulta</small>}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        {!matchingUsers.length&&<div className="ac-empty">Nenhum profissional encontrado para os filtros informados.</div>}
        <div className="ac-footnote">Dev é reservado à conta principal. Coordenadores podem administrar cargos inferiores; a atribuição de Coordenador é exclusiva de Dev. Alterações de cargo encerram a sessão anterior do usuário.</div>
      </section>}

      {tab==='requests'&&<section className="ac-card" aria-label="Solicitações de acesso">
        <div className="ac-head"><div><span className="ac-section-kicker">ENTRADAS NA PLATAFORMA</span><h2>Solicitações de acesso</h2><p>Aprovações criam uma conta com senha provisória e cargo definido.</p></div><span className="ac-count">{pending.length} pendente(s)</span></div>
        {!requests.length&&<div className="ac-empty">Nenhuma solicitação recebida até agora.</div>}
        <div className="ac-requests">
          {requests.map(item=><div key={item.id} className={'ac-request '+(item.status==='pending'?'pending':'settled')}>
            <div className="ac-request-main"><div className="ac-person"><span className="ac-avatar">{(item.display_name||item.username)[0]?.toUpperCase()}</span><span><b>{item.display_name}</b><small>@{item.username} · {dateLabel(item.created_at)}</small></span></div><p>{item.reason||'Sem justificativa informada.'}</p></div>
            {item.status==='pending'?<div className="ac-request-ops"><label>Definir cargo<select aria-label={'Cargo de '+item.display_name} value={roleDraft[item.id]||'attendant'} disabled={Boolean(busy)} onChange={e=>setRoleDraft(d=>({...d,[item.id]:e.target.value}))}>{options.map(role=><option value={role.value} key={role.value}>{role.label}</option>)}</select></label>
              <button type="button" className="ac-btn ac-btn-primary" disabled={Boolean(busy)} onClick={()=>approve(item,'approve')}>Aprovar acesso</button>
              <button type="button" className="ac-btn ac-btn-muted" disabled={Boolean(busy)} onClick={()=>approve(item,'reject')}>Recusar</button>
            </div>:<span className={'ac-status '+(item.status==='approved'?'enabled':'disabled')}>{item.status==='approved'?'Aprovada':'Recusada'}</span>}
          </div>)}
        </div>
      </section>}

      {showCreate&&<div className="ac-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setShowCreate(false);}}>
        <div className="ac-modal" role="dialog" aria-modal="true" aria-labelledby="ac-new-title">
          <div className="ac-head"><div><span className="ac-section-kicker">CADASTRO ADMINISTRATIVO</span><h2 id="ac-new-title">Adicionar profissional</h2><p>Crie um acesso individual e defina o cargo inicial.</p></div><button aria-label="Fechar cadastro" type="button" className="ac-modal-close" onClick={()=>setShowCreate(false)}>×</button></div>
          <form onSubmit={submitNewUser} className="ac-create-form">
            <label>Nome do profissional<input required minLength={3} maxLength={100} value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))} placeholder="Nome completo"/></label>
            <label>Usuário de login<input required minLength={4} maxLength={40} pattern="[A-Za-z0-9._-]+" value={form.username} onChange={e=>setForm(v=>({...v,username:e.target.value}))} placeholder="nome.sobrenome"/></label>
            <label>Cargo inicial<select value={form.role} onChange={e=>setForm(v=>({...v,role:e.target.value}))}>{options.map(role=><option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
            <div className="ac-modal-actions"><button type="button" className="ac-btn ac-btn-muted" onClick={()=>setShowCreate(false)}>Cancelar</button><button type="submit" className="ac-btn ac-btn-primary" disabled={Boolean(busy)}>{busy==='create'?'Salvando…':'Criar acesso'}</button></div>
          </form>
        </div>
      </div>}
    </>}
  </div>;
}
