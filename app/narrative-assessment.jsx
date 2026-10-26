'use client';
const labels={
 informacao_insuficiente:['INFORMAÇÕES INSUFICIENTES PARA IDENTIFICAR INFRAÇÃO PENAL','Esclareça os fatos antes de concluir a análise.'],
 sem_indicios_relatados:['SEM INDÍCIOS PENAIS IDENTIFICADOS NO CONTEÚDO INFORMADO','A avaliação se limita às informações recebidas.'],
 indicios_relatados:['POSSÍVEIS INDÍCIOS PENAIS RELATADOS','Hipótese assistiva: confirme a conduta e suas circunstâncias.'],
 hipotese_local:['HIPÓTESE DA BASE LOCAL · NÃO É CONCLUSÃO PENAL','Uma natureza operacional sugerida não comprova a existência de crime.']
};
export default function NarrativeAssessment({result}){
 const assessment=result?.assessment,label=labels[assessment?.status];
 if(!label)return null;
 const incomplete=['informacao_insuficiente','sem_indicios_relatados'].includes(assessment.status);
 const questions=result.clarificationQuestions||[];
 return <section className={'narrative-assessment'+(incomplete?' narrative-assessment-critical':'')} aria-label="Avaliação dos elementos do relato">
  <div role="status" aria-live="polite"><strong>{label[0]}</strong><p>{label[1]}</p></div>
  <p className="narrative-assessment-notice">{assessment.notice}</p>
  {!!assessment.excerpts?.length&&<details><summary>Trechos do relato considerados na hipótese</summary><ul>{assessment.excerpts.map((text,i)=><li key={i}>{text}</li>)}</ul></details>}
  {result.aiReview?.state==='unavailable'&&<p className="narrative-assessment-failure">Complementação indisponível: {result.aiReview.message} Você pode ajustar o relato e analisar novamente.</p>}
  {!!questions.length&&<div className="narrative-clarifications"><h3>Perguntas-chave para esclarecer o fato</h3><p>Não presuma respostas. Acrescente ao relato somente o que foi efetivamente informado e analise novamente.</p><ol>{questions.map(q=><li key={q.topic}>{q.question}</li>)}</ol></div>}
 </section>;
}
