'use client';
import {useEffect,useRef,useState} from 'react';
import {Icon} from './icons.jsx';

async function api(path,options={}){
  const res=await fetch('/api'+path,{
    credentials:'same-origin',cache:'no-store',...options,
    headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}
  });
  const body=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(body.error||'Falha ao consultar notificações.');
  return body;
}
const since=date=>date?new Date(date).toLocaleString('pt-BR'):'';
export default function AnnouncementNotifications({userId,onOpen,refreshKey=0}){
  const [list,setList]=useState([]),[unread,setUnread]=useState(0);
  const [open,setOpen]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const holder=useRef(null);
  useEffect(()=>{
    if(!userId)return;
    let live=true;
    const update=()=>{
      if(document.visibilityState==='hidden')return;
      api('/announcements/notifications').then(data=>{
        if(!live)return;
        setList(data.notifications||[]);setUnread(data.unread||0);
      }).catch(()=>{});
    };
    update();
    const timer=setInterval(update,30000);
    window.addEventListener('focus',update);
    return ()=>{live=false;clearInterval(timer);window.removeEventListener('focus',update);};
  },[userId,refreshKey]);
  useEffect(()=>{
    const outside=e=>{if(holder.current&&!holder.current.contains(e.target))setOpen(false);};
    const keyboard=e=>{if(e.key==='Escape')setOpen(false);};
    document.addEventListener('pointerdown',outside);
    document.addEventListener('keydown',keyboard);
    return ()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',keyboard);};
  },[]);
  async function view(item){
    if(busy)return;
    setBusy(true);setError('');
    try{
      await api('/announcements/notifications/'+item.id+'/read',{method:'POST',body:'{}'});
      setList(current=>current.map(n=>n.id===item.id?{...n,read_at:new Date().toISOString()}:n));
      setUnread(current=>Math.max(0,current-(item.read_at?0:1)));
      setOpen(false);
      await onOpen(item.publication_id);
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function markAll(){
    setBusy(true);setError('');
    try{
      await api('/announcements/notifications/read-all',{method:'POST',body:'{}'});
      setUnread(0);setList(current=>current.map(x=>({...x,read_at:x.read_at||new Date().toISOString()})));
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <div className="ann-notification-root" ref={holder}>
    <button type="button" className={'base190-header-icon ann-bell'+(open?' active':'')}
      title={unread?String(unread)+' anúncio(s) não lido(s)':'Central de notificações'}
      aria-label={'Notificações: '+unread+' não lidas'} aria-expanded={open}
      aria-haspopup="dialog" onClick={()=>setOpen(v=>!v)}>
      <Icon name="bell" size={19}/>
      {unread>0&&<span className="ann-bell-badge">{unread>99?'99+':unread}</span>}
    </button>
    {open&&<div className="ann-notification-panel" role="dialog" aria-label="Notificações de anúncios">
      <div className="ann-notification-top"><div><small>COMUNICADOS</small><h3>Notificações</h3></div>
        <button type="button" onClick={()=>setOpen(false)} aria-label="Fechar notificações">×</button></div>
      <div className="ann-notification-actions">
        <span>{unread?unread+' aviso(s) não lido(s)':'Tudo em dia'}</span>
        {unread>0&&<button type="button" disabled={busy} onClick={markAll}>Marcar todas como lidas</button>}
      </div>
      {error&&<p className="ann-notification-error" role="alert">{error}</p>}
      <div className="ann-notification-items">
        {!list.length&&<div className="ann-notification-empty"><Icon name="bell" size={24}/><p>Os próximos comunicados publicados aparecerão aqui.</p></div>}
        {list.map(item=><button type="button" key={item.id} disabled={busy}
          className={'ann-notification-item'+(!item.read_at?' unread':'')} onClick={()=>view(item)}>
          <span className="ann-notification-dot" aria-hidden="true"/>
          <span><strong>{item.title}</strong><small>{item.summary||'Novo anúncio publicado para a equipe.'}</small>
            <time>{since(item.created_at)}</time></span>
        </button>)}
      </div>
      <div className="ann-notification-foot">Clique em um aviso para abrir a publicação na página inicial.</div>
    </div>}
  </div>;
}
