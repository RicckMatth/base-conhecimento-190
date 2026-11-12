// Catálogo recebido em CSV: somente "id" e "natureza" são dados originais.
// Categoria, descrição e orientações abaixo são editoriais, não parecer jurídico.
// Arquivo deliberadamente mantido versionado e legível em data/.
import {readFileSync} from 'node:fs';

const raw=readFileSync(process.cwd()+'/data/naturezas_copom_corrigidas_v2.csv','utf8').replace(/^\uFEFF/,'');
const records=raw.trimEnd().split(/\r?\n/);
if(records.shift()!=='id,natureza')throw new Error('Cabeçalho inesperado da relação de naturezas COPOM.');
function parseRow(line){
 const p=line.indexOf(',');if(p<1)throw new Error('Linha inválida no catálogo de naturezas.');
 const id=Number(line.slice(0,p));let nature=line.slice(p+1);
 if(nature.startsWith('"')&&nature.endsWith('"'))nature=nature.slice(1,-1).replace(/""/g,'"');
 if(!Number.isSafeInteger(id)||id<1||!nature.trim())throw new Error('ID ou natureza inválidos no catálogo.');
 return {id,natureza:nature};
}
export const CSV_NATURES=Object.freeze(records.map(parseRow));
if(CSV_NATURES.length!==769||new Set(CSV_NATURES.map(v=>v.id)).size!==769||new Set(CSV_NATURES.map(v=>v.natureza)).size!==769)
 throw new Error('O catálogo COPOM deve conter exatamente 769 naturezas com IDs e nomes distintos.');
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
function categoryOf(title){
 const n=norm(title);
 if(/DOMESTIC|FAMILIAR|MPU|PROTETIVA|FEMINICIDIO/.test(n))return 'Violência doméstica e proteção';
 if(/DESAPAREC|CRIANCA|ADOLESCENT|IDOSO|VULNERAVEL/.test(n))return 'Proteção de pessoas';
 if(/FURTO|ROUBO|DANO |^DANO$|ESTELIONATO|APROPRIAC|RECEPTAC|EXTORSAO|PATRIMONI|PIRATARIA|VEICULO ROUBADO/.test(n))return 'Patrimônio e fraudes';
 if(/ACIDENTE|TRANSITO|TRAFEGO|VIARIA|CNH|DIRECAO DE VEICULO|VEICULO AUTOMOTOR|RODOVIA|ESTACIONAMENTO/.test(n))return 'Trânsito e mobilidade';
 if(/INCENDIO|DESMAIO|INCONSCIENCIA|RESGATE|SALVAMENTO|BOMBEIRO|SOCORRO|EMERGENCIA MEDICA|R[0-9] -|B[0-9] -/.test(n))return 'Emergências e resgate';
 if(/AMBIENT|FAUNA|FLORA|ANIMAI|POLUI|PESC|CACA|FLOREST|LIXO|RESIDUO|VEGETAC/.test(n))return 'Meio ambiente e animais';
 if(/DROGA|ENTORPECENT|ARMA |ARMAMENTO|MUNICAO|EXPLOSIV|TRAFIC/.test(n))return 'Drogas, armas e riscos';
 if(/ELEITOR|ELEICAO|VOTAR|VOTO|MESARIO|CANDIDAT|PARTID/.test(n))return 'Direitos políticos e eleições';
 if(/FUNCIONARI|SERVIDOR|ADMINISTRACAO PUBLICA|CONTRABANDO|DESCAMINHO|DOCUMENTO|TRIBUT|FRAUDE|CORRUP|PECULATO|PREVARIC|LICITAC|POLITIC/.test(n))return 'Administração, documentos e justiça';
 if(/PATRULH|POLICIAMENTO|APOIO A|ABORDAGEM|VISITA COMUNITARIA|FISCALIZAC|OPERACAO POLICIAL/.test(n))return 'Atividade operacional e preventiva';
 if(/LESAO|AMEACA|VIAS DE FATO|HOMICID|INJURIA|DIFAMAC|CALUNIA|AGRESS|CONSTRANG|SEQUEST|VIOLACAO DE DOMICILIO|ESTUPRO|ABUSO SEXUAL/.test(n))return 'Violência e integridade pessoal';
 return 'Outras naturezas';
}
const contextual={
 'ABORDAGEM DE SUSPEITOS - SEM ILICITUDE':'Abordagem ou verificação preventiva envolvendo pessoa considerada suspeita, sem ilícito inicialmente identificado. Registrar a motivação concreta da intervenção, o local, os envolvidos e o desfecho, evitando presumir culpa.',
 'PERTURBACAO DO TRABALHO OU SOSSEGO ALHEIO':'Comunicação de ruído, algazarra ou outra conduta que possa perturbar o trabalho ou o descanso de terceiros. Confirmar fonte, intensidade, horário, recorrência, pessoas afetadas e se o fato ainda ocorre.',
 'POLICIAMENTO PRESENÇA':'Solicitação ou registro de presença ostensiva para prevenção e visibilidade policial em determinada área. Identificar local, motivo operacional e eventuais riscos relatados.',
 'LESAO CORPORAL - VIOLENCIA DOMESTICA E FAMILIAR':'Relato de agressão com possível ofensa à integridade física ou à saúde no contexto doméstico ou familiar. Verificar lesões relatadas, necessidade de atendimento médico, vínculo entre envolvidos, risco atual e existência de medida protetiva.',
 'AMEACA':'Relato de conduta em que alguém teria anunciado mal injusto e grave a outra pessoa. Registrar palavras ou ações concretas, contexto, vínculo, meios utilizados e risco imediato, sem presumir tipificação definitiva.',
 'ATENDIMENTO DE ACIDENTE - SEM ILICITUDE':'Atendimento a acidente ou situação acidental sem evidência inicial de infração. Identificar local, dinâmica conhecida, vítimas, necessidade de socorro e eventual risco à circulação ou a terceiros.',
 'FURTO QUALIFICADO':'Suspeita de subtração de bem sem violência ou grave ameaça à pessoa, com circunstância que pode ensejar modalidade qualificada. Esclarecer como ocorreu o acesso, eventual rompimento de obstáculo, participação de terceiros e bens envolvidos.',
 'APOIO A OUTROS ORGAOS - SEM ILICITUDE':'Apoio operacional solicitado por outro órgão em atividade sem ilícito inicialmente relatado. Registrar órgão solicitante, ponto de encontro, finalidade, responsável e apoio necessário.',
 'LESAO CORPORAL':'Relato de ofensa à integridade corporal ou à saúde de uma pessoa. Verificar mecanismo da agressão, sintomas e ferimentos relatados, urgência médica, autor, vínculo e testemunhas.',
 'FURTO SIMPLES':'Suspeita de subtração de bem móvel alheio sem violência ou grave ameaça à pessoa, sem qualificadora inicialmente indicada. Registrar bem, circunstâncias, horário, local e elementos que indiquem a subtração.',
 'VIAS DE FATO':'Relato de agressão física ou contato violento sem lesão corporal constatada na informação inicial. Perguntar sobre dor, marcas, ferimentos e necessidade de socorro; não afastar lesão sem avaliação adequada.',
 'VIOLACAO DE DOMICILIO':'Relato de entrada ou permanência de pessoa em casa ou dependências alheias contra a vontade do ocupante ou nas circunstâncias legalmente vedadas. Confirmar local, autorização, forma de ingresso e se há risco em andamento.',
 'ROUBO':'Suspeita de subtração de bem mediante violência, grave ameaça ou outra circunstância legalmente prevista. Confirmar o que foi levado, como ocorreu a abordagem, possíveis armas, lesões, fuga e situação atual.',
 'DANO':'Relato de destruição, deterioração ou inutilização de bem. Confirmar qual bem foi afetado, como ocorreu o fato, vínculo com possível autor e se houve risco às pessoas.',
 'DESAPARECIMENTO DE PESSOA - SEM ILICITUDE':'Comunicação sobre pessoa de paradeiro desconhecido, sem indícios iniciais de crime. Registrar último local e horário conhecidos, características, meios de contato, vulnerabilidades e riscos; não exigir prazo mínimo para comunicar.',
 'DESAPARECIMENTO DE CRIANCA - SEM ILICITUDE':'Comunicação de criança com paradeiro desconhecido sem indícios iniciais de ilícito. Priorizar identificação, último avistamento, responsáveis, circunstâncias do desaparecimento e riscos à integridade.',
 'VISITA FISCALIZAÇÃO MPU – VÍTIMA - VIOLÊNCIA DOMÉSTICA':'Acompanhamento preventivo ou fiscalização referente à vítima contemplada por medida protetiva de urgência. Registrar finalidade da visita, informações prestadas e eventuais descumprimentos relatados, conforme protocolo institucional.',
 'AMEACA CONTRA MULHER - CONDICAO SEXO FEMININO E VIOLENCIA DOMESTICA E FAMILIAR':'Comunicação de ameaça contra mulher no contexto doméstico/familiar ou de gênero descrito no título. Confirmar ameaça concreta, vínculo, situação de risco, presença de filhos, medidas protetivas e necessidades imediatas da vítima.',
 'VIOLÊNCIA DOMÉSTICA':'Comunicação de conflito ou violência em contexto doméstico ou familiar, ainda sem modalidade específica demonstrada. Investigar com perguntas objetivas se houve ameaça, agressão, coação, dano, violência psicológica ou descumprimento de proteção.'
};
function describeNatureza(name){
 if(contextual[name])return contextual[name];
 const n=norm(name);
 if(/DESATIVADO/.test(n))return 'Natureza indicada como desativada na listagem de origem. Mantida para referência histórica e conferência da nomenclatura; sua utilização operacional atual precisa ser verificada com a coordenação.';
 if(/SEM ILICITUDE/.test(n))return 'Registro operacional relacionado a '+name.toLocaleLowerCase('pt-BR').replace(/\s*-\s*sem ilicitude/i,'')+'. A denominação indica ausência de ilícito na informação inicial, não uma conclusão definitiva. Confirmar fatos, risco e providências.';
 if(/MPU|MEDIDA PROTETIVA/.test(n))return 'Atendimento, visita ou fiscalização relacionada a medida protetiva de urgência. Verificar a situação concreta, vigência informada da medida, aproximação ou contato proibido, risco e necessidade de apoio.';
 if(/DOMESTIC|FAMILIAR/.test(n))return 'Atendimento relacionado a '+name.toLocaleLowerCase('pt-BR')+'. Confirmar vínculo entre envolvidos, comportamento relatado, vítimas, crianças expostas, necessidade de socorro e medidas protetivas; a nomenclatura não comprova o fato.';
 if(/ESTUPRO|VIOLENCIA SEXUAL|EXPLORACAO SEXUAL|ABUSO SEXUAL/.test(n))return 'Comunicação potencialmente envolvendo violência ou exploração sexual, conforme a conduta indicada na natureza. Preservar privacidade e segurança da vítima, priorizar acolhimento e socorro e registrar apenas dados necessários, sem induzir respostas.';
 if(/HOMICID|FEMINICID|INFANTICID|MORTE/.test(n))return 'Comunicação potencialmente envolvendo morte, conforme a modalidade descrita na natureza. Confirmar condição da vítima, local, circunstâncias observadas, necessidade de socorro, preservação do local e informações sobre envolvidos; a tipificação exige apuração.';
 if(/ROUBO|EXTORSAO/.test(n))return 'Comunicação de possível subtração patrimonial ou constrangimento, na modalidade indicada no título. Verificar violência ou ameaça, bem ou valor envolvido, dinâmica, suspeitos e risco atual, sem confundir modalidades legais distintas.';
 if(/FURTO|RECEPTAC|APROPRIAC|ESTELIONATO|FRAUD|DANO QUALIFICADO/.test(n))return 'Comunicação sobre possível infração contra o patrimônio ou fraude, nos termos da natureza indicada. Identificar bens ou valores, forma de ocorrência, autor alegado, registros disponíveis e circunstâncias que diferenciam as modalidades.';
 if(/ACIDENTE|TRANSITO|VEICULO AUTOMOTOR|DIRECAO DE VEICULO/.test(n))return 'Registro de ocorrência viária ou conduta na circulação de veículos, conforme a modalidade descrita. Verificar localização exata, sentido da via, envolvidos, feridos, bloqueios e risco imediato à segurança.';
 if(/INCENDIO|EXPLOSAO|VAZAMENTO|DESABAMENTO|INUNDACAO|RESGATE|DESMAIO|INCONSCIENCIA|SOCORRO/.test(n))return 'Atendimento de emergência ou risco à integridade das pessoas, conforme a situação indicada. Informar local, número de vítimas, estado aparente, perigos adicionais, acesso ao ponto e serviços de socorro acionados.';
 if(/POLUI|FLOREST|FAUNA|ANIMAI|PESC|CACA|RESIDUO|VEGETAC|LICENCA AMBIENTAL/.test(n))return 'Comunicação de possível impacto ambiental, manejo de fauna ou flora, ou descumprimento de requisito ambiental. Identificar espécie, local, conduta observada, extensão do dano e evidências disponíveis, sem antecipar conclusão técnica.';
 if(/DROGA|ENTORPECENT|ARMAMENTO|ARMA DE FOGO|MUNICAO|EXPLOSIV/.test(n))return 'Relato relacionado a substância controlada, arma, munição ou material de risco, conforme a conduta indicada. Confirmar o que foi observado, quantidade aproximada quando disponível, local, perigo atual e necessidade de equipe especializada.';
 if(/ELEITOR|ELEICAO|VOTAR|VOTO|CANDIDAT|PARTID/.test(n))return 'Comunicação de possível conduta ligada ao processo eleitoral ou ao exercício de direitos políticos, conforme a descrição da natureza. Identificar ação concreta, local, data, participantes e documentação relatada; enquadramento a confirmar pela autoridade competente.';
 if(/DOCUMENT|SERVIDOR PUBLICO|FUNCIONARI|CORRUP|LICITAC|CONTRABANDO|DESCAMINHO|PECULATO|PREVARIC|FRAUDE/.test(n))return 'Comunicação de possível irregularidade documental ou administrativa, de acordo com a conduta indicada. Registrar agente, ato objetivo, circunstâncias, documentos e impactos alegados, sem considerar a irregularidade comprovada pela descrição.';
 if(/VISITA|PATRULHAMENTO|POLICIAMENTO|ABORDAGEM|APOIO|FISCALIZACAO/.test(n))return 'Registro de atividade de prevenção, patrulhamento, visita, fiscalização ou apoio conforme a finalidade indicada. Confirmar local, solicitante, objetivo, observações e providências adotadas.';
 const readable=name.replace(/\s*\/\s*/g,', ').replace(/\s+/g,' ').replace(/\s+\./g,'.').trim();
 return 'Comunicação sobre a conduta ou situação descrita como "'+readable.slice(0,400)+'". Para uma classificação adequada, identificar o fato concreto, envolvidos, local, momento e elementos objetivos previstos na natureza; não presumir infração apenas pela nomenclatura.';
}
const STOP=new Set('COM SEM DE DA DO DOS DAS E EM POR A O AS OS PARA QUE OU UM UMA NO NA NOS NAS AO AOS SUA SEU SOB TODO NAO MAIS OUTRO OUTRA ATE'.split(' '));
function tagsOf(name){
 return [...new Set(norm(name).replace(/[^A-Z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>3&&!STOP.has(w)))].slice(0,16);
}
export const COPOM_CATALOG=Object.freeze(CSV_NATURES.map(({id,natureza})=>{
 const code='NAT-'+String(id).padStart(4,'0'),category=categoryOf(natureza),summary=describeNatureza(natureza);
 return {source_id:id,code,title:natureza,category,priority:'Consulta',summary,
  body:'Descrição orientativa: '+summary+'\n\nID na lista recebida: '+id+'.\nNatureza original: '+natureza+'\n\nAtenção: esta descrição foi elaborada para facilitar consulta e triagem com base no nome recebido. Não constitui tipificação legal definitiva. Confirme os fatos e o protocolo institucional.',
  tags:tagsOf(natureza),source:'copom-csv-v2'};
}));
export function catalogRules(entries=COPOM_CATALOG){
 return entries.map(r=>({id:'copom-'+r.code,code:r.code,officialNature:r.title,category:r.category,priority:r.priority,explanation:r.summary,requiredGroups:[],boostKeywords:[],triageQuestions:[]}));
}
// Somente conceitos de alta correspondência são candidatos a classificação automática.
// A lista completa permanece disponível para consulta e recuperação contextual no Gemini.
const SAFE_LOCAL=[
 ['NAT-0002',[['som alto','barulho excessivo','perturbacao do sossego','som muito alto']]],
 ['NAT-0005',[['ameacou matar','ameacou agredir','ameaçou matar','ameaçou agredir','ameaca de morte']]],
 ['NAT-0009',[['agrediu','espancou','deu socos','deu chutes'],['ficou ferido','ficou ferida','machucou','lesao','sangrando']]],
 ['NAT-0010',[['furtaram','furtou','furto'],['sem violencia','sem ameaca','sem agressao']]],
 ['NAT-0012',[['invadiu a casa','entrou sem autorizacao na casa','violacao de domicilio']]],
 ['NAT-0016',[['roubo','assaltou','assalto','roubaram'],['arma','grave ameaca','agrediu','violencia']]],
 ['NAT-0039',[['desapareceu','desaparecimento','sumiu'],['adulto','homem','mulher','pessoa']]]
];
export function localRecognitionRules(entries=COPOM_CATALOG){
 const map=new Map(entries.map(x=>[x.code,x]));
 return SAFE_LOCAL.flatMap(([code,requiredGroups])=>{
  const e=map.get(code);
  return e?[{id:'copom-match-'+code,code,officialNature:e.title,category:e.category,priority:e.priority,explanation:e.summary,requiredGroups,boostKeywords:[],excludeKeywords:[],triageQuestions:[]}]:[];
 });
}
