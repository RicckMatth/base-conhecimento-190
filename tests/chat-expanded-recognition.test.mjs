import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveChatIntent,hasReportFacts,isConceptualInquiry} from '../lib/chat-intent.js';
import {analyzeOfflineReport} from '../lib/offline-sade-triage.js';
import {parseEvidence} from '../lib/offline-sade-parser.js';
import {COPOM_CATALOG} from '../lib/copom-catalog.js';

function run(text,history=[]){
 const intent=resolveChatIntent(text,history);
 return {intent,result:intent.type==='report'?analyzeOfflineReport({text:intent.text,entries:COPOM_CATALOG}):null};
}
const codes=r=>r?.natureSuggestions?.map(x=>x.code)||[];
test('pedidos de natureza sobre casos não entram na resposta conceitual genérica',()=>{
 const cases=[
  ['Qual natureza para uma briga de casal sem violência?', 'NAT-0023'],
  ['Qual natureza para uma pessoa que foi roubada na rua?', 'NAT-0016'],
  ['Qual a classificação de um furto de celular?', 'NAT-0010'],
  ['Me diga qual natureza para um disparo de arma de fogo numa residência.', 'NAT-0027'],
  ['Classifique o caso: mulher informa que um vizinho arrombou seu portão.', 'NAT-0012']
 ];
 for(const [text,code] of cases){
  const {intent,result}=run(text);
  assert.equal(intent.type,'report',text);
  assert.ok(codes(result).includes(code),'não identificou '+code+' em '+text+': '+JSON.stringify(result?.natureSuggestions));
  assert.equal(result.analysisQuestions.length,5,text);
 }
});
test('relatos diretos curtos continuam analisados em vez de FAQ',()=>{
 const inputs=[
  ['Fui roubado na rua, qual natureza?', 'NAT-0016'],
  ['Houve disparo de arma de fogo em frente à casa.', 'NAT-0027'],
  ['Meu vizinho está com música alta.', 'NAT-0002'],
  ['O indivíduo quebrou o vidro da janela de propósito.', 'NAT-0017'],
  ['Uma pessoa relatou perda do RG.', 'NAT-0036'],
  ['Mulher informa que um indivíduo está mantendo a vítima em cárcere privado.', 'NAT-0081'],
  ['Solicitante informou que criança foi vítima de estupro.', 'NAT-0072']
 ];
 for(const [text,code] of inputs){
  const {intent,result}=run(text);
  assert.equal(intent.type,'report',text);
  assert.ok(codes(result).includes(code),'não identificou '+code+' em '+text+': '+JSON.stringify(result?.natureSuggestions));
 }
});
test('negações coordenadas não geram ameaças, agressões e armas que não existiram',()=>{
 const text='Solicitante informa briga verbal. Não houve agressão e ameaça. Não houve faca nem arma de fogo.';
 const signals=parseEvidence(text).signals;
 for(const key of ['assault','threat','knife','gun'])assert.equal(signals[key].yes,false,key);
 const r=analyzeOfflineReport({text,entries:COPOM_CATALOG});
 assert.ok(!codes(r).includes('NAT-0005'));
 assert.ok(!codes(r).includes('NAT-0009'));
 assert.ok(!codes(r).includes('NAT-0076'));
 assert.ok(codes(r).includes('NAT-0023'),'desentendimento permanece hipótese');
});
test('relato sem informação suficiente recebe cinco perguntas e não inventa crime',()=>{
 const {intent,result}=run('Uma pessoa pede orientação, mas não descreveu o que aconteceu.');
 assert.equal(intent.type,'report');
 assert.equal(result.analysisQuestions.length,5);
 assert.equal(result.natureSuggestions.length,0);
 assert.equal(result.insufficientData,true);
});
test('consulta teórica sobre diferença entre naturezas não gera ocorrência',()=>{
 for(const text of ['Qual a diferença entre roubo e furto?','O que significa lesão corporal?','Como funciona o Cérebro 190?']){
  assert.equal(isConceptualInquiry(text),true,text);
  assert.equal(resolveChatIntent(text).type,'question',text);
 }
});
test('pedido genérico sem fato solicita informações, e complemento explícito herda o último relato',()=>{
 assert.equal(resolveChatIntent('Qual seria a natureza?').type,'needs_context');
 const history=[{role:'user',content:'Solicitante relata que um indivíduo roubou o celular da vítima.'}];
 const intent=resolveChatIntent('Qual seria a natureza?',history);
 assert.equal(intent.type,'report');
 assert.equal(intent.usedHistory,true);
 const result=analyzeOfflineReport({text:intent.text,entries:COPOM_CATALOG});
 assert.ok(codes(result).includes('NAT-0016'));
});
test('consulta de um novo caso não mistura a ocorrência antiga do histórico',()=>{
 const history=[{role:'user',content:'A vítima foi assaltada por um indivíduo armado com revólver.'}];
 const {intent,result}=run('Novo caso: o vizinho está com som alto e gritaria.',history);
 assert.equal(intent.usedHistory,false);
 assert.ok(codes(result).includes('NAT-0002'));
 assert.ok(!codes(result).includes('NAT-0016'));
});
