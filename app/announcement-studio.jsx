'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import AnnouncementCanvas from './announcement-canvas.jsx';
import {Icon} from './icons.jsx';

const uid=()=>crypto.randomUUID();
const baseBackground=()=>({mode:'gradient',color1:'#10354b',color2:'#1d6170',imageId:null,overlay:35});
const layer=(type,patch={})=>({
  id:uid(),type,x:7,y:16,w:type==='heading'?55:35,h:type==='heading'?23:17,z:1,
  text:type==='heading'?'Título do seu anúncio':type==='text'?'Escreva aqui a mensagem que deseja comunicar.':
    type==='button'?'Saiba mais':type==='label'?'COMUNICADO':type==='shape'?'':'',
  color:'#ffffff',bgColor:type==='button'?'#6ed5df':'#21667b',
  fontSize:type==='heading'?46:type==='text'?18:type==='label'?13:17,
  fontWeight:type==='heading'?900:700,align:'left',radius:12,opacity:1,
  imageId:null,fit:'cover',href:'',...patch
});
function template(type='notice'){
  const urgent=type==='urgent',update=type==='update';
  const title=urgent?'Atenção à equipe operacional':update?'Novidade no Centro 190':'Um comunicado importante para você';
  const subtitle=urgent?'Confira o novo procedimento antes do próximo atendimento.':
    update?'Temos melhorias e recursos novos para seu dia a dia.':'Informações, avisos e orientações em destaque.';
  return {
    background:{...baseBackground(),color1:urgent?'#552d35':update?'#123a62':'#10354b',color2:urgent?'#a94c45':update?'#186b83':'#1b6170'},
    elements:[
      layer('label',{x:7,y:12,w:44,h:9,text:urgent?'ATENÇÃO • NOVO AVISO':update?'CENTRO 190 • NOVIDADES':'COMUNICADO À EQUIPE',bgColor:'#21667b',fontSize:12,radius:6}),
      layer('heading',{x:7,y:25,w:65,h:25,text:title}),
      layer('text',{x:7,y:55,w:58,h:15,text:subtitle,fontWeight:500,fontSize:18}),
      layer('button',{x:7,y:78,w:20,h:13,text:'Saiba mais',href:'/'}),
      layer('shape',{x:83,y:18,w:12,h:62,bgColor:'#1d7487',radius:40,opacity:0.4})
    ]
  };
}
const initialDraft=()=>({id:null,revision:0,title:'Novo anúncio',summary:'',layout:template()});
const types=[
  ['heading','Título'],['text','Texto'],['image','Imagem'],['button','Botão'],
  ['label','Etiqueta'],['shape','Forma']
];
async function jsonApi(path,opts={}){
  const res=await fetch('/api'+path,{credentials:'same-origin',cache:'no-store',
    ...opts,headers:{...(opts.body?{'Content-Type':'application/json'}:{}),...opts.headers}});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(data.error||'Não foi possível completar a operação.');
  return data;
}
const date=v=>v?new Date(v).toLocaleString('pt-BR'):'';
const textClasses='ann-form-control';
export default function AnnouncementStudio({onPublished=()=>{},onRestore=()=>{}}){
  const [campaigns,setCampaigns]=useState([]),[active,setActive]=useState(null);
  const [draft,setDraft]=useState(initialDraft);
  const [selectedId,setSelectedId]=useState(null);
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
  const [message,setMessage]=useState(''),[error,setError]=useState('');
  const [preview,setPreview]=useState(false),[mobile,setMobile]=useState(false);
  const [configured,setConfigured]=useState(false),[dirty,setDirty]=useState(false);
  const inputRef=useRef(null),uploadMode=useRef('element');
  const selected=useMemo(()=>draft.layout.elements.find(x=>x.id===selectedId)||null,[draft,selectedId]);
  function feedback(text,isError=false){setMessage(isError?'':text);setError(isError?text:'');}
  async function reload(){
    const r=await jsonApi('/announcements/manage');
    setCampaigns(r.campaigns||[]);setActive(r.active||null);setConfigured(Boolean(r.assetConfigured));
  }
  useEffect(()=>{let live=true;jsonApi('/announcements/manage').then(r=>{
    if(!live)return;
    setCampaigns(r.campaigns||[]);setActive(r.active||null);setConfigured(Boolean(r.assetConfigured));
  }).catch(e=>{if(live)feedback(e.message,true);}).finally(()=>{if(live)setLoading(false);});
    return ()=>{live=false;};
  },[]);
  function patchDraft(patch){setDraft(d=>({...d,...patch}));setDirty(true);}
  function patchLayout(next){setDraft(d=>({...d,layout:typeof next==='function'?next(d.layout):next}));setDirty(true);}
  function patchLayer(id,changes){
    patchLayout(prev=>({...prev,elements:prev.elements.map(el=>el.id===id?{...el,...changes}:el)}));
  }
  function addLayer(type){
    const item=layer(type,{z:draft.layout.elements.length+1});
    patchLayout(p=>({...p,elements:[...p.elements,item]}));
    setSelectedId(item.id);
  }
  function removeLayer(){
    if(!selectedId)return;
    patchLayout(p=>({...p,elements:p.elements.filter(el=>el.id!==selectedId)}));
    setSelectedId(null);
  }
  function cloneLayer(){
    if(!selected)return;
    const item={...selected,id:uid(),x:Math.min(selected.x+3,90),y:Math.min(selected.y+4,90),z:draft.layout.elements.length+1};
    patchLayout(p=>({...p,elements:[...p.elements,item]}));
    setSelectedId(item.id);
  }
  function moveLayer(step){
    const arr=[...draft.layout.elements],ix=arr.findIndex(el=>el.id===selectedId),to=ix+step;
    if(ix<0||to<0||to>=arr.length)return;
    [arr[ix],arr[to]]=[arr[to],arr[ix]];
    patchLayout(p=>({...p,elements:arr.map((el,i)=>({...el,z:i+1}))}));
  }
  function createNew(kind='notice'){
    if(dirty&&!window.confirm('Descartar alterações não salvas deste anúncio?'))return;
    setDraft({id:null,revision:0,title:kind==='urgent'?'Aviso importante':kind==='update'?'Novidade do sistema':'Novo anúncio',summary:'',layout:template(kind)});
    setSelectedId(null);setDirty(false);feedback('Modelo carregado. Personalize e publique quando estiver pronto.');
  }
  async function openCampaign(id){
    if(dirty&&!window.confirm('Descartar alterações não salvas?'))return;
    setBusy(true);
    try{const r=await jsonApi('/announcements/manage/'+id);
      setDraft({id:r.campaign.id,revision:r.campaign.revision,title:r.campaign.title,summary:r.campaign.summary,layout:r.campaign.layout});
      setSelectedId(null);setDirty(false);feedback('Anúncio aberto no editor.');
    }catch(e){feedback(e.message,true);}finally{setBusy(false);}
  }
  async function save(publish=false){
    if(!draft.title.trim()){feedback('Defina o título do anúncio.',true);return;}
    if(publish&&!draft.layout.elements.length){feedback('Adicione ao menos um elemento antes de publicar.',true);return;}
    if(publish&&!window.confirm('Publicar este anúncio e enviar uma notificação para cada usuário autorizado?'))return;
    setBusy(true);feedback('');
    try{
      const data=await jsonApi('/announcements/manage',{
        method:'POST',body:JSON.stringify({
          action:publish?'publish':'save',id:draft.id||undefined,revision:draft.revision,
          title:draft.title,summary:draft.summary,layout:draft.layout
        })
      });
      setDraft({id:data.campaign.id,revision:data.campaign.revision,title:data.campaign.title,
        summary:data.campaign.summary,layout:data.campaign.layout});
      setDirty(false);feedback(data.message);
      await reload();
      if(publish)onPublished(data.publication);
    }catch(e){feedback(e.message,true);}finally{setBusy(false);}
  }
  async function restore(){
    if(!window.confirm('Retornar ao banner original do Centro 190? Os anúncios publicados permanecerão no histórico.'))return;
    setBusy(true);
    try{const r=await jsonApi('/announcements/default',{method:'POST',body:'{}'});await reload();feedback(r.message);onRestore();}
    catch(e){feedback(e.message,true);}finally{setBusy(false);}
  }
  function requestUpload(mode){
    uploadMode.current=mode;
    inputRef.current?.click();
  }
  async function uploadFile(file){
    if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))return feedback('Use PNG, JPEG ou WebP.',true);
    if(file.size>3*1024*1024)return feedback('Imagem maior que 3 MB. Reduza o arquivo antes de enviar.',true);
    setBusy(true);feedback('');
    try{
      const res=await fetch('/api/announcements/assets',{
        method:'POST',credentials:'same-origin',body:file,headers:{'Content-Type':file.type}
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok)throw Error(data.error||'Falha ao carregar a imagem.');
      if(uploadMode.current==='background')
        patchLayout(p=>({...p,background:{...p.background,mode:'image',imageId:data.id}}));
      else if(selected?.type==='image')patchLayer(selected.id,{imageId:data.id,text:file.name});
      else{
        const item=layer('image',{x:66,y:14,w:29,h:72,imageId:data.id,text:file.name,fit:'cover'});
        patchLayout(p=>({...p,elements:[...p.elements,{...item,z:p.elements.length+1}]}));setSelectedId(item.id);
      }
      feedback('Imagem carregada. Agora você pode arrastá-la e redimensioná-la.');
    }catch(e){feedback(e.message,true);}finally{setBusy(false);if(inputRef.current)inputRef.current.value='';}
  }
  function editBg(changes){patchLayout(p=>({...p,background:{...p.background,...changes}}));}
  return <section className="ann-studio">
    <header className="ann-head">
      <div><span className="ann-eyebrow">CENTRAL DE COMUNICAÇÃO • CENTRO 190</span>
        <h1>Estúdio de anúncios</h1>
        <p>Crie comunicados visuais para o banner principal. Arraste os elementos, ajuste cores, adicione imagens e publique para toda a equipe.</p>
      </div>
      <div className="ann-head-actions">
        <button className="ann-btn ann-btn-muted" disabled={busy} onClick={restore}><Icon name="home" size={17}/> Restaurar padrão</button>
        <button className="ann-btn ann-btn-outline" disabled={busy||loading} onClick={()=>save(false)}>Salvar rascunho</button>
        <button className="ann-btn ann-btn-primary" disabled={busy||loading} onClick={()=>save(true)}>
          <Icon name="plus" size={16}/> {busy?'Processando…':'Publicar anúncio'}
        </button>
      </div>
    </header>
    {error&&<div className="ann-feedback error" role="alert">{error}</div>}
    {message&&<div className="ann-feedback success" role="status">{message}</div>}
    {dirty&&<div className="ann-unsaved" role="status">Alterações não salvas</div>}
    {loading?<div className="ann-loading">Carregando anúncios e modelos…</div>:
    <div className="ann-workspace">
      <aside className="ann-pane ann-left">
        <div className="ann-pane-head"><strong>Publicações</strong><span>{campaigns.length}</span></div>
        <button className="ann-btn ann-btn-primary ann-btn-block" onClick={()=>createNew()} disabled={busy}><Icon name="plus" size={15}/> Novo anúncio</button>
        <div className="ann-templates">
          <small>MODELOS RÁPIDOS</small>
          <button onClick={()=>createNew('notice')} disabled={busy}>Comunicado</button>
          <button onClick={()=>createNew('update')} disabled={busy}>Novidade</button>
          <button onClick={()=>createNew('urgent')} disabled={busy}>Aviso urgente</button>
        </div>
        <div className="ann-archive">
          <small>ANÚNCIOS SALVOS</small>
          {campaigns.length===0&&<p>Você ainda não criou nenhum anúncio.</p>}
          {campaigns.map(item=><button type="button" key={item.id}
            className={'ann-archive-item'+(draft.id===item.id?' selected':'')}
            onClick={()=>openCampaign(item.id)} disabled={busy}>
            <strong>{item.title}</strong>
            <span>{date(item.updated_at)}</span>
            <small>{item.status==='published'?'Publicado':item.status==='archived'?'Arquivado':'Rascunho'}</small>
          </button>)}
        </div>
        <div className="ann-active-caption">
          <strong>Exibição atual</strong>
          <span>{active?.title||'Banner padrão do Centro 190'}</span>
          <small>A publicação substitui apenas o banner da página inicial.</small>
        </div>
      </aside>
      <div className="ann-center">
        <div className="ann-toolbar">
          <div className="ann-toolbar-label">
            <label>Título interno<input value={draft.title} maxLength={120} onChange={e=>patchDraft({title:e.target.value})}/></label>
            <label>Descrição da notificação<input value={draft.summary} maxLength={350} onChange={e=>patchDraft({summary:e.target.value})} placeholder="Resumo enviado a cada usuário"/></label>
          </div>
          <div className="ann-view-toggle">
            <button className={!preview?'active':''} onClick={()=>setPreview(false)}>Editar</button>
            <button className={preview?'active':''} onClick={()=>setPreview(true)}>Visualizar</button>
            <button className={mobile?'active':''} onClick={()=>setMobile(v=>!v)} title={mobile?'Voltar ao editor de desktop':'Ver prévia para celular'}>{mobile?'Celular':'Desktop'}</button>
          </div>
        </div>
        <div className={'ann-preview-wrap'+(mobile?' mobile-preview':'')}>
          <AnnouncementCanvas layout={draft.layout} editable={!preview&&!mobile}
            selectedId={selectedId} onSelect={setSelectedId} mobile={mobile}
            onChange={patchLayer} title={draft.title}/>
        </div>
        <div className="ann-add-tools" aria-label="Adicionar elementos">
          {types.map(([type,label])=><button key={type} disabled={busy}
            onClick={()=>type==='image'?requestUpload('element'):addLayer(type)}>
            <span aria-hidden="true">{({heading:'T',text:'¶',image:'▧',button:'▣',label:'◉',shape:'▦'})[type]}</span>{label}
          </button>)}
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp"
            hidden onChange={e=>uploadFile(e.target.files?.[0])}/>
        </div>
        <p className="ann-help"><Icon name="settings" size={15}/> Arraste para mover, use a alça inferior para redimensionar ou selecione um elemento para editar suas propriedades. As setas também movem o elemento selecionado.</p>
      </div>
      <aside className="ann-pane ann-inspector">
        <div className="ann-pane-head"><strong>Personalizar</strong><span>PROPRIEDADES</span></div>
        <section className="ann-inspector-section">
          <h3>Plano de fundo</h3>
          <label>Estilo<select value={draft.layout.background.mode} onChange={e=>editBg({mode:e.target.value})}>
            <option value="gradient">Degradê</option><option value="solid">Cor sólida</option><option value="image">Imagem de fundo</option>
          </select></label>
          <div className="ann-color-row">
            <label>Cor principal<input type="color" value={draft.layout.background.color1} onChange={e=>editBg({color1:e.target.value})}/></label>
            <label>Cor secundária<input type="color" value={draft.layout.background.color2} onChange={e=>editBg({color2:e.target.value})}/></label>
          </div>
          <button className="ann-btn ann-btn-outline ann-btn-block" type="button" onClick={()=>requestUpload('background')} disabled={busy}>Enviar imagem de fundo</button>
          {draft.layout.background.mode==='image'&&<label>Escurecimento ({draft.layout.background.overlay}%)
            <input type="range" min={0} max={95} value={draft.layout.background.overlay}
              onChange={e=>editBg({overlay:Number(e.target.value)})}/></label>}
          {!configured&&<p className="ann-warning">Para usar imagens, conecte o armazenamento privado Vercel Blob ao projeto.</p>}
        </section>
        <section className="ann-inspector-section">
          <h3>Elementos <span>{draft.layout.elements.length}/40</span></h3>
          <div className="ann-layer-list">
            {draft.layout.elements.map(element=><button type="button" key={element.id}
              className={element.id===selectedId?'active':''} onClick={()=>setSelectedId(element.id)}>
              {types.find(([key])=>key===element.type)?.[1]} · {(element.text||'Imagem/forma').slice(0,26)}
            </button>)}
            {!draft.layout.elements.length&&<p>Nenhum elemento adicionado.</p>}
          </div>
          {selected&&<div className="ann-props">
            <h4>Editar {types.find(([key])=>key===selected.type)?.[1]}</h4>
            {selected.type!=='image'&&selected.type!=='shape'&&
              <label>Conteúdo<textarea rows={3} maxLength={1200} value={selected.text}
                onChange={e=>patchLayer(selected.id,{text:e.target.value})}/></label>}
            {selected.type==='image'&&<button className="ann-btn ann-btn-outline" onClick={()=>requestUpload('element')}>Trocar imagem</button>}
            {selected.type==='button'&&<label>Link do botão
              <input value={selected.href||''} placeholder="https://... ou /caminho"
                onChange={e=>patchLayer(selected.id,{href:e.target.value})}/></label>}
            <div className="ann-color-row">
              {selected.type!=='image'&&selected.type!=='shape'&&<label>Cor do texto<input type="color" value={selected.color} onChange={e=>patchLayer(selected.id,{color:e.target.value})}/></label>}
              {['button','label','shape'].includes(selected.type)&&<label>Cor do elemento<input type="color" value={selected.bgColor} onChange={e=>patchLayer(selected.id,{bgColor:e.target.value})}/></label>}
            </div>
            {selected.type!=='image'&&selected.type!=='shape'&&<div className="ann-prop-pair">
              <label>Fonte (px)<input type="number" min={11} max={76} value={selected.fontSize} onChange={e=>patchLayer(selected.id,{fontSize:Number(e.target.value)})}/></label>
              <label>Peso<select value={selected.fontWeight} onChange={e=>patchLayer(selected.id,{fontWeight:Number(e.target.value)})}>
                <option value={400}>Regular</option><option value={600}>Médio</option><option value={700}>Negrito</option><option value={900}>Extra forte</option>
              </select></label>
            </div>}
            {selected.type!=='image'&&selected.type!=='shape'&&<label>Alinhamento<select value={selected.align} onChange={e=>patchLayer(selected.id,{align:e.target.value})}>
              <option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option>
            </select></label>}
            {selected.type==='image'&&<label>Enquadramento<select value={selected.fit} onChange={e=>patchLayer(selected.id,{fit:e.target.value})}><option value="cover">Preencher</option><option value="contain">Conter</option></select></label>}
            <div className="ann-prop-pair">
              <label>Largura (%)<input type="number" min={4} max={100-selected.x} value={Math.round(selected.w*10)/10} onChange={e=>patchLayer(selected.id,{w:Math.max(4,Math.min(100-selected.x,Number(e.target.value)))})}/></label>
              <label>Altura (%)<input type="number" min={5} max={100-selected.y} value={Math.round(selected.h*10)/10} onChange={e=>patchLayer(selected.id,{h:Math.max(5,Math.min(100-selected.y,Number(e.target.value)))})}/></label>
            </div>
            <div className="ann-prop-pair">
              <label>Posição X (%)<input type="number" min={0} max={100-selected.w} value={selected.x} onChange={e=>patchLayer(selected.id,{x:Math.max(0,Math.min(100-selected.w,Number(e.target.value)))})}/></label>
              <label>Posição Y (%)<input type="number" min={0} max={100-selected.h} value={selected.y} onChange={e=>patchLayer(selected.id,{y:Math.max(0,Math.min(100-selected.h,Number(e.target.value)))})}/></label>
            </div>
            <label>Opacidade ({Math.round(selected.opacity*100)}%)<input type="range" min={10} max={100}
              value={Math.round(selected.opacity*100)} onChange={e=>patchLayer(selected.id,{opacity:Number(e.target.value)/100})}/></label>
            <label>Arredondamento ({selected.radius}px)<input type="range" min={0} max={48}
              value={selected.radius} onChange={e=>patchLayer(selected.id,{radius:Number(e.target.value)})}/></label>
            <div className="ann-item-actions">
              <button type="button" onClick={()=>moveLayer(-1)} title="Enviar para trás">Para trás</button>
              <button type="button" onClick={()=>moveLayer(1)} title="Trazer para frente">À frente</button>
              <button type="button" onClick={cloneLayer}>Duplicar</button>
              <button type="button" className="danger" onClick={removeLayer}>Excluir</button>
            </div>
          </div>}
        </section>
        <div className="ann-notice-info"><Icon name="bell" size={18}/><p><strong>Notificação por usuário</strong>
          Publicações criam avisos individuais, inclusive para quem estiver offline. Ao clicar no sino, o profissional será levado ao comunicado.</p></div>
      </aside>
    </div>}
  </section>;
}
