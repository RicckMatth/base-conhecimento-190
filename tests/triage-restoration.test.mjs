import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRoles} from '../lib/offline-sade-parser.js';
import {analyzeOfflineReport} from '../lib/offline-sade-triage.js';
import {COPOM_CATALOG} from '../lib/copom-catalog.js';
const run=(text,roleOverrides)=>analyzeOfflineReport({text,entries:COPOM_CATALOG,roleOverrides});
const codes=r=>r.natureSuggestions.map(x=>x.code);

test('voz ativa, passiva e progressiva preservam agente e alvo',()=>{
 for(const text of ['O marido ameaçou a esposa.','A esposa foi ameaçada pelo marido.','O marido está ameaçando a esposa.']){
  const r=run(text);assert.equal(r.roleAnalysis.author,'marido',text);assert.equal(r.roleAnalysis.victim,'esposa',text);
  assert.ok(codes(r).includes('NAT-0019'),text);
 }
 const r=run('Meu marido me ameaça.');
 assert.equal(r.roleAnalysis.caller,'Possível vítima direta');assert.equal(r.roleAnalysis.victim,'solicitante');
 assert.equal(r.roleAnalysis.author,'marido');assert.ok(!codes(r).includes('NAT-0019'),'sexo da pessoa solicitante é desconhecido');
});
test('negação não atribui autoria e familiar de terceiro não presume vínculo com a vítima',()=>{
 assert.equal(parseRoles('O marido não agrediu a esposa.').authorKnown,false);
 assert.equal(parseRoles('Talvez o marido agrediu a esposa.').victimKnown,false);
 assert.equal(parseRoles('Solicitante informa que seu pai ameaçou a vizinha.').domestic,false);
 assert.equal(parseRoles('O pai ameaçou a vizinha.').domestic,false);
});
test('correção manual recalcula natureza e resumo sem alterar o relato',()=>{
 const text='Meu marido me ameaça.';
 const corrected=run(text,{caller:'Possível vítima direta',victim:'mulher',author:'marido',domestic:true});
 assert.ok(codes(corrected).includes('NAT-0019'));assert.match(corrected.resposta,/pessoa atingida: mulher/);
 assert.equal(corrected.originalReport,text);assert.equal(corrected.roleAnalysis.method,'correção manual do operador');
 const undone=run(text,{victim:'Não identificado',author:'Não identificado',domestic:false});
 assert.ok(!codes(undone).includes('NAT-0019'));assert.equal(undone.analysisQuestions.length,5);
 assert.deepEqual(run(text,{victim:'<script>',domestic:'true'}),run(text),'valores inválidos não alteram a análise');
});
test('palavras negadas não contornam filtros por correspondência lexical',()=>{
 for(const text of ['Não houve sequestro nem cárcere privado.','Não houve importunação sexual.','Talvez tenha ocorrido sequestro e cárcere privado.','Se houver ameaça e agressão, o que perguntar?']){
  assert.deepEqual(codes(run(text)),[],text);
 }
});
test('risco de armas é separado de porte ilegal e de situação desconhecida',()=>{
 for(const text of ['Um homem está no portão com uma arma de fogo.','Um homem está no portão com uma faca.']){
  const r=run(text);assert.equal(r.situationStatus,'desconhecida');assert.ok(r.riskSignals.length>0);
  assert.ok(!codes(r).some(c=>['NAT-0076','NAT-0110'].includes(c)));assert.equal(r.analysisQuestions.length,5);
 }
 assert.equal(run('Perdi meu RG.').situationStatus,'sem_indicio_criminal_confirmado');
 assert.equal(run('Algo aconteceu.').situationStatus,'desconhecida');
 const uncertain=run('Não sabe se houve ameaça ou ferimento.');
 assert.ok(uncertain.unconfirmedEvidence.length);assert.deepEqual(codes(uncertain),[]);
});
test('naturezas continuam limitadas ao catálogo ativo, sem probabilidades calibradas',()=>{
 const r=analyzeOfflineReport({text:'O marido ameaçou a esposa.',entries:[]});assert.deepEqual(r.natureSuggestions,[]);
 assert.match(r.disclaimer,/não probabilidades/);
});
test('falta de informação sobre lesões não equivale a negativa e arma de terceiro não qualifica roubo',()=>{
 assert.ok(!codes(run('O vizinho agrediu a mulher.')).some(c=>['NAT-0011','NAT-0049','NAT-0009'].includes(c)));
 assert.ok(codes(run('O vizinho agrediu a mulher. Não houve ferimentos.')).includes('NAT-0011'));
 const r=run('Um homem roubou o celular da vítima. Um policial chegou depois com arma de fogo.');
 assert.ok(codes(r).includes('NAT-0016'));assert.ok(!codes(r).includes('NAT-0037'));
});
