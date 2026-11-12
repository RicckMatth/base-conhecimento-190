'use client';
import {useState} from 'react';

export default function GeminiInsights({result}){
 if(result?.responseType!=='relato')return null;
 const matches=Array.isArray(result.natureSuggestions)?result.natureSuggestions:[];
 const questions=Array.isArray(result.analysisQuestions)?result.analysisQuestions.slice(0,5):[];
 const roles=result.roleAnalysis;
 const [selected,setSelected]=useState(null),[copied,setCopied]=useState('');
 const chosen=matches.find(x=>x.code===selected)||matches[0];
 async function copy(text,what){
  try{await navigator.clipboard.writeText(text);setCopied(what);}catch{setCopied('Falha ao copiar.');}
 }
 return <div className="ai-report" aria-label="Reconhecimento local e natureza sugerida">
  {!!roles&&<section className="ai-role-section" aria-label="Decomposição contextual do relato">
   <div className="ai-panel-heading"><div><span className="ai-eyebrow">ANÁLISE SINTÁTICA OFFLINE</span><h4>Quem participa do relato?</h4>
    <p>Separação contextual inspirada no parser SADE. Campos não reconhecidos permanecem indefinidos.</p></div><span className="ai-panel-count">Sem IA</span></div>
   <div className="ai-role-grid">
    <div><small>QUEM LIGA</small><strong>{roles.caller}</strong></div>
    <div><small>VÍTIMA / PESSOA ATINGIDA</small><strong>{roles.victim}</strong></div>
    <div><small>INDIVÍDUO MENCIONADO</small><strong>{roles.author}</strong></div>
    <div><small>ARMA / INSTRUMENTO</small><strong>{roles.instrument}</strong></div>
   </div>
   <p className="ai-method-note">{roles.scene}. Papéis são pistas textuais e devem ser confirmados pelo atendente.</p>
  </section>}
  {result.insufficientData&&<div className="ai-caution" role="note">
   <span className="ai-caution-symbol">!</span><div><strong>Elementos insuficientes para classificação segura</strong>
    <p>Os códigos exibidos são hipóteses para conferência. Não existe conclusão automática de crime ou tipificação.</p></div>
  </div>}
  <section className="ai-ranking" aria-label="Sugestões locais de natureza">
   <div className="ai-panel-heading"><div><span className="ai-eyebrow">CATÁLOGO SADE · RECONHECIMENTO LOCAL</span><h4>Naturezas mais próximas</h4>
    <p>Regras contextuais, correspondência de termos e filtros contra falsos positivos.</p></div><span className="ai-panel-count">{matches.length} hipótese{matches.length===1?'':'s'}</span></div>
   {matches.length?<div className="ai-ranking-list">{matches.map((c,i)=><article className={'ai-match'+(chosen?.code===c.code?' ai-match-picked':'')} key={c.code}>
    <div className="ai-match-head"><span className="ai-match-rank">{String(i+1).padStart(2,'0')}</span>
     <div><strong>{c.title}</strong><small>{c.code}</small></div>
     <span className="ai-percent" aria-label={'Índice heurístico de proximidade: '+c.proximity+' por cento'}>{c.proximity}%</span>
    </div>
    <div className="ai-proximity-bar" role="meter" aria-label={'Proximidade textual de '+c.title} aria-valuenow={c.proximity} aria-valuemin={0} aria-valuemax={100}><span style={{width:c.proximity+'%'}}/></div>
    {c.reason&&<p>{c.reason}</p>}
    <div className="ai-match-actions"><button type="button" onClick={()=>setSelected(c.code)} aria-pressed={chosen?.code===c.code}>{chosen?.code===c.code?'Natureza em destaque':'Destacar esta natureza'}</button>
    <button type="button" onClick={()=>copy(c.code+' · '+c.title,c.code)}>{copied===c.code?'Copiado!':'Copiar código e nome'}</button></div>
   </article>)}</div>:<div className="ai-no-match"><strong>Não há natureza sustentada pelo texto até o momento</strong><p>A sondagem abaixo ajuda a confirmar elementos antes de associar uma natureza.</p></div>}
   <p className="ai-method-note">O percentual é um <b>índice heurístico de semelhança textual</b>, não foi calibrado como probabilidade de acerto, crime ou prioridade de despacho. Naturezas são sugestões sujeitas a validação.</p>
  </section>
  {questions.length>0&&<section className="ai-question-panel" aria-label="Cinco perguntas essenciais de sondagem">
   <div className="ai-panel-heading"><div><span className="ai-eyebrow">SONDAGEM ORIENTATIVA</span><h4>5 perguntas essenciais</h4><p>Priorizam fatos ainda não informados e segurança dos envolvidos.</p></div><span className="ai-panel-count">{questions.length}/5</span></div>
   <ol className="ai-question-list">{questions.map((q,i)=><li key={q.topic||i}><span>{String(i+1).padStart(2,'0')}</span><p>{q.question}</p></li>)}</ol>
   <p className="ai-method-note">Evite presumir respostas. Se alguma pergunta já foi respondida, confirme a informação e priorize as demais; o reconhecimento é automatizado e pode falhar.</p>
  </section>}
 </div>;
}
