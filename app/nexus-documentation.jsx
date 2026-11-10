'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';

const ICONS=['🚀','📘','⚡','🛠️','🎯','📊','🧩','🛡️','💡','🗂️','🏛️','🧪','🌐','🔥','✨','📌','🧠','💻','📚','⚖️','🚓'];
const COVERS=['indigo','emerald','amber','blue','fuchsia','slate'];
const TYPES=[['h1','Título grande','H1'],['h2','Subtítulo','H2'],['h3','Título pequeno','H3'],['paragraph','Parágrafo','¶'],['tabs','Bloco de abas','▣'],['table','Tabela dinâmica','▦'],['callout','Painel de aviso','ⓘ'],['checklist','Checklist','☑'],['kanban','Quadro Kanban','☷'],['code','Código','</>'],['toggle','Expansível','▸'],['divider','Divisor','—']];
const uid=()=>globalThis.crypto?.randomUUID?.()||'b-'+Math.random().toString(36).slice(2);
const now=()=>new Date().toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
function newBlock(type='paragraph'){
 const base={id:uid(),type};
 switch(type){
  case 'tabs':return {...base,activeTabIndex:0,tabs:[{id:uid(),title:'Visão geral',content:'<p>Conteúdo da primeira aba.</p>'},{id:uid(),title:'Detalhes',content:'<p>Informações adicionais.</p>'}]};
  case 'table':return {...base,headers:['Campo','Descrição','Status'],rows:[['','', ''],['','','']]};
  case 'checklist':return {...base,items:[{id:uid(),text:'Nova tarefa',done:false}]};
  case 'kanban':return {...base,columns:['A fazer','Em progresso','Concluído'].map(title=>({id:uid(),title,cards:[]}))};
  case 'callout':return {...base,title:'Informação importante',content:'<p>Adicione uma orientação.</p>',variant:'info'};
  case 'toggle':return {...base,title:'Mais informações',content:'<p>Conteúdo expansível.</p>',open:true};
  case 'code':return {...base,language:'plaintext',code:'// Adicione seu código'};
  case 'divider':return base;
  default:return {...base,content:type==='rich'?'<p></p>':''};
 }
}
const metaFor=page=>{
 const meta=page?.nexus_meta&&typeof page.nexus_meta==='object'?page.nexus_meta:{};
 return {icon:meta.icon||'📘',subtitle:meta.subtitle||'',coverIndex:Number.isInteger(meta.coverIndex)?meta.coverIndex:0,favorite:!!meta.favorite,
  blocks:Array.isArray(meta.blocks)&&meta.blocks.length?structuredClone(meta.blocks):[ {...newBlock('rich'),content:page?.content||'<p></p>'}]};
};
const empty=(space='Geral')=>({title:'Sem título',space,content:'',status:'draft',parent_id:null,nexus_meta:{icon:'📘',subtitle:'',coverIndex:0,favorite:false,blocks:[newBlock('paragraph')]}});
async function api(path='',options={}){
 const r=await fetch('/api/documentation'+path,{credentials:'same-origin',cache:'no-store',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});
 let data={};try{data=await r.json();}catch{}
 if(!r.ok)throw Error(data.error||'Não foi possível concluir a operação.');
 return data;
}
function Rich({html='',onChange,editable=false,placeholder='Digite aqui…',className=''}) {
 const ref=useRef(null);
 useEffect(()=>{if(ref.current&&document.activeElement!==ref.current&&ref.current.innerHTML!==(html||''))ref.current.innerHTML=html||'';},[html,editable]);
 function paste(e){
   e.preventDefault();
   const text=e.clipboardData.getData('text/plain');
   const selection=window.getSelection();if(!selection?.rangeCount)return;
   const range=selection.getRangeAt(0);range.deleteContents();
   const node=document.createTextNode(text);range.insertNode(node);range.setStartAfter(node);range.collapse(true);selection.removeAllRanges();selection.addRange(range);
   onChange?.(e.currentTarget.innerHTML);
 }
 return <div ref={ref} className={'nx-rich '+className} contentEditable={editable} suppressContentEditableWarning data-placeholder={placeholder} role={editable?'textbox':undefined} aria-multiline={editable?true:undefined}
   onInput={e=>onChange?.(e.currentTarget.innerHTML)} onPaste={paste}/>;
}
function InlineToolbar({enabled}){
 const [coords,setCoords]=useState(null);
 useEffect(()=>{
  if(!enabled){setCoords(null);return;}
  const update=()=>{
    const selection=window.getSelection();
    if(!selection||selection.isCollapsed||!selection.toString().trim()){setCoords(null);return;}
    const node=selection.anchorNode?.parentElement;
    if(!node?.closest?.('.nexus-docs .nx-rich[contenteditable="true"]')){setCoords(null);return;}
    const rect=selection.getRangeAt(0).getBoundingClientRect();
    if(rect.width===0&&rect.height===0){setCoords(null);return;}
    setCoords({left:Math.max(10,Math.min(window.innerWidth-260,rect.left+rect.width/2-125)),top:Math.max(9,rect.top-48)});
  };
  document.addEventListener('selectionchange',update);return()=>document.removeEventListener('selectionchange',update);
 },[enabled]);
 if(!enabled||!coords)return null;
 const format=(cmd,value)=>{document.execCommand(cmd,false,value);setCoords(null);};
 const highlight=kind=>{const sel=window.getSelection();if(!sel?.rangeCount||sel.isCollapsed)return;const range=sel.getRangeAt(0);const wrap=document.createElement('span');wrap.className=kind;wrap.appendChild(range.extractContents());range.insertNode(wrap);const editable=wrap.closest('.nx-rich[contenteditable="true"]');editable?.dispatchEvent(new InputEvent('input',{bubbles:true}));sel.removeAllRanges();setCoords(null);};
 return <div className="nx-floating-toolbar" style={{left:coords.left,top:coords.top}} role="toolbar" aria-label="Formatação de texto selecionado">
  {[['B','bold'],['I','italic'],['U','underline'],['S','strikeThrough']].map(([label,cmd])=><button key={cmd} onMouseDown={e=>e.preventDefault()} onClick={()=>format(cmd)} title={cmd}>{label}</button>)}
  <span/>
  {[['#fef08a','hl-yellow'],['#bbf7d0','hl-green'],['#bfdbfe','hl-blue'],['#fbcfe8','hl-pink']].map(([color,kind])=><button key={color} className="nx-color" style={{background:color}} onMouseDown={e=>e.preventDefault()} onClick={()=>highlight(kind)} aria-label={'Destacar '+color}/>)}
 </div>;
}
function Block({block,index,total,editable,onChange,onMove,onDuplicate,onDelete,onInsert,openPalette}) {
 const set=patch=>onChange({...block,...patch});
 const controls=editable&&<div className="nx-block-actions">
   <button title="Mover acima" disabled={index===0} onClick={()=>onMove(-1)}>↑</button><button title="Mover abaixo" disabled={index===total-1} onClick={()=>onMove(1)}>↓</button>
   <button title="Duplicar bloco" onClick={onDuplicate}>⧉</button><button title="Inserir bloco" onClick={openPalette}>＋</button><button title="Excluir bloco" onClick={onDelete}>×</button>
 </div>;
 const rich=(value,update,placeholder,cls)=> <Rich key={block.id+(cls||'')} html={value} editable={editable} onChange={update} placeholder={placeholder} className={cls||''}/>;
 let view;
 switch(block.type){
  case 'rich':case 'paragraph':
   view=rich(block.content,content=>set({content}),'Digite / para inserir blocos…','nx-paragraph');
   break;
  case 'h1':case 'h2':case 'h3':
   view=rich(block.content,content=>set({content}),'Digite o título…','nx-'+block.type);
   break;
  case 'callout':
   view=<div className={'nx-callout '+(block.variant||'info')}><button disabled={!editable} title="Alternar estilo" className="nx-callout-icon" onClick={()=>set({variant:({info:'success',success:'warning',warning:'danger',danger:'info'})[block.variant||'info']})}>ⓘ</button><div>
    <input aria-label="Título do aviso" value={block.title||''} readOnly={!editable} onChange={e=>set({title:e.target.value})} placeholder="Título do aviso" className="nx-inline-input nx-callout-title"/>
    {rich(block.content,content=>set({content}),'Descrição do aviso…','nx-callout-text')}</div></div>;
   break;
  case 'tabs': {
   const tabs=block.tabs?.length?block.tabs:[{id:'first',title:'Aba 1',content:''}];
   const active=Math.min(block.activeTabIndex||0,tabs.length-1);
   view=<div className="nx-tabs-block"><div className="nx-tabs-head">{tabs.map((t,i)=><div key={t.id} className={'nx-tab '+(active===i?'active':'')}>
     <button onClick={()=>set({activeTabIndex:i})}>{t.title||'Sem título'}</button>
     {editable&&<button className="nx-mini-danger" title="Remover aba" onClick={()=>{if(tabs.length<=1)return;set({tabs:tabs.filter((_,ix)=>ix!==i),activeTabIndex:0});}}>×</button>}
    </div>)}{editable&&<button className="nx-add-tab" title="Adicionar aba" onClick={()=>set({tabs:[...tabs,{id:uid(),title:'Nova aba',content:'<p></p>'}],activeTabIndex:tabs.length})}>＋</button>}</div>
    <div className="nx-tab-content">{editable&&<input className="nx-inline-input nx-tab-title" aria-label="Título da aba" value={tabs[active]?.title||''} onChange={e=>set({tabs:tabs.map((t,i)=>i===active?{...t,title:e.target.value}:t)})}/>}
      {rich(tabs[active]?.content,content=>set({tabs:tabs.map((t,i)=>i===active?{...t,content}:t)}),'Conteúdo da aba…','nx-paragraph')}
    </div></div>;break;
  }
  case 'table': {
   const headers=block.headers||[],rows=block.rows||[];
   view=<div className="nx-table-wrap"><table><thead><tr>{headers.map((h,i)=><th key={i}><input aria-label={'Coluna '+(i+1)} readOnly={!editable} value={h} onChange={e=>set({headers:headers.map((v,j)=>i===j?e.target.value:v)})}/></th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{headers.map((_,j)=><td key={j}><input aria-label={'Linha '+(i+1)+' coluna '+(j+1)} readOnly={!editable} value={row?.[j]||''} onChange={e=>set({rows:rows.map((r,k)=>k===i?headers.map((_,m)=>m===j?e.target.value:r[m]||''):r)})}/></td>)}</tr>)}</tbody></table>
    {editable&&<div className="nx-table-tools"><button onClick={()=>set({rows:[...rows,headers.map(()=>'')]})}>＋ Linha</button><button onClick={()=>set({headers:[...headers,'Coluna '+(headers.length+1)],rows:rows.map(row=>[...row,''])})}>＋ Coluna</button><button onClick={()=>set({rows:rows.slice(0,-1)})} disabled={!rows.length}>− Linha</button><button onClick={()=>set({headers:headers.slice(0,-1),rows:rows.map(row=>row.slice(0,-1))})} disabled={headers.length<=1}>− Coluna</button></div>}
    </div>;break;
  }
  case 'checklist':{
   const items=block.items||[],done=items.filter(x=>x.done).length;
   view=<div className="nx-checklist"><div className="nx-check-progress"><b>Checklist</b><span>{done}/{items.length} concluídos</span><div className="nx-progress-track"><i style={{width:items.length?(done/items.length*100)+'%':'0%'}}/></div></div>
   {items.map((t,i)=><div className="nx-check-row" key={t.id}><input type="checkbox" disabled={!editable} checked={!!t.done} onChange={e=>set({items:items.map((x,j)=>i===j?{...x,done:e.target.checked}:x)})}/>
   <input value={t.text} readOnly={!editable} className={t.done?'done':''} aria-label={'Tarefa '+(i+1)} onChange={e=>set({items:items.map((x,j)=>i===j?{...x,text:e.target.value}:x)})}/>
   {editable&&<button title="Remover tarefa" onClick={()=>set({items:items.filter((_,j)=>i!==j)})}>×</button>}</div>)}
   {editable&&<button className="nx-subtle" onClick={()=>set({items:[...items,{id:uid(),text:'',done:false}]})}>＋ Adicionar tarefa</button>}</div>;break;
  }
  case 'kanban':{
   const cols=block.columns||[];
   view=<div className="nx-kanban">{cols.map((column,i)=><div className="nx-kanban-column" key={column.id}>
      <div className="nx-kanban-head"><span className={'nx-kanban-dot k'+i}/><input aria-label="Coluna Kanban" readOnly={!editable} value={column.title} onChange={e=>set({columns:cols.map((c,j)=>i===j?{...c,title:e.target.value}:c)})}/><small>{column.cards?.length||0}</small></div>
      {(column.cards||[]).map((card,j)=><div className="nx-kanban-card" key={card.id}><textarea aria-label="Cartão Kanban" rows={2} readOnly={!editable} value={card.text} onChange={e=>set({columns:cols.map((c,k)=>i===k?{...c,cards:c.cards.map((x,m)=>j===m?{...x,text:e.target.value}:x)}:c)})}/>
        {editable&&<button title="Remover cartão" onClick={()=>set({columns:cols.map((c,k)=>i===k?{...c,cards:c.cards.filter((_,m)=>j!==m)}:c)})}>×</button>}</div>)}
      {editable&&<button className="nx-subtle" onClick={()=>set({columns:cols.map((c,k)=>i===k?{...c,cards:[...(c.cards||[]),{id:uid(),text:''}]}:c)})}>＋ Novo cartão</button>}
    </div>)}</div>;break;
  }
  case 'code':
   view=<div className="nx-code"><div className="nx-code-head"><span>● ● ●</span><input aria-label="Linguagem" value={block.language||'plaintext'} readOnly={!editable} onChange={e=>set({language:e.target.value})}/><button onClick={()=>navigator.clipboard?.writeText(block.code||'')}>Copiar código</button></div><textarea spellCheck={false} aria-label="Bloco de código" rows={Math.min(18,Math.max(5,(block.code||'').split('\n').length+1))} value={block.code||''} readOnly={!editable} onChange={e=>set({code:e.target.value})}/></div>;
   break;
  case 'toggle':
   view=<div className="nx-toggle"><div className="nx-toggle-header"><button title={block.open?'Recolher':'Expandir'} onClick={()=>set({open:!block.open})}>{block.open?'⌄':'›'}</button><input aria-label="Título expansível" readOnly={!editable} value={block.title||''} onChange={e=>set({title:e.target.value})}/></div>{block.open&&rich(block.content,content=>set({content}),'Conteúdo adicional…','nx-toggle-body')}</div>;break;
  case 'divider':view=<hr className="nx-divider"/>;break;
  default:view=rich(block.content,content=>set({content}),'Escreva…','nx-paragraph');
 }
 return <div className="nx-block" data-block-type={block.type}><div className="nx-block-content">{view}</div>{controls}</div>;
}
export default function NexusDocumentation({isAdmin=false,active=true,onExit}){
 const [pages,setPages]=useState([]),[page,setPage]=useState(null),[query,setQuery]=useState(''),[mode,setMode]=useState('view');
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[saveState,setSaveState]=useState(''),[showPalette,setShowPalette]=useState(false),[command,setCommand]=useState(false);
 const [blockPalette,setBlockPalette]=useState(null),[emojiPicker,setEmojiPicker]=useState(false),[exportMenu,setExportMenu]=useState(false),[sideOpen,setSideOpen]=useState(true),[newSpace,setNewSpace]=useState(false),[spaceValue,setSpaceValue]=useState(''),[history,setHistory]=useState([]);
 const [dark,setDark]=useState(true);
 const [spacesExtra,setSpacesExtra]=useState([]);
 const pageRef=useRef(null),imageInput=useRef(null),timer=useRef(null),draftRevision=useRef(0),baseline=useRef(''),savedRef=useRef('');
 pageRef.current=page;
 const isEditing=mode==='edit'&&isAdmin;
 const currentMeta=page?.nexus_meta||{};
 const dirty=Boolean(page&&isEditing&&JSON.stringify(page)!==baseline.current);
 const notRecovered=Boolean(page&&JSON.stringify(page)!==savedRef.current);
 const patch=useCallback(change=>setPage(p=>p?{...p,...change}:p),[]);
 const patchMeta=useCallback(change=>setPage(p=>p?{...p,nexus_meta:{...p.nexus_meta,...change}}:p),[]);
 const updateBlocks=useCallback(blocks=>patchMeta({blocks}),[patchMeta]);
 async function reload(){try{const d=await api();setPages(d.pages||[]);return d.pages||[];}catch(e){setNotice(e.message);return []}}
 useEffect(()=>{reload();const theme=localStorage.getItem('nx_docs_theme');setDark(theme!=='light');if(window.innerWidth<=760)setSideOpen(false);},[]);
 useEffect(()=>{const nav=e=>{if(active&&dirty&&notRecovered){e.preventDefault();setNotice('Existem alterações ainda não recuperadas. Salve seu rascunho antes de sair.');}};window.addEventListener('base190:before-navigation',nav);return()=>window.removeEventListener('base190:before-navigation',nav);},[active,dirty,notRecovered]);
 useEffect(()=>{const keydown=e=>{if(!active)return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setCommand(v=>!v);}if(e.key==='Escape'){setCommand(false);setShowPalette(false);setEmojiPicker(false);setExportMenu(false);}};window.addEventListener('keydown',keydown);return()=>window.removeEventListener('keydown',keydown);},[active]);
 useEffect(()=>{if(!dirty||!notRecovered)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty,notRecovered]);
 const filtered=useMemo(()=>pages.filter(p=>((p.title||'')+' '+(p.space||'')+' '+(p.nexus_meta?.subtitle||'')+' '+(p.content||'').replace(/<[^>]+>/g,' ')).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())),[pages,query]);
 const spaces=useMemo(()=>[...new Set([...pages.map(p=>p.space),...spacesExtra])], [pages,spacesExtra]);
 async function open(p,edit=false){
   if(busy)return;
   if(dirty&&notRecovered){setNotice('Salve a recuperação desta página antes de navegar.');return;}
   draftRevision.current=0;setNotice('');setHistory([]);setMode(edit?'edit':'view');
   const next={...p,nexus_meta:metaFor(p)};
   try{
     if(isAdmin&&p.id){const res=await api('/draft?key='+p.id);const draft=res.draft;
       if(draft?.payload?.baseRevision===p.revision&&draft?.payload?.nexus_meta){
         draftRevision.current=draft.revision;Object.assign(next,draft.payload,{revision:p.revision});setMode('edit');setSaveState('Recuperação restaurada');
       }else setSaveState('');
     }else setSaveState('');
   }catch(e){setNotice(e.message);}
   setPage(next);baseline.current=JSON.stringify(next);savedRef.current=JSON.stringify(next);
 }
 async function persistDraft(target=pageRef.current){
   if(!isAdmin||!target)return false;
   clearTimeout(timer.current);
   setSaveState('Salvando recuperação…');
   try{const res=await api('/draft',{method:'POST',body:JSON.stringify({key:target.id||'new',revision:draftRevision.current,payload:{title:target.title,space:target.space,parent_id:target.parent_id,content:'',nexus_meta:target.nexus_meta,status:target.status,baseRevision:target.revision||0}})});
     draftRevision.current=res.draft.revision;savedRef.current=JSON.stringify(target);setSaveState('Recuperação salva');return true;
   }catch(e){setSaveState('Falha ao salvar recuperação');setNotice(e.message);return false;}
 }
 useEffect(()=>{if(!isEditing||!dirty||!page)return;clearTimeout(timer.current);timer.current=setTimeout(()=>{void persistDraft(page);},2200);return()=>clearTimeout(timer.current);},[page,isEditing,dirty]);
 async function save(status){
  if(!isAdmin||!page||busy)return;
  setBusy(true);setNotice('');setSaveState('Publicando…');
  try{clearTimeout(timer.current);const payload={...page,status,content:''};
    const res=await api('',{method:'POST',body:JSON.stringify(payload)});
    await api('/draft?key='+(page.id||'new'),{method:'DELETE'}).catch(()=>{});
    draftRevision.current=0;const next={...res.page,nexus_meta:metaFor(res.page)};
    setPage(next);baseline.current=JSON.stringify(next);savedRef.current=JSON.stringify(next);
    await reload();setSaveState('Alterações salvas no servidor');setMode('view');
    setNotice(status==='published'?'Página publicada com histórico de revisão.':'Rascunho salvo no servidor.');
  }catch(e){setNotice(e.message);setSaveState('Falha ao salvar');}
  finally{setBusy(false);}
 }
 async function createPage(space){const p=empty(space||page?.space||'Geral');await open(p,true);}
 function changeBlock(index,block){updateBlocks((currentMeta.blocks||[]).map((b,i)=>i===index?block:b));}
 function blockMove(index,direction){const items=[...(currentMeta.blocks||[])],n=index+direction;if(n<0||n>=items.length)return;[items[index],items[n]]=[items[n],items[index]];updateBlocks(items);}
 function addBlock(type,index){const items=[...(currentMeta.blocks||[])];items.splice(index??items.length,0,newBlock(type));updateBlocks(items);setShowPalette(false);setBlockPalette(null);}
 async function uploadImage(file){
   if(!isEditing||!file)return;
   if(file.size>3145728){setNotice('A imagem deve ter até 3 MB.');return;}
   setBusy(true);setSaveState('Enviando imagem…');
   try{
     const r=await fetch('/api/documentation/assets',{method:'POST',credentials:'same-origin',headers:{'Content-Type':file.type},body:file});
     const d=await r.json();if(!r.ok)throw Error(d.error||'Falha ao enviar imagem.');
     const src=String(d.src||'');
     if(!/^\/api\/documentation\/assets\/[0-9a-f-]{36}$/.test(src))throw Error('Endereço de imagem inválido.');
     const alt=file.name.replace(/[<>"']/g,'').slice(0,100);
     const block={...newBlock('rich'),content:'<figure data-type="doc-image"><img src="'+src+'" width="720" alt="'+alt+'"></figure>'};
     updateBlocks([...(pageRef.current?.nexus_meta?.blocks||[]),block]);
     setSaveState('Imagem anexada, aguardando publicação');
   }catch(e){setNotice(e.message);}finally{setBusy(false);}
 }
 async function toggleFav(){if(!isAdmin||!page||busy)return;if(isEditing){patchMeta({favorite:!currentMeta.favorite});return;}setBusy(true);try{const res=await api('',{method:'POST',body:JSON.stringify({...page,nexus_meta:{...currentMeta,favorite:!currentMeta.favorite}})});const next={...res.page,nexus_meta:metaFor(res.page)};setPage(next);baseline.current=JSON.stringify(next);savedRef.current=JSON.stringify(next);await reload();setSaveState('Favorito salvo no servidor');}catch(e){setNotice(e.message);}finally{setBusy(false);}}
 async function viewHistory(){if(!page?.id)return;try{const d=await api('/history?id='+page.id);setHistory(d.versions||[]);}catch(e){setNotice(e.message);}}
 function download(content,name,mime){const url=URL.createObjectURL(new Blob([content],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
 function exportDocument(kind){
   if(!page)return;
   const safe=(page.title||'documento').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w-]+/g,'-');
   if(kind==='json')download(JSON.stringify({title:page.title,space:page.space,nexus_meta:page.nexus_meta},null,2),safe+'.json','application/json');
   if(kind==='md'){const blocks=(currentMeta.blocks||[]).map(b=>{
      if(['paragraph','rich','h1','h2','h3'].includes(b.type))return (b.type[0]==='h'?'#'.repeat(Number(b.type[1]))+' ':'')+(b.content||'').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'');
      if(b.type==='code')return '\u0060\u0060\u0060'+(b.language||'')+'\n'+(b.code||'')+'\n\u0060\u0060\u0060';
      if(b.type==='callout'||b.type==='toggle')return '> '+(b.title||'')+'\n'+(b.content||'').replace(/<[^>]+>/g,'');
      if(b.type==='checklist')return (b.items||[]).map(x=>'- ['+(x.done?'x':' ')+'] '+x.text).join('\n');
      if(b.type==='tabs')return (b.tabs||[]).map(x=>'### '+x.title+'\n'+(x.content||'').replace(/<[^>]+>/g,'')).join('\n');
      if(b.type==='table')return [b.headers.join(' | '),b.headers.map(()=>'---').join(' | '),...(b.rows||[]).map(r=>r.join(' | '))].join('\n');
      if(b.type==='kanban')return (b.columns||[]).map(x=>'### '+x.title+'\n'+x.cards.map(c=>'- '+c.text).join('\n')).join('\n');
      return '---';
    });download('# '+page.title+'\n\n'+(currentMeta.subtitle||'')+'\n\n'+blocks.join('\n\n'),safe+'.md','text/markdown;charset=utf-8');}
   setExportMenu(false);
 }
 const favoritePages=pages.filter(p=>p.nexus_meta?.favorite);
 const status=page?.status==='published'?'Oficial / Publicado':'Rascunho';
 const blockList=currentMeta.blocks||[];
 return <section className={'nexus-docs '+(dark?'nx-dark':'nx-light')+(sideOpen?'':' nx-collapsed')}>
    <InlineToolbar enabled={isEditing}/>
    <aside className="nx-sidebar">
      <div className="nx-workspace-head"><div className="nx-logo">N</div><div className="nx-workspace-title"><strong>Base 190 <span>PRO</span></strong><small>Centro de Inteligência Jurídica</small></div>
      <button className="nx-icon-button" title="Recolher sidebar" onClick={()=>setSideOpen(false)}>◧</button></div>
      <div className="nx-quick-actions">
        <button className="nx-search-trigger" onClick={()=>setCommand(true)}><span>⌕ &nbsp; Buscar ou comando...</span><kbd>Ctrl K</kbd></button>
        {isAdmin&&<button className="nx-create-btn" onClick={()=>createPage()}>⊕ &nbsp; Nova Página / Documento</button>}
      </div>
      <nav className="nx-tree">
       {!!favoritePages.length&&<section><div className="nx-tree-heading">☆ &nbsp; Favoritos</div>{favoritePages.map(p=><button key={p.id} className={'nx-page-item '+(page?.id===p.id?'active':'')} onClick={()=>open(p)}><span>{p.nexus_meta?.icon||'📘'}</span><span>{p.title}</span></button>)}</section>}
       <section><div className="nx-tree-heading"><span>Espaços &amp; Páginas</span>{isAdmin&&<button aria-label="Criar espaço" title="Criar espaço" onClick={()=>{setNewSpace(true);setSpaceValue('');}}>⊞</button>}</div>
       {spaces.map(space=><details key={space} className="nx-space" open><summary><span>📁</span><b>{space}</b>{isAdmin&&<button title="Nova página neste espaço" onClick={e=>{e.preventDefault();createPage(space)}}>＋</button>}</summary><div className="nx-space-pages">
         {filtered.filter(p=>p.space===space).map(p=><button key={p.id} className={'nx-page-item '+(page?.id===p.id?'active':'')} onClick={()=>open(p)} style={{paddingLeft:10+(p.parent_id?13:0)}}><span>{p.nexus_meta?.icon||'📘'}</span><span>{p.title}</span></button>)}
       </div></details>)}
       {pages.length===0&&<div className="nx-sidebar-empty">A biblioteca ainda não possui páginas.</div>}
       </section></nav>
      <div className="nx-sidebar-footer"><button onClick={onExit}>← Voltar à Base 190</button><span><i/> PostgreSQL</span></div>
    </aside>
    <div className="nx-main">
      <header className="nx-top-navbar">
       <div className="nx-breadcrumb"><button className="nx-icon-button nx-expand" onClick={()=>setSideOpen(v=>!v)} title="Alternar sidebar">☷</button><span>📁 {page?.space||'Biblioteca 190'}</span><b className="nx-slash">›</b><strong>{currentMeta.icon||'📘'} {page?.title||'Selecione uma página'}</strong></div>
       <div className="nx-navbar-actions"><span className="nx-save-state">{dirty&&notRecovered?'Alterações pendentes':saveState||'Sincronizado'}</span>{page&&<><button className={'nx-icon-button '+(currentMeta.favorite?'nx-starred':'')} title="Favoritar página" disabled={!isAdmin} onClick={toggleFav}>☆</button><div className="nx-dropdown-anchor"><button className="nx-pill-button" onClick={()=>setExportMenu(v=>!v)}>⇩ <span>Exportar</span></button>{exportMenu&&<div className="nx-export-menu"><button onClick={()=>exportDocument('md')}>Documento Markdown (.md)</button><button onClick={()=>exportDocument('json')}>Backup de blocos (.json)</button><button onClick={()=>{window.print();setExportMenu(false);}}>Imprimir / PDF</button></div>}</div></>}
       <button className="nx-icon-button" title="Alternar tema" onClick={()=>{const next=!dark;setDark(next);localStorage.setItem('nx_docs_theme',next?'dark':'light');}}>{dark?'☼':'☾'}</button></div>
      </header>
      <div className="nx-insert-bar">
        <span className="nx-insert-label">✧ &nbsp; Inserir:</span>{TYPES.map(([type,label,symbol])=><button key={type} disabled={!isEditing||!page} onClick={()=>addBlock(type)} title={label} className={['tabs','table'].includes(type)?'nx-featured '+type:''}>{symbol} <span>{label}</span></button>)}{isAdmin&&<><button disabled={!isEditing||busy} title="Inserir imagem" onClick={()=>imageInput.current?.click()}>▧ <span>Imagem</span></button><input ref={imageInput} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={e=>{const f=e.target.files?.[0];e.target.value='';void uploadImage(f);}}/></>}
      </div>
      <main className="nx-scroll" aria-label="Editor e biblioteca de conhecimento">
       {notice&&<div className="nx-toast" role="status"><span>{notice}</span><button onClick={()=>setNotice('')}>×</button></div>}
       {!page?<div className="nx-landing"><span className="nx-breadcrumb-label">DOCUMENTAÇÃO &amp; CONHECIMENTO</span><h1>Seu conhecimento, organizado.</h1><p>Biblioteca do Centro de Inteligência Jurídica 190. Pesquise guias, protocolos orientativos e páginas publicadas.</p>
         <button className="nx-landing-search" onClick={()=>setCommand(true)}>⌕ &nbsp; Buscar na documentação <kbd>Ctrl K</kbd></button>
         <h2>Explorar espaços</h2><div className="nx-space-cards">{spaces.map((s,i)=><button key={s} onClick={()=>{const first=pages.find(p=>p.space===s);if(first)open(first);else createPage(s)}}><span>{['🛡️','📚','⚖️','🧠','📘'][i%5]}</span><strong>{s}</strong><small>{pages.filter(p=>p.space===s).length} páginas</small></button>)}</div>
         {isAdmin&&<button className="nx-create-btn nx-landing-create" onClick={()=>createPage()}>⊕ Nova página</button>}</div>:<>
        <div className={'nx-page-cover '+COVERS[(currentMeta.coverIndex||0)%COVERS.length]}>{isAdmin&&<button className="nx-cover-change" onClick={()=>patchMeta({coverIndex:((currentMeta.coverIndex||0)+1)%COVERS.length})}>◉ Alterar capa</button>}</div>
        <article className="nx-page-body">
          <div className="nx-heading-row"><div className="nx-emoji-wrapper"><button className="nx-page-emoji" disabled={!isAdmin} onClick={()=>setEmojiPicker(v=>!v)}>{currentMeta.icon||'📘'}</button>{emojiPicker&&<div className="nx-emoji-popover">{ICONS.map(i=><button key={i} onClick={()=>{patchMeta({icon:i});setEmojiPicker(false);}}>{i}</button>)}</div>}</div>
          <div className="nx-status-actions"><span className={'nx-doc-badge '+(page.status==='published'?'published':'draft')}>● &nbsp; {status}</span><small>Editado {page.updated_at?new Date(page.updated_at).toLocaleDateString('pt-BR'):'agora'}</small></div></div>
          <div className="nx-document-header"><input className="nx-doc-title" aria-label="Título do documento" value={page.title||''} readOnly={!isEditing} onChange={e=>patch({title:e.target.value})} placeholder="Título do documento…"/>
          <input className="nx-doc-subtitle" aria-label="Descrição da página" value={currentMeta.subtitle||''} readOnly={!isEditing} onChange={e=>patchMeta({subtitle:e.target.value})} placeholder="Adicione uma breve descrição ou contexto da página…"/></div>
          <div className="nx-edit-controls">{isAdmin&&<>{!isEditing?<button className="nx-primary-small" onClick={()=>{baseline.current=JSON.stringify(page);setMode('edit');}}>✎ Editar página</button>:<>
            <select aria-label="Espaço do documento" value={page.space} onChange={e=>patch({space:e.target.value})}>{[...new Set([page.space,...spaces])].map(x=><option key={x}>{x}</option>)}</select><select aria-label="Página superior" value={page.parent_id||""} onChange={e=>patch({parent_id:e.target.value||null})}><option value="">Sem página superior</option>{pages.filter(p=>p.id!==page.id).map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select>
            <button className="nx-muted-button" disabled={busy} onClick={()=>persistDraft()}>Salvar recuperação</button><button className="nx-muted-button" disabled={busy} onClick={()=>save('draft')}>Salvar rascunho</button><button className="nx-primary-small" disabled={busy} onClick={()=>save('published')}>{busy?'Salvando…':'Publicar'}</button>
          </>}{page.id&&<button className="nx-muted-button" onClick={viewHistory}>Histórico</button>}</>}</div>
          <div className="nx-blocks">{blockList.map((block,index)=><Block key={block.id} block={block} index={index} total={blockList.length} editable={isEditing}
           onChange={b=>changeBlock(index,b)} onMove={direction=>blockMove(index,direction)}
           onDuplicate={()=>{const items=[...blockList];items.splice(index+1,0,{...structuredClone(block),id:uid()});updateBlocks(items)}}
           onDelete={()=>updateBlocks(blockList.filter((_,i)=>i!==index))}
           openPalette={()=>{setBlockPalette(index+1);setShowPalette(true);}} onInsert={type=>addBlock(type,index+1)}/>)}</div>
          {isEditing&&<div className="nx-bottom-insert"><button onClick={()=>addBlock('paragraph')}>＋ &nbsp; Clique para adicionar um parágrafo ou digite / para comandos</button><button onClick={()=>{setBlockPalette(blockList.length);setShowPalette(true)}}>＋ Explorar todos os blocos</button></div>}
          {history.length>0&&<details className="nx-versions" open><summary>Histórico de revisões ({history.length})</summary>{history.map((h,i)=><div key={i}>Revisão {h.revision} — {new Date(h.created_at).toLocaleString('pt-BR')} {h.metadata?.status==='published'?'(Publicada)':'(Rascunho)'}</div>)}</details>}
        </article></>}
      </main>
    </div>
    {showPalette&&<div className="nx-modal-scrim" onMouseDown={e=>{if(e.target===e.currentTarget)setShowPalette(false)}}><div className="nx-command-modal"><div className="nx-modal-title"><strong>Inserir novo bloco</strong><button onClick={()=>setShowPalette(false)}>ESC ×</button></div><div className="nx-command-list">{TYPES.map(([type,label,symbol])=><button key={type} onClick={()=>addBlock(type,blockPalette??undefined)}><span>{symbol}</span><b>{label}</b><small>Inserir no documento</small></button>)}</div></div></div>}
    {command&&<div className="nx-modal-scrim" onMouseDown={e=>{if(e.target===e.currentTarget)setCommand(false)}}><div className="nx-command-modal"><div className="nx-command-search"><span>⌕</span><input autoFocus aria-label="Buscar páginas e documentos" placeholder="Buscar páginas, espaços ou executar ação…" value={query} onChange={e=>setQuery(e.target.value)}/><button onClick={()=>setCommand(false)}>ESC</button></div><div className="nx-command-list">{filtered.slice(0,30).map(p=><button key={p.id} onClick={()=>{open(p);setCommand(false);}}><span>{p.nexus_meta?.icon||'📘'}</span><b>{p.title}</b><small>{p.space}</small></button>)}{!filtered.length&&<p>Nenhuma página encontrada.</p>}</div></div></div>}
    {newSpace&&<div className="nx-modal-scrim"><form className="nx-small-modal" onSubmit={e=>{e.preventDefault();const value=spaceValue.trim().slice(0,80);if(value){setSpacesExtra(p=>[...new Set([...p,value])]);setNewSpace(false);createPage(value);}}}><h3>Criar novo espaço</h3><input autoFocus value={spaceValue} onChange={e=>setSpaceValue(e.target.value)} placeholder="Nome do espaço" maxLength={80} required/><div><button type="button" onClick={()=>setNewSpace(false)}>Cancelar</button><button type="submit" className="nx-primary-small">Criar espaço</button></div></form></div>}
  </section>;
}
