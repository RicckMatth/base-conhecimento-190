'use client';
import {useEffect,useState} from 'react';
import {useEditor,EditorContent} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {Table,TableRow,TableCell,TableHeader} from '@tiptap/extension-table';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
const empty=()=>({title:'',space:'Geral',content:'',status:'draft'});
async function api(path='',options={}){const r=await fetch('/api/documentation'+path,{...options,headers:{'Content-Type':'application/json'},cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'Não foi possível carregar a documentação.');return d;}
export default function Documentation({isAdmin}){
 const [pages,setPages]=useState([]),[page,setPage]=useState(null),[query,setQuery]=useState(''),[editing,setEditing]=useState(false),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[versions,setVersions]=useState([]);
 const editor=useEditor({extensions:[StarterKit,Table.configure({resizable:true}),TableRow,TableCell,TableHeader,TaskList,TaskItem.configure({nested:true}),Highlight,Image,TextAlign.configure({types:['heading','paragraph']})],immediatelyRender:false,editable:editing,onUpdate:()=>setDirty(true)});
 async function refresh(){try{const d=await api();setPages(d.pages);}catch(e){setNotice(e.message);}}
 useEffect(()=>{refresh();},[]);
 useEffect(()=>{const guard=e=>{if(dirty&&!confirm('Descartar alterações não salvas?'))e.preventDefault();};window.addEventListener('base190:before-navigation',guard);return()=>window.removeEventListener('base190:before-navigation',guard);},[dirty]);
 useEffect(()=>{editor?.setEditable(editing);},[editor,editing]);
 useEffect(()=>{if(!dirty)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 function open(p,edit=false){if(dirty&&!confirm('Descartar alterações não salvas?'))return;setPage(p);setEditing(edit);setDirty(false);setVersions([]);setNotice('');editor?.commands.setContent(p.content||'',{emitUpdate:false});}
 async function save(status){setBusy(true);setNotice('');try{const d=await api('',{method:'POST',body:JSON.stringify({...page,content:editor.getHTML(),status})});setPage(d.page);setDirty(false);setEditing(false);setNotice(status==='published'?'Página publicada.':'Rascunho salvo.');await refresh();}catch(e){setNotice(e.message);}finally{setBusy(false);}}
 function command(name,arg){editor?.chain().focus()[name](arg).run();}
 const actions=[['↶','Desfazer','undo'],['↷','Refazer','redo'],['B','Negrito','toggleBold'],['I','Itálico','toggleItalic'],['U','Sublinhado','toggleUnderline'],['S','Tachado','toggleStrike'],['Marca','Destacar','toggleHighlight'],['• Lista','Lista com marcadores','toggleBulletList'],['1. Lista','Lista numerada','toggleOrderedList'],['☑','Checklist','toggleTaskList'],['❝','Citação','toggleBlockquote'],['</>','Código','toggleCodeBlock'],['—','Divisor','setHorizontalRule']];
 const filtered=pages.filter(p=>(p.title+' '+p.space+' '+p.content.replace(/<[^>]*>/g,' ')).toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
 return <section className="docs-workspace">
<aside className="docs-sidebar">
<span className="eyebrow">BIBLIOTECA 190</span>
<h2>Base de conhecimento</h2>
<input aria-label="Pesquisar documentação" placeholder="Pesquisar páginas e conteúdo…" value={query} onChange={e=>setQuery(e.target.value)}/>{isAdmin&&<button className="btn" onClick={()=>open(empty(),true)}>+ Criar página</button>}{[...new Set(filtered.map(p=>p.space))].map(space=>
<div key={space}>
<h4>{space}</h4>{filtered.filter(p=>p.space===space).map(p=>
<button className={'docs-page-link '+(page?.id===p.id?'selected':'')} key={p.id} onClick={()=>open(p)}>▤ {p.title}{p.status==='draft'&&<small>Rascunho</small>}</button>)}</div>)}{!filtered.length&&<p className="muted">Nenhuma página encontrada.</p>}</aside>
<main className="docs-main">{notice&&<p role="status" className="docs-notice">{notice}</p>}{!page?<div className="docs-empty">
<span className="eyebrow">DOCUMENTAÇÃO COMPARTILHADA</span>
<h1>Conhecimento ao alcance de todos.</h1>
<p>Organize orientações, guias e informações úteis em páginas pesquisáveis. Selecione uma página para ler{isAdmin?' ou crie a primeira documentação':''}.</p>
</div>:<>
<header className="docs-header">
<span>{page.space} / {page.title||'Nova página'}</span>
<div>{dirty&&<small>Alterações não salvas</small>}{isAdmin&&!editing&&<button className="btn" onClick={()=>setEditing(true)}>Editar</button>}{editing&&<>
<button className="btn secondary" disabled={busy} onClick={()=>save('draft')}>Salvar rascunho</button>
<button className="btn" disabled={busy} onClick={()=>save('published')}>{busy?'Salvando…':'Publicar'}</button>
</>}{isAdmin&&page.id&&<button className="btn secondary" onClick={async()=>{try{setVersions((await api('/history?id='+page.id)).versions);}catch(e){setNotice(e.message);}}}>Histórico</button>}</div>
</header>{editing&&<div className="docs-toolbar" role="toolbar" aria-label="Formatação">
<select aria-label="Estilo do parágrafo" onChange={e=>e.target.value==='p'?command('setParagraph'):command('toggleHeading',{level:Number(e.target.value)})}>
<option value="p">Parágrafo</option>
<option value="1">Título 1</option>
<option value="2">Título 2</option>
<option value="3">Título 3</option>
</select>{actions.map(([label,title,cmd])=>
<button type="button" key={cmd} title={title} aria-label={title} onClick={()=>command(cmd)}>{label}</button>)}<button onClick={()=>{const href=prompt('Endereço do link (https://…)');if(href&&/^https?:\/\//i.test(href))command('setLink',{href});}}>Link</button>
<button onClick={()=>command('unsetLink')}>Remover link</button>
<button onClick={()=>{const src=prompt('URL HTTPS da imagem');if(src&&/^https:\/\//i.test(src))command('setImage',{src});}}>Imagem</button>
<button onClick={()=>command('insertTable',{rows:3,cols:3,withHeaderRow:true})}>Tabela</button>
<button onClick={()=>command('addRowAfter')}>+ Linha</button>
<button onClick={()=>command('addColumnAfter')}>+ Coluna</button>
<button onClick={()=>command('deleteRow')}>− Linha</button>
<button onClick={()=>command('deleteColumn')}>− Coluna</button>
<button onClick={()=>command('deleteTable')}>Excluir tabela</button>{['left','center','right','justify'].map((v,i)=>
<button key={v} onClick={()=>command('setTextAlign',v)}>{['Esquerda','Centro','Direita','Justificar'][i]}</button>)}</div>}<article className="docs-paper">{editing?<>
<label>Espaço<input value={page.space} maxLength={80} onChange={e=>{setPage({...page,space:e.target.value});setDirty(true);}}/>
</label>
<input className="docs-title" aria-label="Título da página" placeholder="Título da página" maxLength={200} value={page.title} onChange={e=>{setPage({...page,title:e.target.value});setDirty(true);}}/>
</>:<h1>{page.title}</h1>}<p className="muted">{page.status==='published'?'Publicado':'Rascunho'} · Versão {page.revision||1}{page.updated_at?' · '+new Date(page.updated_at).toLocaleString('pt-BR'):''}</p>
<EditorContent editor={editor}/>
</article>{!!versions.length&&<section className="docs-versions">
<h3>Histórico de versões</h3>{versions.map(v=>
<details key={v.revision}>
<summary>Versão {v.revision} · {new Date(v.created_at).toLocaleString('pt-BR')}</summary>
<h4>{v.title}</h4>
<div dangerouslySetInnerHTML={{__html:v.content}}/>
<button className="btn secondary" onClick={()=>{open({...page,title:v.title,content:v.content},true);setDirty(true);}}>Usar conteúdo desta versão</button>
</details>)}</section>}</>}</main>
</section>;
}
