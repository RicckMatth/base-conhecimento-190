import {load} from 'cheerio';
import {createHash} from 'node:crypto';
import {sourceFor} from './sources.js';
export const hash=text=>createHash('sha256').update(text).digest('hex');
export function parseLaw(html){
 const $=load(html);$('script,style,nav,header,footer').remove();
 const blocks=[];
 $('p,h1,h2,h3,h4,li').each((_,el)=>{if($(el).parents('p,li').length)return;const text=$(el).text().replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();if(text)blocks.push({text,historical:$(el).find('strike,s,del').length>0||$(el).is('strike,s,del')});});
 if(blocks.length<2)throw Error('Fonte sem estrutura legislativa reconhecível.');
 const articles=[];let current=null,path=[];
 for(const block of blocks){
  const match=block.text.match(/^Art\.?\s*(\d+[.\d]*)(?:[º°o])?(?:\s*[-–]\s*([A-Z])(?![a-z]))?\b/i);
  if(match){current={number:match[1].replace(/\./g,'')+(match[2]?'-'+match[2].toUpperCase():''),ordinal:articles.length,path:[...path],blocks:[],text:'',status:'unverified'};articles.push(current);}
  if(/^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O)\b/.test(block.text)){path=[...path.slice(-4),block.text];current=null;}
  if(current){current.blocks.push({...block,kind:/^§|^Par[áa]grafo único/i.test(block.text)?'paragraph':/^[IVXLCDM]+\s*[-–]/.test(block.text)?'item':/^[a-z]\)/.test(block.text)?'subitem':'text'});current.text+= (current.text?'\n':'')+block.text;}
 }
 if(!articles.length)throw Error('Nenhum artigo reconhecido. Importação bloqueada.');
 const duplicates=articles.filter((a,i)=>articles.findIndex(b=>b.number===a.number)!==i).map(a=>a.number);
 return {fullText:blocks.map(b=>b.text).join('\n'),articles,warnings:[...(duplicates.length?['Numeração repetida: redações históricas exigem conferência.']:[]),'Vigência e completude dependem de conferência humana.'],hash:hash(html)};
}
export async function fetchLaw(code){
 const source=sourceFor(code);const r=await fetch(source.url,{redirect:'error',signal:AbortSignal.timeout(18000)});
 if(!r.ok)throw Error('Fonte oficial indisponível: HTTP '+r.status);
 const reader=r.body.getReader();let size=0,parts=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8000000){await reader.cancel();throw Error('Fonte excede limite de 8 MB.');}parts.push(value);}
 const bytes=Buffer.concat(parts.map(p=>Buffer.from(p)));const head=bytes.subarray(0,3000).toString('ascii');const charset=(r.headers.get('content-type')+' '+head).match(/charset\s*=\s*["']?([\w-]+)/i)?.[1]||'windows-1252';
 const html=new TextDecoder(charset).decode(bytes);return {html,source,...parseLaw(html),retrievedAt:new Date().toISOString(),method:'official-fetch'};
}
export function diffArticles(before=[],after=[]){const keys=new Set([...before,...after].map(a=>a.number));return [...keys].map(number=>{const old=before.filter(a=>a.number===number).map(a=>a.text).join('\n');const next=after.filter(a=>a.number===number).map(a=>a.text).join('\n');return {number,status:!old?'added':!next?'removed':old===next?'unchanged':'changed',before:old,after:next};}).filter(x=>x.status!=='unchanged');}
