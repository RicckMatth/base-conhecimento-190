// Pós-processamento defensivo da resposta do Gemini: o catálogo e as perguntas
// são a fonte de verdade. Porcentagens são proximidade editorial estimada pela IA,
// nunca probabilidade de crime, desempenho calibrado ou homologação.
import {evaluateTriage,questionOptions,questionsFor} from './triage.js';

const SHORT_REASON=320;
export function normalizeNatureSuggestions(raw,sources=[]){
 const allowed=new Map((Array.isArray(sources)?sources:[]).filter(x=>x&&typeof x.code==='string').map(x=>[x.code,x]));
 const seen=new Set(),results=[];
 for(const item of Array.isArray(raw)?raw:[]){
  if(!item||typeof item.code!=='string'||!allowed.has(item.code)||seen.has(item.code))continue;
  const pct=item.proximidade;
  if(!Number.isInteger(pct)||pct<0||pct>100)continue;
  const match=allowed.get(item.code);
  seen.add(item.code);
  results.push({
   code:match.code,title:match.title||match.officialNature||'Natureza sem título',
   proximity:pct,
   reason:typeof item.motivo==='string'?item.motivo.trim().slice(0,SHORT_REASON):'Correspondência estimada a partir dos fatos relatados.',
  });
  if(results.length>=3)break;
 }
 return results.sort((a,b)=>b.proximity-a.proximity);
}

const fallbackPriority=['ongoing','injured','safe','vulnerable','threat','weapons','address','time','peopleCount','suspectHere','relationship','witness','evidence','responders','lastSeen','vehicle'];
export function essentialSondagem({text='',suggestedTopics=[],nature=null,isOccurrence=true}={}){
 if(!isOccurrence)return [];
 const options=questionOptions();
 const allowed=new Map(options.map(q=>[q.id,q]));
 const profile=nature?{...nature,id:'catalogo-feedback'}:{category:'Pessoas',id:'catalogo-feedback'};
 const enriched={...profile,learnedTriage:options.map(q=>({topic:q.id}))};
 const remaining=new Set(evaluateTriage(enriched,text).pending.map(q=>q.id));
 const preferred=questionsFor(profile).map(q=>q.id).filter(id=>allowed.has(id));
 const selected=[],seen=new Set();
 const pick=id=>{
  if(typeof id!=='string'||!allowed.has(id)||!remaining.has(id)||seen.has(id))return;
  selected.push({topic:id,question:allowed.get(id).text});seen.add(id);
 };
 for(const id of Array.isArray(suggestedTopics)?suggestedTopics:[])pick(id);
 // Relevância contextual: completar com perguntas do perfil da natureza.
 for(const id of preferred)if(selected.length<5)pick(id);
 // Sem hipótese segura, ainda há sondagem de segurança/localização pertinente.
 for(const id of fallbackPriority)if(selected.length<5)pick(id);
 for(const q of options)if(selected.length<5)pick(q.id);
 return selected.slice(0,5);
}
