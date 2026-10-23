// Pure recognition helpers: shared by local analysis and grounded AI retrieval.
export function normalizeText(value='') {
 return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/\bvc\b/g,'voce').replace(/\bpq\b/g,'por que').replace(/\bqdo\b/g,'quando')
  .replace(/\bconjuge\b/g,'companheiro').replace(/\bcel\b/g,'celular')
  .replace(/\bassaut[oou]+\b/g,'assalto').replace(/\brobo\b/g,'roubo')
  .replace(/\bameassa\b/g,'ameaca').replace(/\bfurtarao\b/g,'furtaram')
  .replace(/\s+/g,' ').trim();
}
export function isQuestion(text) {
 const n=normalizeText(text);
 return /\?/.test(n)||/^(?:ola[ ,!]*|bom dia[ ,!]*|boa tarde[ ,!]*|boa noite[ ,!]*)?(?:o que|oq\b|qual|quais|como|quando|onde|por que|porque|quem|quanto|quantas|quantos|posso|pode|poderia|preciso saber|me expliqu|explique|me ajud|tenho uma duvida|e se\b|e nesse caso|e no caso|isso (?:e|seria)|seria\b)/.test(n)
  ||/\b(?:duvida sobre|diferenca entre|gostaria de saber|quero saber|me explica|me diga|significa o que)\b/.test(n);
}
export function cleanHistory(history) {
 if(!Array.isArray(history))return [];
 return history.slice(-8).filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string')
  .map(m=>({role:m.role,content:m.content.trim().slice(0,1800)})).filter(m=>m.content);
}
const ignored=new Set('qual quais como quando onde isso esse essa para pelo pela pelos pelas uma umas uns que com sem dos das nao sim foi esta esse essa seria pode sobre voce quero saber tenho'.split(' '));
const equivalents={assalto:'roubo',roubaram:'roubo',furtaram:'furto',batendo:'agressao',apanhando:'agressao',bebado:'embriaguez',bebada:'embriaguez',acidente:'sinistro',sumiu:'desaparecimento',criancas:'crianca',vitimas:'vitima',agredida:'agressao',agredido:'agressao',agredir:'agressao',bater:'agressao'};
function words(text){return normalizeText(text).replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(t=>t.length>2&&!ignored.has(t)).map(t=>equivalents[t]||t);}
export function retrieveContext(text,entries=[],history=[]) {
 const previous=cleanHistory(history).filter(m=>m.role==='user').slice(-2).map(m=>m.content).join(' ');
 const query=[...new Set(words(text+' '+previous))];
 return entries.map(e=>{
  const title=words(e.title||e.officialNature||'');
  const detail=words([e.summary||e.explanation||'',...(e.tags||[])].join(' '));
  const score=query.reduce((s,t)=>s+(title.some(w=>w===t)?4:0)+(detail.includes(t)?1:0),0);
  return {entry:e,score};
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,5).map(x=>x.entry);
}
export function aiFailure(error) {
 const status=error?.statusCode||error?.status;
 if(status===401||status===403)return {code:'credentials',message:'A chave Gemini foi recusada. O administrador deve conferir a chave e suas permissões.'};
 if(status===429)return {code:'quota',message:'O Gemini atingiu o limite de uso ou cota. Confira a cota e o faturamento no Google AI Studio.'};
 if(status===404)return {code:'model',message:'O modelo Gemini configurado não está disponível. Confira GEMINI_MODEL na Vercel.'};
 if(error?.name==='TimeoutError'||error?.name==='AbortError')return {code:'timeout',message:'O Gemini demorou para responder. Tente novamente.'};
 return {code:'unavailable',message:'A IA está indisponível no momento. Tente novamente; a consulta local continua disponível.'};
}

const LOCAL_FAQ=[
 {match:n=>/\b(furto|furtar)\b/.test(n)&&/\b(roubo|roubar|assalto)\b/.test(n)&&/diferenc|disting|qual|como/.test(n),title:'Diferença entre furto e roubo',answer:'No furto, a subtração ocorre sem violência ou grave ameaça à pessoa. No roubo, há violência ou grave ameaça para a subtração, ou nas circunstâncias legalmente previstas. Para triagem, confirme como o bem foi levado, se houve ameaça ou agressão e se o fato continua em andamento. A natureza e a prioridade devem ser conferidas no protocolo local.'},
 {match:n=>/desaparec|sumiu/.test(n)&&/24|prazo|esperar|aguardar|quanto tempo/.test(n),title:'Desaparecimento: é necessário esperar?',answer:'Não é necessário esperar 24 horas para comunicar um desaparecimento. Registre as informações disponíveis e siga imediatamente o fluxo institucional, especialmente em situação de vulnerabilidade ou risco. Confirme o último local e horário conhecidos, características informadas e condições de risco.'},
 {match:n=>/lesao/.test(n)&&/vias de fato/.test(n)&&/diferenc|disting|qual|como/.test(n),title:'Lesão corporal e vias de fato',answer:'A distinção envolve a existência de ofensa à integridade corporal ou à saúde, cuja avaliação não depende apenas de marcas visíveis. Registre a agressão relatada, os sintomas e a necessidade de socorro, sem concluir diagnóstico. A tipificação cabe à autoridade competente; o operador deve conferir o protocolo local.'},
 {match:n=>/\b(furto|roubo)\b/.test(n)&&/\b(extravio|perda|perdi)\b/.test(n)&&/diferenc|disting/.test(n),title:'Extravio e subtração',answer:'Extravio é a perda de um objeto; furto envolve sua subtração por terceiro, sem violência ou grave ameaça à pessoa. No roubo, há violência ou grave ameaça. Confirme o que foi observado e o que é apenas suspeita antes de sugerir a natureza.'},
 {match:n=>/^(oi|ola|bom dia|boa tarde|boa noite|obrigado|obrigada)[!.\s]*$/.test(n),title:'Assistente Base 190',answer:'Olá! Você pode descrever uma situação, perguntar sobre uma natureza ou consultar diferenças e perguntas de triagem. Vou consultar primeiro a base local e usar o Gemini somente se ela não tiver uma resposta adequada.'},
 {match:n=>/como/.test(n)&&/funciona|usar/.test(n)&&/base 190|cerebro 190|este sistema/.test(n),title:'Como consultar a Base 190',answer:'Descreva o fato ou faça uma pergunta no chat. O sistema procura primeiro uma resposta local. Quando não encontra conteúdo suficiente, consulta o Gemini. A origem aparece na resposta. Para localizar fichas diretamente, use o Catálogo e seus filtros.'}
];
export function answerLocally({text,history=[],entries=[],classify}) {
 const n=normalizeText(text),question=isQuestion(text);
 const faq=LOCAL_FAQ.find(f=>f.match(n));
 if(faq)return {tipo:'faq',titulo:faq.title,resposta:faq.answer,source:'local'};
 if(question){
  // Only answer the supported type of question, with a strong title match.
  // A partial topic match does not answer a question about permission or procedure.
  const definition=/^(o que (?:e|significa)|oq e|qual (?:e )?(?:o conceito|a definicao)|me expliqu[e]? o que e)/.test(n);
  const triage=/quais (?:as )?perguntas|o que perguntar|perguntas de triagem/.test(n);
  if(definition||triage){
   const hits=retrieveContext(text,entries,[]);
   const relevant=hits.filter(e=>{
    const title=words(e.title||e.officialNature||'');
    const query=words(text).filter(t=>!['perguntas','perguntar','triagem','significa','conceito','definicao','explique'].includes(t));
    return query.length>0&&query.every(t=>title.includes(t));
   });
   if(relevant.length===1){const e=relevant[0];
    const content=triage?(e.triageQuestions?.join('\n')||e.body?.match(/Perguntas de triagem:\s*([\s\S]*?)(?=Máscara orientativa:|$)/)?.[1]?.trim()):(e.summary||e.explanation);
    if(content)return {tipo:'faq',titulo:e.title||e.officialNature,resposta:content,source:'local',references:[{code:e.code,title:e.title||e.officialNature}]};
   }
  }
  return null;
 }
 const result=classify?.(text);
 if(result?.tipo!=='classificacao')return null;
 const groups=result.principal?.requiredGroups||[];
 const affirmative=String(text).split(/[.!?;\n]/).map(normalizeText).filter(part=>!(/\b(nao|nunca|sem|talvez|parece|acho que|pode ser)\b/.test(part))).join(' ');
 const complete=groups.length>0&&groups.every(g=>g.some(term=>affirmative.includes(normalizeText(term))));
 // Negative answers in separate triage sentences do not negate the occurrence.
 // Never use negated/uncertain fragments as classification evidence.
 if(!complete)return null;
 const ambiguous=result.secundarias?.some(r=>r.officialNature!==result.principal.officialNature&&r.requiredGroups?.length&&r.requiredGroups.every(g=>g.some(t=>affirmative.includes(normalizeText(t))))&&r.category!==result.principal.category);
 if(ambiguous)return null;
 const {confianca,...safe}=result;
 return {...safe,indiceHeuristico:confianca,source:'local'};
}
