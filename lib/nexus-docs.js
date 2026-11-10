import {cleanDocument} from './documentation.js';

const ICONS=new Set(['🚀','📘','⚡','🛠️','🎯','📊','🧩','🛡️','💡','🗂️','🏛️','🧪','🌐','🔥','✨','📌','🧠','💻','📚','⚖️','🚓']);
const TYPES=new Set(['rich','paragraph','h1','h2','h3','callout','tabs','table','checklist','kanban','code','toggle','divider']);
const text=(value,max=500)=>String(value??'').slice(0,max).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
const html=(value,max=16000)=>cleanDocument(text(value,max));
const strip=(value,max=500)=>text(value,max).replace(/<[^>]*>/g,'');
const id=value=>/^[a-zA-Z0-9_-]{1,90}$/.test(String(value||''))?String(value):crypto.randomUUID();
const boundedArray=(value,max)=>Array.isArray(value)?value.slice(0,max):[];
function normalizedBlock(item){
 const b=item&&typeof item==='object'?item:{};
 const type=TYPES.has(b.type)?b.type:'paragraph';
 const basic={id:id(b.id),type};
 if(['rich','paragraph','h1','h2','h3'].includes(type))return {...basic,content:html(b.content,15000)};
 if(type==='divider')return basic;
 if(type==='callout'||type==='toggle')return {...basic,title:strip(b.title,180),content:html(b.content,12000),variant:['info','success','warning','danger'].includes(b.variant)?b.variant:'info',open:b.open!==false};
 if(type==='tabs')return {...basic,activeTabIndex:Math.min(19,Math.max(0,Number(b.activeTabIndex)||0)),tabs:boundedArray(b.tabs,16).map(t=>({id:id(t?.id),title:strip(t?.title,100),content:html(t?.content,9000)}))};
 if(type==='table')return {...basic,headers:boundedArray(b.headers,12).map(x=>strip(x,200)),rows:boundedArray(b.rows,100).map(row=>boundedArray(row,12).map(x=>strip(x,500)))};
 if(type==='checklist')return {...basic,items:boundedArray(b.items,80).map(item=>({id:id(item?.id),text:strip(item?.text,500),done:Boolean(item?.done)}))};
 if(type==='kanban')return {...basic,columns:boundedArray(b.columns,6).map(c=>({id:id(c?.id),title:strip(c?.title,100),cards:boundedArray(c?.cards,50).map(x=>({id:id(x?.id),text:strip(x?.text,500)}))}))};
 if(type==='code')return {...basic,language:strip(b.language,30),code:text(b.code,24000)};
 return basic;
}
export function normalizeNexusMeta(value){
 const source=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 const blocks=boundedArray(source.blocks,160).map(normalizedBlock);
 return {icon:ICONS.has(source.icon)?source.icon:'📘',subtitle:strip(source.subtitle,500),
   coverIndex:Math.min(5,Math.max(0,Number.isInteger(source.coverIndex)?source.coverIndex:0)),
   favorite:Boolean(source.favorite),blocks};
}
const escape=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export function renderNexusContent(meta){
 return meta.blocks.map(b=>{
  if(['rich','paragraph'].includes(b.type))return b.content;
  if(['h1','h2','h3'].includes(b.type))return '<'+b.type+'>'+b.content+'</'+b.type+'>';
  if(b.type==='divider')return '<hr>';
  if(b.type==='callout')return '<blockquote><strong>'+escape(b.title)+'</strong><p>'+b.content+'</p></blockquote>';
  if(b.type==='toggle')return '<h3>'+escape(b.title)+'</h3><p>'+b.content+'</p>';
  if(b.type==='tabs')return b.tabs.map(t=>'<h3>'+escape(t.title)+'</h3><p>'+t.content+'</p>').join('');
  if(b.type==='table')return '<table><thead><tr>'+b.headers.map(h=>'<th>'+escape(h)+'</th>').join('')+'</tr></thead><tbody>'+b.rows.map(row=>'<tr>'+b.headers.map((_,i)=>'<td>'+escape(row[i])+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
  if(b.type==='checklist')return '<ul data-type="taskList">'+b.items.map(x=>'<li data-type="taskItem" data-checked="'+x.done+'"><p>'+escape(x.text)+'</p></li>').join('')+'</ul>';
  if(b.type==='kanban')return '<table><thead><tr>'+b.columns.map(c=>'<th>'+escape(c.title)+'</th>').join('')+'</tr></thead><tbody><tr>'+b.columns.map(c=>'<td><ul>'+c.cards.map(card=>'<li>'+escape(card.text)+'</li>').join('')+'</ul></td>').join('')+'</tr></tbody></table>';
  if(b.type==='code')return '<pre><code>'+escape(b.code)+'</code></pre>';
  return '';
 }).join('\n');
}
