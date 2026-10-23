import test from 'node:test';
import assert from 'node:assert/strict';
import {questionsFor,evaluateTriage,applyTriage} from '../lib/triage.js';
import {CEREBRO_190} from '../lib/cerebro.js';
import {EXTRA_RULES} from '../lib/extras.js';
const assault=CEREBRO_190.regrasBase.find(r=>r.id==='nat-vd-lesao');
const robbery=CEREBRO_190.regrasBase.find(r=>r.id==='nat-roubo-geral');
const pending=(rule,text)=>evaluateTriage(rule,text).pending.map(q=>q.id);
test('todas as 100 naturezas têm roteiro ampliado e sem perguntas duplicadas',()=>{
 const rules=[...CEREBRO_190.regrasBase,...EXTRA_RULES];
 assert.equal(rules.length,100);
 for(const r of rules){const qs=questionsFor(r);assert.ok(qs.length>=8,`${r.code}: ${qs.length}`);assert.equal(new Set(qs.map(q=>q.text)).size,qs.length);}
});
test('respostas afirmativas e negativas explícitas escondem apenas campos respondidos',()=>{
 const text='O marido está no local. Está armado com uma faca. Não há feridos. A vítima está em segurança. O fato começou às 14h30. Local: Rua das Flores 123. Em frente ao mercado Central.';
 const result=evaluateTriage(assault,text);
 for(const key of ['relationship','suspectHere','weapons','injured','safe','time','address','landmark'])assert.ok(result.answered.some(q=>q.id===key),key);
 assert.ok(result.pending.some(q=>q.id==='protection'));
});
test('informação desconhecida, pergunta e hipótese não ocultam perguntas',()=>{
 for(const text of ['Não sabe se há feridos.','Há feridos?','Talvez o autor esteja armado.','Não foi informado se o autor está no local.','Não tem certeza se existe medida protetiva.']){
  const r=evaluateTriage(assault,text);assert.equal(r.answered.length,0,text);
 }
});
test('contradição mantém a pergunta pendente para confirmação',()=>{
 const r=evaluateTriage(assault,'Há feridos. Não há feridos.');
 assert.ok(r.pending.some(q=>q.id==='injured'&&q.reason==='conflicting'));
});
test('campos compostos são independentes: arma não responde presença, roupa não responde fuga',()=>{
 const r=evaluateTriage(robbery,'Um homem de camiseta preta com uma pistola levou meu celular.');
 assert.ok(r.answered.some(q=>q.id==='weapons'));
 assert.ok(r.answered.some(q=>q.id==='taken'));
 assert.ok(r.answered.some(q=>q.id==='description'));
 assert.ok(r.pending.some(q=>q.id==='suspectHere'));
 assert.ok(r.pending.some(q=>q.id==='escape'));
});
test('o resultado do motor é filtrado sem alterar o roteiro global',()=>{
 const before=robbery.triageQuestions.length;
 const r=CEREBRO_190.analisarEntrada('Dois homens armados anunciaram assalto e roubaram meu celular. Sem feridos.',EXTRA_RULES);
 assert.equal(r.tipo,'classificacao');assert.ok(r.triage.answered.some(q=>q.id==='injured'));
 assert.ok(!r.principal.triageQuestions.some(q=>q.includes('pessoas feridas')));
 assert.equal(robbery.triageQuestions.length,before);
 const fresh=applyTriage({...r,principal:robbery},'Dois homens anunciaram assalto.');
 assert.ok(fresh.triage.pending.some(q=>q.id==='injured'));
});
test('atualizar o relato recalcula perguntas, inclusive ao apagar informação',()=>{
 assert.ok(!pending(assault,'Sem feridos.').includes('injured'));
 assert.ok(pending(assault,'Relato inicial de agressão.').includes('injured'));
});
test('perguntas personalizadas sem detector são preservadas',()=>{
 const r={id:'custom-uuid',category:'Proteção',triageQuestions:['Existe uma condição local específica?']};
 assert.ok(evaluateTriage(r,'Há feridos.').pending.some(q=>q.question===r.triageQuestions[0]));
});
test('roteiros adequados ao cenário evitam perguntar sobre agressor em incêndio',()=>{
 const fire=EXTRA_RULES.find(r=>r.id==='extra-incendio-residencia');
 const ids=questionsFor(fire).map(q=>q.id);
 assert.ok(ids.includes('trapped'));assert.ok(ids.includes('fireArea'));assert.ok(!ids.includes('suspectHere'));
});
test('contradição dentro da mesma frase também mantém a confirmação',()=>{
 const r=evaluateTriage(assault,'Não há feridos, mas a vítima está sangrando.');
 assert.ok(r.pending.some(q=>q.id==='injured'&&q.reason==='conflicting'));
});
test('uma resposta negativa de triagem não desvia um relato reconhecido para a IA',async()=>{
 const {answerLocally}=await import('../lib/assistant.js');
 const r=answerLocally({text:'Dois homens armados anunciaram assalto e roubaram meu celular. Não há feridos.',classify:t=>CEREBRO_190.analisarEntrada(t,EXTRA_RULES)});
 assert.equal(r?.source,'local');assert.ok(r.triage.answered.some(q=>q.id==='injured'));
 assert.equal(answerLocally({text:'Não houve roubo nem ameaça.',classify:t=>CEREBRO_190.analisarEntrada(t,EXTRA_RULES)}),null);
});
