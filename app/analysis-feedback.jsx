'use client';
import {useEffect,useRef,useState} from 'react';
import {Icon} from './icons.jsx';

export default function AnalysisFeedback({result}){
 const [vote,setVote]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(false);
 const current=useRef(result.feedbackTicket);
 useEffect(()=>{current.current=result.feedbackTicket;setVote(null);setBusy(false);setMessage('');setError(false);return()=>{current.current=null;};},[result.feedbackTicket]);
 async function submit(next){
  if(busy)return;
  const ticket=result.feedbackTicket;setBusy(true);setError(false);setMessage('');
  try{
   const response=await fetch('/api/analysis-feedback',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticket,vote:next})});
   const data=await response.json();if(!response.ok)throw new Error(data.error||'Não foi possível registrar sua avaliação.');
   if(current.current!==ticket)return;
   setVote(next);setMessage(data.message);
  }catch(e){if(current.current===ticket){setError(true);setMessage(e.message||'Falha ao registrar avaliação. Tente novamente.');}}
  finally{if(current.current===ticket)setBusy(false);}
 }
 return <section className="analysis-feedback" aria-label="Avaliação das perguntas do Gemini">
  {!!result.analysisQuestions?.length&&<div className="feedback-questions"><span className="feedback-eyebrow">Perguntas sugeridas · {result.feedbackNature?.title}</span><ul>{result.analysisQuestions.map(q=><li key={q.topic}>{q.question}</li>)}</ul></div>}
  {result.feedbackTicket&&<><div className="feedback-actions"><div><strong>Estas perguntas foram úteis?</strong><small>O like aprova somente perguntas padronizadas para esta natureza. O relato e a resposta não são salvos no aprendizado.</small></div><div className="feedback-buttons"><button type="button" aria-label="Like: aprovar perguntas" aria-pressed={vote==='like'} disabled={busy} onClick={()=>submit('like')}><Icon name="thumbUp" size={19}/><span>Like</span></button><button type="button" aria-label="Dislike: não aprender perguntas" aria-pressed={vote==='dislike'} disabled={busy} onClick={()=>submit('dislike')}><Icon name="thumbDown" size={19}/><span>Dislike</span></button></div></div><p className={'feedback-status'+(error?' feedback-error':'')} role="status" aria-live="polite">{busy?'Registrando avaliação…':message||'Sem aprovação, nenhuma pergunta desta análise é aprendida.'}</p></>}
 </section>;
}
