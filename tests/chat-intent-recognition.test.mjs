import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveChatIntent,hasReportFacts,isConceptualInquiry} from '../lib/chat-intent.js';
import {answerLocally} from '../lib/assistant.js';
import {analyzeOfflineReport} from '../lib/offline-sade-triage.js';
import {parseEvidence} from '../lib/offline-sade-parser.js';
import {COPOM_CATALOG} from '../lib/copom-catalog.js';

function analyzeIntent(text,history=[]){
 const intent=resolveChatIntent(text,history);
 if(intent.type!=='report')return {intent,result:null};
 return {intent,result:analyzeOfflineReport({text:intent.text,entries:COPOM_CATALOG})};
}
const codes=r=>r.natureSuggestions.map(x=>x.code);

test('chat reconhece ameaça com faca mesmo quando operador pergunta a natureza',()=>{
 const input='Solicitante relata que seu pai sofreu ameaças do amigo. O indivíduo está em frente à residência armado com um facão tentando forçar a porta. Qual a natureza?';
 const {intent,result}=analyzeIntent(input);
 assert.equal(intent.type,'report');
 assert.equal(intent.usedHistory,false);
 assert.equal(result.responseType,'relato');
 assert.equal(result.roleAnalysis.victim,'pai');
 assert.equal(result.roleAnalysis.instrument,'Arma branca');
 assert.ok(codes(result).includes('NAT-0005'));
 assert.ok(codes(result).includes('NAT-0012'));
 assert.equal(result.analysisQuestions.length,5);
});
test('pergunta direta sobre ocorrência é relato, não FAQ genérica',()=>{
 const inputs=[
  'O rapaz ameaçou a vítima com uma faca. Qual é a natureza da ocorrência?',
  'A mulher foi agredida pelo marido, ficou ferida. Que natureza devo selecionar?',
  'Uma pessoa está sendo roubada na rua. Qual é a classificação?',
  'Um indivíduo tentou invadir a residência. O que perguntar ao solicitante?'
 ];
 for(const text of inputs){
  assert.equal(hasReportFacts(text),true,text);
  assert.equal(isConceptualInquiry(text),false,text);
  const {intent,result}=analyzeIntent(text);
  assert.equal(intent.type,'report',text);
  assert.equal(result.analysisQuestions.length,5,text);
  assert.ok(result.natureSuggestions.length>0,'deve sugerir ao menos uma natureza: '+text);
 }
});
test('perguntas jurídicas conceituais continuam respondidas como consultas',()=>{
 for(const text of [
  'Qual a diferença entre furto e roubo?',
  'O que significa lesão corporal?',
  'Como funciona o Cérebro 190?'
 ]){
  assert.equal(isConceptualInquiry(text),true,text);
  assert.equal(resolveChatIntent(text,[]).type,'question',text);
 }
 const faq=answerLocally({text:'Qual a diferença entre furto e roubo?',entries:COPOM_CATALOG});
 assert.equal(faq.tipo,'faq');
});
test('continuação curta considera apenas a ocorrência imediatamente anterior quando apropriado',()=>{
 const previous='Solicitante relata discussão entre vizinhos sem agressão confirmada.';
 const history=[{role:'user',content:previous},{role:'assistant',content:'A discussão deve ser confirmada.'}];
 const intent=resolveChatIntent('E se ele também ameaçou a vítima?',history);
 assert.equal(intent.type,'report');
 assert.equal(intent.usedHistory,true);
 assert.match(intent.text,/Solicitante relata discussão/);
 assert.match(intent.text,/também ameaçou/);
 const result=analyzeOfflineReport({text:intent.text,entries:COPOM_CATALOG});
 assert.ok(codes(result).includes('NAT-0005'));
 assert.equal(result.analysisQuestions.length,5);
});
test('pergunta de continuação recebe orientação quando não existe ocorrência anterior',()=>{
 for(const question of ['Qual seria a natureza?', 'E se ele também agrediu a vítima?']){
  assert.equal(resolveChatIntent(question,[]).type,'needs_context',question);
 }
});
test('novo caso completo não herda crimes nem armas de outro caso',()=>{
 const history=[{role:'user',content:'O homem roubou o celular e apontou arma de fogo para a vítima.'}];
 const fresh='Novo caso: solicitante relata som alto e algazarra no condomínio.';
 const {intent,result}=analyzeIntent(fresh,history);
 assert.equal(intent.usedHistory,false);
 assert.equal(intent.type,'report');
 assert.ok(codes(result).includes('NAT-0002'));
 assert.ok(!codes(result).includes('NAT-0016'));
 assert.ok(!codes(result).includes('NAT-0076'));
 const independent=resolveChatIntent('Uma mulher relata que o filho foi embora de casa.',history);
 assert.equal(independent.usedHistory,false);
});
test('complemento com pronome retoma a situação anterior, sem forçar FAQ',()=>{
 const history=[{role:'user',content:'Uma mulher informa que um vizinho está em frente ao imóvel.'}];
 const intent=resolveChatIntent('Ele agrediu a mulher?',history);
 assert.equal(intent.type,'report');
 assert.equal(intent.usedHistory,true);
 assert.match(intent.text,/vizinho/);
});
test('frases de agressão e variações de subtração são reconhecidas sem inventar lesões',()=>{
 const assault=analyzeIntent('O solicitante informa que sua esposa sofreu agressões do vizinho. Qual natureza?').result;
 assert.ok(assault.evidence.some(x=>x.kind==='assault'));
 assert.ok(!codes(assault).includes('NAT-0009'),'agressão sem lesão confirmada não vira lesão corporal');
 assert.ok(assault.analysisQuestions.length===5);
 const theft=analyzeIntent('Solicitante relata que levaram o celular da vítima sem ameaça. Qual natureza?').result;
 assert.ok(theft.evidence.some(x=>x.kind==='stolen'));
 assert.ok(codes(theft).includes('NAT-0010'));
 const denied=parseEvidence('O comunicante afirmou que não houve agressões e ninguém ficou ferido.');
 assert.equal(denied.signals.assault.yes,false);
 assert.equal(denied.signals.injury.yes,false);
});
test('texto novo digitado em chat não deve ser reinterpretado por respostas anteriores',()=>{
 const h=[{role:'user',content:'Um homem tentou roubar uma carteira.'},{role:'assistant',content:'Pode ser roubo; confirmar ameaça.'}];
 const newCase=resolveChatIntent('Solicitante relata incêndio em uma residência.',h);
 assert.equal(newCase.type,'report');
 assert.equal(newCase.usedHistory,false);
 const result=analyzeOfflineReport({text:newCase.text,entries:COPOM_CATALOG});
 assert.ok(codes(result).includes('NAT-0071'));
 assert.ok(!codes(result).includes('NAT-0016'));
});
