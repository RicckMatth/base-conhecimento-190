import {load} from 'cheerio';
import {createHash} from 'node:crypto';
import {sourceFor,ALTERNATIVE_SOURCES} from './sources.js';
export const hash=text=>createHash('sha256').update(text).digest('hex');
export function parseLaw(html){
 const $=load(html);$('script,style,nav,header,footer').remove();
 const blocks=[];let buffer='',historical=false;
 const blockTags=new Set(['p','div','h1','h2','h3','h4','h5','h6','li','tr','section','article','blockquote','center']);
 function flush(){const text=buffer.replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();if(text)blocks.push({text,historical});buffer='';historical=false;}
 function walk(node,old=false){
  if(node.type==='text'){buffer+=node.data;historical ||= old;return;}
  const name=node.name?.toLowerCase();const isBlock=blockTags.has(name);
  if(isBlock||name==='br')flush();
  const struck=old||['strike','s','del'].includes(name)||/text-decoration\s*:[^;]*line-through/i.test(node.attribs?.style||'');
  for(const child of node.children||[])walk(child,struck);
  if(isBlock)flush();
 }
 walk($('body')[0]);flush();
 if(blocks.length<2)throw Error('Fonte sem estrutura legislativa reconhecível.');
 const articles=[];let current=null,path=[];
 for(const block of blocks){
  const match=block.text.match(/^Art\.?\s*(\d+[.\d]*)(?:[º°o])?(?:\s*[-–]\s*([A-Z])(?![a-z]))?\b/i);
  if(match){current={number:match[1].replace(/\./g,'')+(match[2]?'-'+match[2].toUpperCase():''),ordinal:articles.length,path:[...path],blocks:[],text:'',status:'unverified'};articles.push(current);}
  if(/^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O)\b/.test(block.text)){const rank=/^PARTE/.test(block.text)?0:/^LIVRO/.test(block.text)?1:/^T[ÍI]TULO/.test(block.text)?2:/^CAP[ÍI]TULO/.test(block.text)?3:/^SUBSE/.test(block.text)?5:4;path=path.slice(0,rank);path[rank]=block.text;path=path.filter(Boolean);current=null;}
  if(current){current.blocks.push({...block,kind:/^§|^Par[áa]grafo único/i.test(block.text)?'paragraph':/^[IVXLCDM]+\s*[-–]/.test(block.text)?'item':/^[a-z]\)/.test(block.text)?'subitem':'text'});current.text+= (current.text?'\n':'')+block.text;}
 }
 if(!articles.length)throw Error('Nenhum artigo reconhecido. Importação bloqueada.');
 const duplicates=articles.filter((a,i)=>articles.findIndex(b=>b.number===a.number)!==i).map(a=>a.number);
 return {fullText:blocks.map(b=>b.text).join('\n'),articles,warnings:[...(duplicates.length?['Numeração repetida: redações históricas exigem conferência.']:[]),'Vigência e completude dependem de conferência humana.'],hash:hash(html)};
}
export async function fetchLaw(code){
 const primary=sourceFor(code),errors=[];
 for(const url of [primary.url,ALTERNATIVE_SOURCES[code]].filter(Boolean)){
 try{return await fetchSource({...primary,url});}catch(e){errors.push(url+': '+e.message);}
 }throw Error('Captura oficial falhou. '+errors.join(' | '));
}
async function fetchSource(source){
 const r=await fetch(source.url,{redirect:'error',signal:AbortSignal.timeout(9000)});
 if(!r.ok)throw Error('Fonte oficial indisponível: HTTP '+r.status);
 const reader=r.body.getReader();let size=0,parts=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8000000){await reader.cancel();throw Error('Fonte excede limite de 8 MB.');}parts.push(value);}
 const bytes=Buffer.concat(parts.map(p=>Buffer.from(p)));const head=bytes.subarray(0,3000).toString('ascii');const charset=(r.headers.get('content-type')+' '+head).match(/charset\s*=\s*["']?([\w-]+)/i)?.[1]||'windows-1252';
 const html=new TextDecoder(charset).decode(bytes);return {html,source,...parseLaw(html),retrievedAt:new Date().toISOString(),method:'official-fetch'};
}
export function diffArticles(before=[],after=[]){const keys=new Set([...before,...after].map(a=>a.number));return [...keys].map(number=>{const old=before.filter(a=>a.number===number).map(a=>a.text).join('\n');const next=after.filter(a=>a.number===number).map(a=>a.text).join('\n');return {number,status:!old?'added':!next?'removed':old===next?'unchanged':'changed',before:old,after:next};}).filter(x=>x.status!=='unchanged');}
