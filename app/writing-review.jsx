'use client';
import { useEffect,useRef,useState } from 'react';
import { correctReport } from '../lib/writing.js';
import { Icon } from './icons.jsx';

export default function WritingReview({original='',suggested='',aiConfigured=false}){
 const base=original||suggested;
 const local=correctReport(base);
 const requestVersion=useRef(0),latestBase=useRef(base),reviewBase=useRef('');latestBase.current=base;
 const [review,setReview]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[copied,setCopied]=useState(false);
 useEffect(()=>{requestVersion.current++;setReview('');setError('');setCopied(false);setBusy(false);},[base]);
 if(!local)return null;
 const hasReview=Boolean(review&&reviewBase.current===base);
 const text=hasReview?review:local;
 async function refine(){
  if(busy)return;const version=++requestVersion.current;const source=base;setBusy(true);setError('');setCopied(false);
  try{
   const response=await fetch('/api/rewrite',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:base})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Não foi possível revisar o relato.');
   if(typeof data.text!=='string'||!data.text.trim())throw new Error('A revisão não retornou texto.');
   if(requestVersion.current===version&&latestBase.current===source){reviewBase.current=source;setReview(data.text.toLocaleUpperCase('pt-BR'));}
  }catch(e){if(requestVersion.current===version&&latestBase.current===source)setError(e.message);}finally{if(requestVersion.current===version)setBusy(false);}
 }
 async function copy(){
  try{await navigator.clipboard.writeText(text.toLocaleUpperCase('pt-BR'));setCopied(true);setError('');}
  catch{setError('Não foi possível copiar automaticamente. Selecione o texto para copiar.');}
 }
 return <section className="writing-review" aria-label="Correção de escrita"><header className="writing-review-head"><Icon name="edit" size={19}/><h3>Relato corrigido</h3><span className="badge">CAIXA ALTA</span></header>
  <p className="writing-review-note">{hasReview?'Revisão complementar pelo Gemini.':'Correção local de português e acentuação.'} Confira os fatos antes de utilizar.</p>
  <pre className="writing-review-text">{text}</pre>
  <div className="btn-row"><button type="button" className="btn secondary tiny" onClick={copy}>{copied?'Texto copiado':'Copiar relato corrigido'}</button>{aiConfigured&&<button type="button" className="btn ghost tiny" disabled={busy} onClick={refine}>{busy?'Revisando…':'Correção insuficiente? Revisar com IA'}</button>}{hasReview&&<button type="button" className="btn ghost tiny" onClick={()=>{setReview('');setCopied(false);}}>Usar revisão local</button>}</div>
  {error&&<p className="writing-review-error" role="alert">{error}</p>}
  {aiConfigured&&<small>O Gemini só é consultado ao clicar em revisar com IA. O texto será enviado ao Google.</small>}
 </section>;
}
