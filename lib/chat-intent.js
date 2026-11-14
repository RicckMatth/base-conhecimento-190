// Desambiguação local de intenção do chat COPOM.
// Perguntas sobre um relato são relato; FAQ apenas para dúvidas conceituais.
// Histórico só é reaproveitado em complementos explícitos para evitar misturar ocorrências.
import {isQuestion,normalizeText,cleanHistory} from './assistant.js';
import {norm,parseEvidence} from './offline-sade-parser.js';

const explicitNew=/\b(?:novo caso|nova ocorrencia|outro caso|outra situacao|outro relato|esquece o anterior|desconsidere o anterior)\b/;
const conceptual=/^(?:o que (?:e|significa)|qual(?: a| o)? (?:diferenca|definicao|conceito|significado)|quais (?:sao )?as diferencas|como (?:funciona|usar|utilizar)|me (?:explique|explica|ensine)|pode explicar|gostaria de saber|tenho uma duvida|preciso saber (?:o que significa|a diferenca))\b/;
const scenarioContext=/\b(?:solicitante|comunicante|vitima|ocorrencia|relato|viatura|autor|suspeito|individuo|individuos|homem|mulher|marido|esposa|pai|mae|filho|filha|vizinho|amigo|pessoa|policial|motorista|pedestre|idoso|crianca)\b/;
const reportAction=/\b(?:relata|relatou|informa|informou|pede|solicitou|sofreu|esta sendo|estava|esta|estao|estavam|amea[cç](?:a|as|ou|ando|ado|ada)|agrediu|agredida|agredido|bateu|bateram|tentando|tentou|forcou|invadiu|fugiu|evadiu|levou|levaram|foi embora|ocorreu|aconteceu|discutiu|discutiram|foi roubado|foi furtado|roubaram|furtaram|colidiu|atropelou|disparou|apontou|ficou ferido|ficou ferida|desapareceu|sumiu)\b/;
const followup=/^(?:(?:e|mas|so que)\s+(?:se|nesse caso|neste caso|agora|ele|ela|o autor|a vitima|tambem)\b|(?:qual|quais|e qual|entao qual)\s+(?:seria\s+)?(?:a\s+)?(?:natureza|enquadramento|classificacao|tipificacao|pergunta|perguntas)\b|(?:o que|como)\s+(?:fazer|perguntar|sondar)\b|(?:isso|esse fato|essa situacao|nesse caso|neste caso)\s+(?:e|seria|configura|significa)\b|(?:ele|ela|o autor|a vitima|a pessoa|o individuo)\s+(?:tambem|depois|agora|disse|falou|amea[cç]ou|agrediu|estava)\b)/;
const noFactQuestion=/\b(?:qual (?:e |seria )?a natureza|qual natureza|qual tipo de ocorrencia|quais as perguntas|que perguntas|que crime|isso e crime|seria crime|qual (?:o )?enquadramento|como classificar|o que perguntar|qual (?:e )?a classificacao)\b/;
const caseRequest=/\b(?:qual (?:e |seria )?a natureza|qual natureza|qual tipo de ocorrencia|qual classificacao|qual codigo|que crime|isso e crime|como (?:classificar|enquadrar)|o que perguntar|como sondar|perguntas de sondagem)\b/;
const caseEvidence=/\b(?:ameac|agred|agress|roub|furt|assalt|invad|arromb|arma|faca|facao|pistola|tiro|disparo|soco|ferid|lesao|discuss|briga|acidente|colis|atropel|desaparec|sumiu|golpe|fraude|estupro|abuso sexual|sequestr|som alto|musica alta|barulho|incendio|morreu|morto|matou|cadaver)\w*\b/;
const commandRequest=/^(?:analise|analisar|classifique|classificar|identifique|identificar|me diga|me ajude|me fale|verifique|examine|veja|qual|quais)\b/;
const natureKnowledge=/\b(?:quando usar|quando utilizar|em que situacao|em qual situacao|qual situacao|como usar|para que serve|como identificar|quando selecionar|qual e a natureza|qual a natureza|sobre a natureza|descricao da natureza|explique a natureza)\b/;

export function hasReportFacts(text){
 const n=norm(text);
 if(!n||n.length<6)return false;
 // Títulos de fichas isolados não bastam para concluir que houve uma ocorrência.
 if(scenarioContext.test(n)&&reportAction.test(n))return true;
 // Uma dúvida sobre a própria ficha não é ocorrência só porque repete o nome da natureza.
 if(natureKnowledge.test(n)&&!scenarioContext.test(n))return false;
 // Inclui relatos muito curtos, por exemplo: "assalto com arma no comércio".
 const hits=parseEvidence(text).signals;
 const evidence=Object.entries(hits).filter(([key,value])=>value.yes&&
   !['road','outside','entered','gone','armed','againstWill'].includes(key)).map(([key])=>key);
 if(evidence.length>=2&&(!conceptual.test(n)||caseRequest.test(n)))return true;
 // Perguntar "qual natureza para [fato]" não converte uma ocorrência em FAQ.
 if(evidence.length>0&&scenarioContext.test(n)&&!conceptual.test(n))return true;
 if(caseRequest.test(n)&&caseEvidence.test(n))return true;
 if(commandRequest.test(n)&&caseEvidence.test(n)&&!/^qual (?:a )?diferenca\b/.test(n))return true;
 return false;
}

export function isConceptualInquiry(text){
 const n=norm(text).replace(/[?]+$/,'').trim();
 if(!n)return false;
 // Mesmo iniciado por "qual", um texto com atos e personagens é um caso.
 if(hasReportFacts(text))return false;
 if(conceptual.test(n))return true;
 if(followup.test(n)||caseRequest.test(n))return false;
 return isQuestion(text);
}

export function resolveChatIntent(text,history=[]){
 const input=String(text||'').trim().slice(0,8000);
 const n=norm(input);
 const explicitStart=explicitNew.test(n);
 if(explicitStart)return {type:'report',text:input,usedHistory:false};
 if(isConceptualInquiry(input))return {type:'question',text:input,usedHistory:false};
 const currentCase=hasReportFacts(input);
 // Um pedido de classificação sem nenhum fato precisa de contexto, não de
 // resposta genérica nem de uma natureza inventada.
 if(!currentCase&&caseRequest.test(n)&&!followup.test(n)){
  const historyCase=cleanHistory(history).filter(m=>m.role==='user').slice(-4).reverse()
   .find(m=>hasReportFacts(m.content));
  if(historyCase)return {type:'report',text:(historyCase.content+'\n'+input).slice(0,8000),usedHistory:true};
  return {type:'needs_context',text:input,usedHistory:false};
 }
 // Só retoma contexto se o usuário realmente estiver complementando o caso.
 // Um relato autossuficiente nunca herda informações de outra ocorrência.
 const refersBack=/^(?:e se|e nesse caso|e agora|mas ele|mas ela|ele|ela|isso|nesse caso|neste caso)\b/.test(n);
 const isContinuation=(refersBack||!currentCase&&(followup.test(n)||noFactQuestion.test(n)||/^(?:sim|nao|tambem|ainda)\b/.test(n)));
 if(isContinuation){
  const previous=cleanHistory(history).filter(m=>m.role==='user').slice(-4).reverse()
   .find(m=>!explicitNew.test(norm(m.content))&&hasReportFacts(m.content));
  if(previous){
   // Mantém as palavras originais, não insere dados não relatados.
   // É apenas uma visão textual concatenada para a classificação local.
   return {type:'report',text:(previous.content+'\n'+input).slice(0,8000),usedHistory:true};
  }
  return {type:'needs_context',text:input,usedHistory:false};
 }
 return {type:'report',text:input,usedHistory:false};
}
