import {isQuestion,normalizeText,aiFailure} from './assistant.js';
import {pendingSuggestedQuestions} from './triage.js';

export const REVIEW_NOTICE='A ausência de elementos no relato não comprova ausência de crime. Não encerre nem recuse o registro automaticamente. Confirme as informações e siga o protocolo institucional e a autoridade competente. Risco à vida ou à integridade exige avaliação de proteção mesmo sem crime identificado.';
export const FAMILY_TOPICS=['womanAssault','childAssault','threat','childSafety','childLocationKnown','custodyOrder','carContact','safe','protection'];
export function familyContext(text){
 const n=normalizeText(text);
 return /\b(?:filh[oa]s?|criancas?|bebes?|menores?)\b/.test(n)&&/\b(?:pai|mae|homem|mulher|marido|esposa|companheir[oa]|genitor|genitora)\b/.test(n);
}
export function isNarrativeRequest(text,local,route){
 if(route==='/admin/ai/test'||local?.tipo==='faq')return false;
 return route==='/analyze'||!isQuestion(text)||(/\b(?:ele|ela|homem|mulher|meu|minha|crianca)\b/.test(normalizeText(text))&&/\b(?:levou|pegou|discutiu|agrediu|ameacou|saiu|trancou|impediu)\b/.test(normalizeText(text)));
}
export function needsNarrativeReview(text,local){
 if(familyContext(text)||local?.tipo!=='classificacao')return true;
 // Preserve the immediate local path for operational emergencies and well-supported
 // multi-group matches. A lexical match alone never establishes a criminal offence.
 if(['Emergência','Trânsito','Meio ambiente'].includes(local.principal?.category))return false;
 return !(local.indiceHeuristico>=90&&local.principal?.requiredGroups?.length>=2);
}
export function clarificationQuestions(text,topics=[]){
 const n=normalizeText(text);
 const family=familyContext(text)?FAMILY_TOPICS.filter(id=>!(id==='carContact'&&!/\b(?:carro|veiculo|automovel|moto)\b/.test(n))&&!(['womanAssault','protection'].includes(id)&&!/\b(?:mulher|mae|esposa|companheira)\b/.test(n))):[];
 const ids=[...new Set([...family,...topics])].slice(0,14);
 // No nature is required to ask a clarification. These questions are never learned
 // under a guessed nature. Existing conservative detectors hide only explicit answers.
 return ids.flatMap(id=>pendingSuggestedQuestions({id:'catalogo-clarification'},text,[id]));
}
export function assessmentFromAI(structured,text){
 const allowed=['indicios_relatados','informacao_insuficiente','sem_indicios_relatados'];
 let status=allowed.includes(structured?.avaliacaoPenal?.status)?structured.avaliacaoPenal.status:'informacao_insuficiente';
 const raw=structured?.avaliacaoPenal?.trechosIndicativos;
 const clauses=String(text).split(/[.!?;\n]/).map(normalizeText);
 const excerpts=[...new Set(Array.isArray(raw)?raw:[])].filter(x=>typeof x==='string'&&x.trim().length>=5&&x.length<=240&&clauses.some(c=>c.includes(normalizeText(x))&&!/\b(?:nao|sem|nunca|talvez|parece|desconhec|negou|perguntou)\b/.test(c))).slice(0,3);
 // Unsupported evidence or unanswered key family circumstances cannot justify a
 // categorical positive/negative result. Missing details remain missing.
 if(status==='indicios_relatados'&&!excerpts.length)status='informacao_insuficiente';
 if(status==='sem_indicios_relatados'&&clarificationQuestions(text).length)status='informacao_insuficiente';
 return {status,excerpts:status==='indicios_relatados'?excerpts:[],notice:REVIEW_NOTICE,source:'gemini'};
}
export async function reviewNarrative({text,local,runAI}){
 if(!needsNarrativeReview(text,local))return {...local,assessment:{status:'hipotese_local',notice:REVIEW_NOTICE,source:'local'}};
 try{return await runAI();}
 catch(error){
  const failure=aiFailure(error);
  return {tipo:'indefinido',source:'local',mensagem:'A complementação pelo Gemini não foi concluída. Não é possível concluir a avaliação penal com os dados disponíveis.',
   assessment:{status:'informacao_insuficiente',notice:REVIEW_NOTICE,source:'local'},
   clarificationQuestions:clarificationQuestions(text,familyContext(text)?[]:['threat','injured','safe','ongoing']),
   aiReview:{state:'unavailable',code:error?.code==='AI_NOT_CONFIGURED'?'AI_NOT_CONFIGURED':error?.status===429?'quota':failure.code,message:error?.code==='AI_NOT_CONFIGURED'?'Gemini ainda não configurado.':failure.message}};
 }
}

// Discard an unsafe generated operational conclusion rather than displaying it
// alongside a contradictory warning. This guard is deliberately conservative.
export function validateNarrativeAnswer(answer){
 const n=normalizeText(answer);
 if(/\b(?:nao (?:ha|existe) (?:nenhum |qualquer )?crime|nao houve crime|nao ha necessidade de (?:abertura|abrir|registrar)|nao (?:e necessario|precisa|deve) (?:abrir|registrar)|dispensa (?:o )?registro|encerre (?:o )?atendimento|recuse (?:o )?registro)\b/.test(n))throw Object.assign(new Error('AI_UNSAFE_OPERATIONAL_CONCLUSION'),{code:'AI_UNSAFE_OPERATIONAL_CONCLUSION'});
 return answer;
}

export function validateNarrativeOutput(output,topicOptions,sourceCodes){
 const permitted=['resposta','natureCode','questionTopics','avaliacaoPenal'];
 const a=output?.avaliacaoPenal;
 if(!output||typeof output!=='object'||Object.keys(output).some(k=>!permitted.includes(k))||
  typeof output.resposta!=='string'||!output.resposta.trim()||output.resposta.length>6000||
  !(output.natureCode===null||sourceCodes.includes(output.natureCode))||
  !Array.isArray(output.questionTopics)||output.questionTopics.length>6||!output.questionTopics.every(id=>topicOptions.includes(id))||
  !a||Object.keys(a).some(k=>!['status','trechosIndicativos'].includes(k))||
  !['indicios_relatados','informacao_insuficiente','sem_indicios_relatados'].includes(a.status)||
  !Array.isArray(a.trechosIndicativos)||a.trechosIndicativos.length>3||!a.trechosIndicativos.every(t=>typeof t==='string'&&t.trim().length>=5&&t.length<=240))throw new Error('AI_INVALID_NARRATIVE_OUTPUT');
 return output;
}
