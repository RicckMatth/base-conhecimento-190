'use client';

export default function GeminiInsights({result}){
 if(result?.responseType!=='relato')return null;
 const matches=Array.isArray(result.natureSuggestions)?result.natureSuggestions:[];
 const questions=Array.isArray(result.analysisQuestions)?result.analysisQuestions.slice(0,5):[];
 return <div className="ai-report" aria-label="Sondagem e sugestões do Gemini">
  {result.insufficientData&&<div className="ai-caution" role="note">
   <span className="ai-caution-symbol">!</span>
   <div><strong>Informações insuficientes para uma classificação conclusiva</strong>
    <p>As naturezas abaixo, quando existentes, são apenas possibilidades de sondagem. Não presumem crime ou autoria.</p>
   </div>
  </div>}
  <section className="ai-ranking" aria-label="Naturezas sugeridas pelo Gemini">
   <div className="ai-panel-heading"><div><span className="ai-eyebrow">CLASSIFICAÇÃO ASSISTIDA</span><h4>Naturezas mais próximas do relato</h4><p>Comparação com as fichas cadastradas no catálogo da Base 190.</p></div><span className="ai-panel-count">{matches.length} hipótese{matches.length===1?'':'s'}</span></div>
   {matches.length?<div className="ai-ranking-list">{matches.map((c,i)=><article className="ai-match" key={c.code}>
    <div className="ai-match-head"><span className="ai-match-rank">{String(i+1).padStart(2,'0')}</span>
     <div><strong>{c.title}</strong><small>{c.code}</small></div>
     <span className="ai-percent" aria-label={'Proximidade estimada: '+c.proximity+' por cento'}>{c.proximity}%</span>
    </div>
    <div className="ai-proximity-bar" role="meter" aria-label={'Proximidade textual de '+c.title} aria-valuenow={c.proximity} aria-valuemin={0} aria-valuemax={100}><span style={{width:c.proximity+'%'}}/></div>
    {c.reason&&<p>{c.reason}</p>}
   </article>)}</div>:<div className="ai-no-match"><strong>Nenhuma natureza segura para sugerir neste momento</strong><p>É necessário esclarecer os fatos nas perguntas abaixo antes de associar o relato a alguma ficha do catálogo.</p></div>}
   <p className="ai-method-note">Os percentuais representam a <b>proximidade qualitativa estimada pelo Gemini</b>, sem calibração estatística. Não são probabilidade de acerto, confirmação de crime, prioridade de despacho nem indicação oficial.</p>
  </section>
  {!!questions.length&&<section className="ai-question-panel" aria-label="Cinco perguntas essenciais de sondagem">
   <div className="ai-panel-heading"><div><span className="ai-eyebrow">SONDAGEM OPERACIONAL</span><h4>5 perguntas essenciais</h4><p>Para esclarecer o que ainda não foi informado ou está contraditório.</p></div><span className="ai-panel-count">{questions.length}/5</span></div>
   <ol className="ai-question-list">{questions.map((q,i)=><li key={q.topic||i}><span>{String(i+1).padStart(2,'0')}</span><p>{q.question}</p></li>)}</ol>
   <p className="ai-method-note">Não presuma respostas positivas ou negativas. Registre apenas o que o solicitante efetivamente informou e confira o protocolo institucional.</p>
  </section>}
 </div>;
}
