import test from 'node:test';
import assert from 'node:assert/strict';
import {correctReport,validateRewrite} from '../lib/writing.js';
import {CEREBRO_190} from '../lib/cerebro.js';
import {EXTRA_RULES} from '../lib/extras.js';
import {rewriteWithGemini} from '../lib/gemini.js';
test('corrige acentuação e termos operacionais sem retirar acentos na caixa alta',()=>{
 assert.equal(correctReport('solisitante infroma que a vitima nao esta ferida e o veiculo esta no local'),'SOLICITANTE INFORMA QUE A VÍTIMA NÃO ESTÁ FERIDA E O VEÍCULO ESTÁ NO LOCAL.');
 assert.equal(correctReport('ha uma crianca na residencia proxima ao portao'),'HÁ UMA CRIANÇA NA RESIDÊNCIA PRÓXIMA AO PORTÃO.');
});
test('corrige concordância inequívoca, horário e espaços',()=>{
 assert.equal(correctReport('os suspeitos esta no local ,as 14h30'),'OS SUSPEITOS ESTÃO NO LOCAL, ÀS 14H30.');
 assert.equal(correctReport('esta rua tem uma arvore'),'ESTA RUA TEM UMA ÁRVORE.');
 assert.equal(correctReport('ele bebe agua'),'ELE BEBE ÁGUA.');
 assert.equal(correctReport('um bebe esta no local'),'UM BEBÊ ESTÁ NO LOCAL.');
});
test('mantém números, placa, nomes e incerteza sem inventar providência',()=>{
 const input='joao nao sabe se a vitima esta ferida. veiculo placa ABC1D23 na rua X 123, as 14h30, telefone 41999998888';
 const out=correctReport(input);
 for(const value of ['JOAO','NÃO SABE','ABC1D23','123','14H30','41999998888'])assert.ok(out.includes(value));
 assert.ok(!out.includes('VIATURA'));assert.ok(!out.includes('PRIORIDADE'));
 assert.equal(correctReport('eles furtarão o veiculo'),'ELES FURTARÃO O VEÍCULO.');
});
test('falas diretas não recebem substituição lexical e todo texto fica em caixa alta',()=>{
 const out=correctReport('a vitima disse "nao fui eu"');
 assert.equal(out,'A VÍTIMA DISSE "NAO FUI EU".');
 assert.equal(out,out.toLocaleUpperCase('pt-BR'));
});
test('motor devolve correção em caixa alta sem encerramento fictício',()=>{
 const r=CEREBRO_190.analisarEntrada('dois homens armados roubaram meu celular. a vitima nao esta ferida',EXTRA_RULES);
 assert.equal(r.relatoRevisado,r.relatoRevisado.toLocaleUpperCase('pt-BR'));
 assert.ok(r.relatoRevisado.includes('VÍTIMA NÃO ESTÁ FERIDA'));
 assert.ok(!r.relatoRevisado.includes('VIATURA POLICIAL SOLICITADA'));
});
test('revisão remota rejeita alteração de números, negação ou despacho inventado',()=>{
 assert.throws(()=>validateRewrite('A vítima tem 20 anos.','A VÍTIMA TEM 30 ANOS.'));
 assert.throws(()=>validateRewrite('Não há feridos.','HÁ FERIDOS.'));
 assert.throws(()=>validateRewrite('Não sabe se há feridos.','NÃO HÁ FERIDOS.'));
 assert.throws(()=>validateRewrite('O suspeito saiu.','O SUSPEITO SAIU. VIATURA SOLICITADA.'));
 assert.equal(validateRewrite('a vitima nao esta ferida','A vítima não está ferida.'),'A VÍTIMA NÃO ESTÁ FERIDA.');
});
test('fallback de revisão aceita chamada explícita e aplica caixa alta no retorno',async()=>{
 const old=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='unit-test';
 try{
  let calls=0;
  const result=await rewriteWithGemini('a vitima nao esta ferida',{generate:async()=>{calls++;return {text:'A vítima não está ferida.'};}});
  assert.equal(calls,1);assert.equal(result.text,'A VÍTIMA NÃO ESTÁ FERIDA.');
 }finally{if(old===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=old;}
});
