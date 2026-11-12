// Catálogo importado do CSV fornecido pelo usuário (ID e título sem alterações).
// Descrições e orientações são editoriais, NÃO homologadas pelo COPOM ou equivalentes a tipificação jurídica.
import rows from './copom-naturezas.json' with {type:'json'};
import {withTriageQuestions} from './triage.js';

const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const titleCase=s=>{const t=String(s||'').replace(/\s+/g,' ').trim();return t.length>140?t.slice(0,137)+'…':t;};
const has=(text,re)=>re.test(norm(text));
const DISABLED=/DESATIVAD[OA]/i;
export function categorizeNature(name){
 const s=norm(name);
 if(DISABLED.test(s))return 'Desativadas (arquivo de origem)';
 if(/violencia domestica|medida protetiva|mulher.*condicao sexo feminino|patrulha maria da penha|fiscalizacao mpu|visita.*vitima/.test(s))return 'Violência doméstica e proteção';
 if(/suicidio|emergencia|atendimento.*morte|trauma|socorro|desmaio|ferimento|resgate|acidente.*vitima|mal subit|salvamento|afogamento|t\d - /.test(s))return 'Saúde, resgate e emergências';
 if(/transito|veiculo|direcao|dirigir|condutor|habilitacao|cnh|placa|automotor|atropelamento|embarcacao|rodovia|acidente de/.test(s))return 'Trânsito e mobilidade';
 if(/animal|fauna|flora|florest|desmatamento|pesca|ambiental|poluicao|vegetacao|queimada/.test(s))return 'Ambiental e animal';
 if(/droga|trafic|entorpecent|arma de fogo|arma branca|municao|explosivo|disparo/.test(s))return 'Drogas, armas e explosivos';
 if(/furto|roubo|estelionat|apropriacao|receptacao|dano |dano$|esbulho|fraude|extorsao|patrimonio|arrombamento/.test(s))return 'Patrimônio e fraudes';
 if(/homicid|lesao corporal|ameaca|injuria|desacato|calunia|difamacao|sequestro|carcere|estupro|vias de fato|perseguicao|abandono de incapaz|maus tratos|desaparecimento|violacao de domicilio|violencia/.test(s))return 'Pessoas, integridade e direitos';
 if(/sem ilicitude|visita comunitaria|policiamento|palestra|fiscalizacao|apoio a|operação |operacao |noticia de fato|fato nao constatado/.test(s))return 'Atendimento preventivo e apoio';
 return 'Outras naturezas do cadastro';
}
export function naturePriority(name){
 const n=norm(name);
 if(/sem ilicitude|nao delituos|visita|palestra|fiscalizacao|policiamento|desativado|teste sade/.test(n))return 'Consulta';
 if(/estupro|homicid|sequestro|carcere|armado|disparo|incendio|atropelamento|risco imediato|arma de fogo|violencia domestica|socorro|suicidio|morte/.test(n))return 'Alta';
 return 'Média'; // prioridade de exibição, não despacho/urgência operacional.
}
const descriptions=[
 [/^ABORDAGEM DE SUSPEITOS/, 'Registro de abordagem ou verificação preventiva de pessoas consideradas suspeitas. Descrever a motivação observável, o local, os envolvidos e o resultado, sem presumir prática de crime.'],
 [/^PERTURBACAO DO TRABALHO OU SOSSEGO ALHEIO/, 'Comunicação de ruído, som ou conduta que estaria perturbando o trabalho ou o sossego de terceiros. Confirmar a fonte, horário, intensidade relatada e se a situação continua.'],
 [/^POLICIAMENTO PRESEN/, 'Atividade de presença policial, patrulhamento ou prevenção. Registrar motivo, local, equipe envolvida e resultado, sem presumir delito.'],
 [/^LESAO CORPORAL.*VIOLENCIA DOMESTICA/, 'Notícia de possível agressão com lesão física em contexto doméstico ou familiar. Verificar vínculo, ferimentos, risco imediato e necessidade de socorro; não presumir lesão ou autoria sem relato suficiente.'],
 [/^LESAO CORPORAL CONTRA MULHER/, 'Possível agressão física contra mulher no contexto indicado na classificação. Confirmar a conduta, lesões, vínculo, presença do autor e necessidade de proteção e atendimento de saúde.'],
 [/^AMEACA CONTRA MULHER/, 'Relato de ameaça dirigida a mulher em contexto doméstico ou familiar. Identificar palavras ou gestos concretos, vínculo entre envolvidos, presença do suspeito e riscos atuais.'],
 [/^AMEACA$/, 'Comunicação de promessa ou sinalização de mal injusto contra alguém. Registrar a conduta exata, o contexto, a pessoa envolvida e o risco presente, sem concluir tipificação automaticamente.'],
 [/^ATENDIMENTO DE ACIDENTE/, 'Solicitação de atendimento relacionada a acidente. Confirmar localização, natureza do evento, presença de vítimas, perigos no local e necessidade de socorro; a descrição não presume delito.'],
 [/^FURTO QUALIFICADO$/, 'Comunicação de subtração de bem sem violência contra a pessoa, com circunstância qualificadora a ser confirmada. Verificar o que foi levado, como se deu o acesso, possíveis danos e indícios relatados.'],
 [/^FURTO SIMPLES$/, 'Comunicação de possível subtração de bem alheio sem violência ou grave ameaça e sem qualificadoras informadas. Identificar objeto, local, horário e circunstâncias da subtração.'],
 [/^FURTO/, 'Comunicação relacionada à subtração de bem, com a modalidade especificada no título. Registrar objeto, posse anterior, circunstâncias, meios empregados e indícios efetivamente relatados.'],
 [/^ROUBO$/, 'Comunicação de subtração de bem mediante violência ou grave ameaça. Confirmar como ocorreu a abordagem, se há armas ou feridos, os bens envolvidos e a situação atual.'],
 [/^ROUBO/, 'Comunicação de subtração patrimonial com violência ou grave ameaça e a circunstância descrita no título. Verificar fatos que sustentem essa especificidade e os riscos atuais.'],
 [/^VIAS DE FATO/, 'Relato de agressão física sem lesão corporal constatada nas informações disponíveis. Esclarecer contato físico, eventual ferimento, local e segurança dos envolvidos.'],
 [/^VIOLACAO DE DOMICILIO/, 'Comunicação de possível ingresso ou permanência indevida em imóvel. Verificar autorização, circunstâncias de acesso, presença de moradores e risco atual.'],
 [/^INFRACAO DE TRANSITO/, 'Comunicação de conduta relacionada a regras de circulação ou fiscalização viária. Registrar veículo, local, comportamento observado e riscos, sem presumir crime.'],
 [/^VISITA COMUNIT/, 'Atividade preventiva de visita comunitária, conforme o objetivo especificado no título. Registrar local, público atendido, informações efetivamente colhidas e encaminhamento.'],
 [/^VISITA FISCALIZA/, 'Registro de visita de fiscalização ou acompanhamento indicado no título. Confirmar a ordem ou motivo da diligência, a pessoa contatada e o resultado, sem presumir descumprimento.'],
 [/^APOIO A/, 'Solicitação ou execução de apoio a órgão, equipe ou serviço indicado no título. Confirmar solicitante, competência, local, necessidade e providências efetivamente realizadas.'],
 [/^CUMPRIMENTO DE MANDADO/, 'Ato de cumprimento de ordem judicial. Confirmar autenticidade, tipo da ordem, autoridade responsável, local e resultado, sem inferir sua existência somente pelo relato.'],
 [/^MULHER - DESCUMPRIR DECISAO JUDICIAL/, 'Notícia de possível descumprimento de medida protetiva deferida judicialmente. Confirmar existência e vigência da decisão, restrição concreta e conduta relatada.'],
 [/^DESINTELIG[ÊE]NCIA/, 'Conflito ou desentendimento entre pessoas, sem enquadramento penal automaticamente demonstrado. Verificar se houve ameaça, agressão, dano ou outro fato concreto.'],
 [/^NOTICIA DE FATO FUTURO/, 'Informação sobre evento que poderá ocorrer. Registrar fonte, data prevista, local e risco comunicado; não presumir consumação.'],
 [/^DISPARO DE ALARME/, 'Comunicação de acionamento de alarme ou sistema de segurança. Confirmar origem, local, verificações realizadas e existência ou não de indícios de ocorrência.'],
 [/^DISPARO DE ARMA DE FOGO/, 'Comunicação de disparo com arma de fogo. Confirmar origem da informação, local, quantidade de estampidos, feridos, autor possivelmente presente e necessidade de proteção.'],
 [/^ESTELIONATO/, 'Notícia de possível obtenção de vantagem mediante fraude ou engano. Identificar a conduta, o meio utilizado, bens ou valores e evidências disponíveis; distinguir erro de fraude.'],
 [/^ADQUIRIR \/ VENDER \/ FORNECER E OU PRODUZIR DROGAS/, 'Relato de possíveis condutas de comércio, produção, entrega ou fornecimento de drogas. Verificar os atos efetivamente observados, substância mencionada, circunstâncias e risco no local.'],
 [/^DROGAS PARA O CONSUMO PESSOAL/, 'Comunicação envolvendo posse ou uso de substância para consumo pessoal. Registrar quantidade informada, contexto, local e comportamento observado sem deduzir finalidade de tráfico.'],
 [/^DIRECAO PERIGOSA/, 'Relato de condução com manobras potencialmente perigosas. Confirmar condutas observadas, veículo, localização, risco aos demais usuários e situação presente.'],
 [/^ATENDIMENTO DE LOCAL DE MORTE/, 'Comunicação sobre pessoa aparentemente sem vida ou local de óbito. Registrar fonte da informação, acesso, situação, necessidade de atendimento especializado e evitar confirmar morte sem avaliação competente.'],
 [/^DESAPARECIMENTO DE (PESSOA|CRIANCA)/, 'Comunicação de pessoa sem paradeiro conhecido. Confirmar última localização, horário, idade, circunstâncias, eventual vulnerabilidade e se há indícios concretos de violência ou crime.'],
 [/^PATRULHAMENTO/, 'Atividade de rondas e observação preventiva no local indicado. Registrar área, equipe, motivo e fatos efetivamente constatados.'],
 [/^OMISSAO DE CAUTELA NA GUARDA DE ANIMAIS/, 'Notícia de falha de cautela envolvendo guarda de animal e possível risco a terceiros. Confirmar animal, responsável, acesso ao espaço e consequências relatadas.'],
 [/^VEICULO ABANDONADO/, 'Comunicação de veículo aparentemente abandonado ou recolhido. Registrar localização, características, estado, origem da informação e possível obstrução.'],
 [/^CONDUZIR VEICULO AUTOMOTOR COM CAPACIDADE PSICOMOTORA/, 'Relato de condução de veículo possivelmente sob influência de álcool ou substância psicoativa. Confirmar sinais observados, veículo, local e risco, sem pressupor exame conclusivo.'],
 [/^MAUS TRATOS/, 'Notícia de possíveis maus-tratos. Identificar a pessoa ou animal afetado, conduta, responsável, risco, ferimentos e necessidade de proteção.'],
 [/^SUICIDIO/, 'Comunicação de risco de suicídio ou possível morte autoinfligida. Priorizar segurança, acesso ao local, sinais observados e necessidade de suporte de emergência; não confirmar o fato apenas pelo título.'],
 [/^RIXA/, 'Comunicação de confronto envolvendo múltiplas pessoas. Confirmar quantidade de participantes, armas, lesões e situação atual sem atribuir automaticamente autoria.'],
 [/^INCENDIO/, 'Comunicação de fogo ou ocorrência incendiária. Verificar localização, propagação, pessoas expostas, materiais e necessidade de socorro; não presumir origem criminosa.'],
 [/^ESTUPRO/, 'Notícia de possível violência sexual. Acolher o relato sem exposição desnecessária, registrar riscos imediatos e encaminhar conforme protocolos de proteção e atendimento de saúde.'],
 [/^IMPORTUNACAO SEXUAL/, 'Notícia de possível conduta sexual praticada sem consentimento. Registrar o comportamento relatado, local, envolvidos e risco atual com preservação da privacidade.'],
 [/^RECEPTACAO/, 'Comunicação relativa a bem possivelmente proveniente de ilícito. Identificar origem informada, posse, aquisição e circunstâncias sem presumir conhecimento da procedência.'],
 [/^PORTE ILEGAL DE ARMA/, 'Notícia de possível porte de arma ou munição em situação irregular. Confirmar tipo, localização, circunstâncias, documentos informados e risco imediato.'],
 [/^INJURIA/, 'Comunicação de ofensa à dignidade ou ao decoro de pessoa determinada. Registrar as expressões ou atos relatados e o contexto, sem tipificar automaticamente.'],
 [/^DESACATO/, 'Relato de possível ofensa a agente público no exercício funcional. Confirmar contexto, conduta concreta, qualidade funcional e fonte das informações.'],
 [/^OMISSAO DE SOCORRO/, 'Comunicação de possível falta de auxílio a pessoa em situação de perigo. Identificar necessidade de assistência, risco, quem podia prestar ajuda e fatos observados.'],
 [/^ABANDONO DE INCAPAZ/, 'Notícia de possível abandono de pessoa que depende de cuidado ou vigilância. Confirmar vulnerabilidade, responsável, local, duração e riscos atuais.'],
 [/^ACHADO/, 'Registro de localização de objeto, substância ou outro item descrito no título. Informar local, condições e medidas de preservação, sem presumir origem delituosa.']
];
const suffixByCategory={
 'Violência doméstica e proteção':'Verificar vínculo entre envolvidos, medidas de proteção e segurança da vítima, sem pressupor crime.',
 'Saúde, resgate e emergências':'Confirmar localização, estado aparente da pessoa e necessidade de atendimento especializado.',
 'Trânsito e mobilidade':'Registrar veículo, via, conduta observada, possíveis vítimas e segurança da circulação.',
 'Ambiental e animal':'Confirmar o bem protegido ou animal envolvido, local, dano relatado e órgão competente.',
 'Drogas, armas e explosivos':'Verificar substância ou objeto informado, conduta concreta e risco imediato; evitar suposições.',
 'Patrimônio e fraudes':'Verificar objeto ou valor, conduta relatada, titularidade e eventuais ameaças ou danos.',
 'Pessoas, integridade e direitos':'Identificar conduta concreta, envolvidos, riscos e necessidade de proteção.',
 'Atendimento preventivo e apoio':'Registrar a finalidade da atuação, local e resultado, sem presumir ilicitude.',
 'Desativadas (arquivo de origem)':'Classificação marcada como desativada no CSV. Não utilizar como sugestão ativa sem validação institucional.',
 'Outras naturezas do cadastro':'Confirmar quais atos específicos foram relatados, contexto, envolvidos e competência aplicável.'
};
export function explainNature(name,category=categorizeNature(name)){
 const normalized=norm(name);
 const custom=descriptions.find(([re])=>re.test(normalized))?.[1];
 if(custom)return custom;
 const first=titleCase(name).toLowerCase();
 if(/^(praticar|promover|facilitar|impedir|constranger|transportar|subtrair|adquirir|vender|fornecer|fabricar|falsificar|alterar|violar|registrar|destruir|expor|utilizar|recusar|deixar de|omitir|introduzir|exigir|permitir|obter|reter|portar|conduzir|forcar|fazer|induzir|reter|invadir|interromper|produzir|realizar|prescrever|impedir)/.test(normalized)){
  return 'Natureza referente à conduta descrita no cadastro como “'+first+'”. '+suffixByCategory[category];
 }
 if(/sem ilicitude|nao delituos/.test(normalized))
  return 'Registro de “'+first+'”, identificado no cadastro como situação sem ilicitude. '+suffixByCategory['Atendimento preventivo e apoio'];
 return 'Registro relacionado à natureza “'+first+'”. '+suffixByCategory[category];
}
const RECOGNITION=[
 [/^ABORDAGEM DE SUSPEITOS/,[['abordagem de suspeitos','abordagem preventiva']]],
 [/^PERTURBACAO DO TRABALHO OU SOSSEGO/,[['som alto','barulho excessivo','perturbacao do sossego','perturbando o sossego']]],
 [/^LESAO CORPORAL.*VIOLENCIA DOMESTICA/,[['marido','esposa','companheira','namorada','ex-companheiro','violencia domestica'],['agrediu','agredindo','espancando','socos','lesao','machucou','bateu']]],
 [/^AMEACA CONTRA MULHER/,[['marido','esposa','companheira','namorada','ex-namorado','violencia domestica'],['ameacou','ameaca','vai matar','prometeu matar']]],
 [/^AMEACA$/, [['ameacou','ameaca de morte','esta ameacando','ameaca']]],
 [/^FURTO SIMPLES/,[['furto simples']]],
 [/^FURTO QUALIFICADO/,[['furto qualificado','furto com arrombamento']]],
 [/^ROUBO$/, [['assalto','assaltou','roubo com ameaca','roubo com violencia']]],
 [/^VIAS DE FATO/,[['vias de fato','agressao sem lesao']]],
 [/^VIOLACAO DE DOMICILIO/,[['invadiu minha casa','violacao de domicilio','entrou sem autorizacao']]],
 [/^DISPARO DE ARMA DE FOGO/,[['disparo de arma de fogo','tiros de arma de fogo','atirou com arma']]],
 [/^ESTELIONATO/,[['estelionato','golpe financeiro','fraude financeira']]],
 [/^DROGAS PARA O CONSUMO PESSOAL/,[['drogas para consumo pessoal']]],
 [/^DESAPARECIMENTO DE PESSOA/,[['pessoa desaparecida','pessoa sumiu','desaparecimento de pessoa']]],
 [/^DESAPARECIMENTO DE CRIANCA/,[['crianca desaparecida','desaparecimento de crianca']]],
 [/^INCENDIO$/, [['incendio','casa pegando fogo','imovel em chamas']]],
 [/^INJURIA$/, [['injuria','ofensa verbal']]],
 [/^DESACATO$/, [['desacato']]],
 [/^IMPORTUNACAO SEXUAL$/, [['importunacao sexual']]],
 [/^ATENDIMENTO DE ACIDENTE/,[['acidente sem vitimas','atendimento de acidente']]],
 [/^ATENDIMENTO DE LOCAL DE MORTE/,[['local de morte','pessoa aparentemente morta']]]
];
function groupsFor(name){
 if(DISABLED.test(name))return [];
 const n=norm(name);
 const matched=RECOGNITION.find(([re])=>re.test(n));
 if(matched)return matched[1];
 // Correspondência literal do nome completo apenas; não inferir infração por radicais soltos.
 if(n.length>=7&&n.length<=80)return [[n]];
 return [];
}
const defaultQuestions=['Qual foi a conduta efetivamente observada ou informada?','O fato está acontecendo agora e existe risco a alguém?','Qual o endereço exato, horário e fonte da informação?','Há vítimas, feridos, armas ou necessidade de apoio?','Qual medida foi efetivamente tomada?'];
export const COPOM_NATURES=rows.map(row=>{
 const category=categorizeNature(row.natureza),summary=explainNature(row.natureza,category);
 const disabled=DISABLED.test(row.natureza);
 return Object.freeze({
  sourceId:row.id,id:'csv-copom-'+String(row.id).padStart(4,'0'),
  code:'COPOM-'+String(row.id).padStart(4,'0'),officialNature:row.natureza,
  title:row.natureza,category,priority:naturePriority(row.natureza),
  explanation:summary,summary,status:disabled?'desativada':'orientativa',
  source:'CSV fornecido · natureza preservada',codeType:'identificador importado, não código de homologação',
  legalBase:'Base legal e enquadramento exigem conferência jurídica e institucional.',
  agency:'Conferir competência e protocolo local.',
  requiredGroups:groupsFor(row.natureza),boostKeywords:[],excludeKeywords:[],
  triageQuestions:defaultQuestions,
  dispatchMask:'SOLICITANTE RELATA [FATOS CONFIRMADOS]. LOCAL [CONFIRMAR]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS [FATOS RELATADOS]. PROVIDÊNCIAS [SOMENTE AS REALIZADAS].'
 });
});
export const COPOM_RULES=COPOM_NATURES.filter(r=>r.status!=='desativada').map(withTriageQuestions);
export function seedsFromCopom(){
 return COPOM_NATURES.map(r=>({
  code:r.code,title:r.title,category:r.category,priority:r.priority,
  summary:r.summary,
  body:r.explanation+'\n\n'+(r.status==='desativada'?'NATUREZA DESATIVADA NO ARQUIVO DE ORIGEM. NÃO UTILIZAR SEM VALIDAÇÃO INSTITUCIONAL.\n\n':'')+
    'Identificador de origem (CSV): '+r.sourceId+'.\nDescrição orientativa; não equivale a tipificação jurídica.\n\nPerguntas de triagem:\n'+r.triageQuestions.join('\n'),
  tags:[r.code,'ID '+r.sourceId,...r.title.split(/[ /–-]+/).filter(w=>w.length>4).slice(0,10)]
 }));
}
