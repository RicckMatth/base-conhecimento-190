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


test('revisão IA melhora a pontuação mantendo a sequência integral de palavras',()=>{
 const original='solicitante relata que seu pai sofreu ameacas do amigo, pede viatura no local pois o individuo esta em frente a residencia armado com um facao tentando entrar na residencia';
 const proposed='SOLICITANTE RELATA QUE SEU PAI SOFREU AMEAÇAS DO AMIGO. PEDE VIATURA NO LOCAL, POIS O INDIVÍDUO ESTÁ EM FRENTE A RESIDÊNCIA ARMADO COM UM FACÃO TENTANDO ENTRAR NA RESIDÊNCIA.';
 const revised=validateRewrite(original,proposed);
 const words=v=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu);
 assert.deepEqual(words(revised),words(correctReport(original)));
 assert.match(revised,/DO AMIGO\. PEDE VIATURA NO LOCAL, POIS/);
 assert.ok(revised.includes('ARMADO COM UM FACÃO'));
});
test('revisão remota rejeita qualquer palavra acrescentada, removida, trocada ou reordenada',()=>{
 const input='O SOLICITANTE RELATA AMEAÇA DO VIZINHO.';
 const invalid=[
  'O SOLICITANTE RELATA GRAVE AMEAÇA DO VIZINHO.',
  'O SOLICITANTE RELATA AMEAÇA.',
  'O SOLICITANTE RELATA AGRESSÃO DO VIZINHO.',
  'O VIZINHO RELATA AMEAÇA DO SOLICITANTE.',
  'O SOLICITANTE RELATA AMEAÇA DO VIZINHO. A VIATURA FOI ENVIADA.'
 ];
 for(const value of invalid)assert.throws(()=>validateRewrite(input,value),/REWRITE_/);
});
test('números, horários e falas citadas permanecem intocados durante a revisão',()=>{
 const original='O solicitante diz "nao sei" e informou ABC1D23 às 14h30.';
 assert.equal(validateRewrite(original,'O SOLICITANTE DIZ "NAO SEI" E INFORMOU ABC1D23 ÀS 14H30.'),
  correctReport(original));
 assert.equal(validateRewrite(original,'O SOLICITANTE DIZ "NÃO SEI" E INFORMOU ABC1D23 ÀS 14H30.'),correctReport(original));
 assert.throws(()=>validateRewrite(original,'O SOLICITANTE DIZ "NAO, SEI" E INFORMOU ABC1D23 ÀS 14H30.'),/REWRITE_QUOTES_CHANGED/);
 assert.throws(()=>validateRewrite(original,'O SOLICITANTE DIZ "NAO SEI" E INFORMOU ABC1D23 ÀS 15H30.'),/REWRITE_FACTS_CHANGED/);
});
test('Gemini sinaliza revisão aplicada apenas quando pontuação muda',async()=>{
 const old=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='unit-test';
 try{
  const text='solicitante relata ameacas do amigo, pede viatura no local pois o individuo esta com um facao.';
  const improved=await rewriteWithGemini(text,{generate:async args=>{
   assert.match(args.instructions,/MESMAS PALAVRAS/);
   assert.match(args.instructions,/pontuação/);
   assert.match(args.prompt,/SOLICITANTE RELATA AMEAÇAS DO AMIGO/);
   return {text:'SOLICITANTE RELATA AMEAÇAS DO AMIGO. PEDE VIATURA NO LOCAL, POIS O INDIVÍDUO ESTÁ COM UM FACÃO.'};
  }});
  assert.equal(improved.changed,true);
  assert.equal(improved.status,'improved');
  assert.match(improved.text,/AMIGO\. PEDE VIATURA/);
  const identical=await rewriteWithGemini(text,{generate:async()=>({text:correctReport(text)})});
  assert.equal(identical.changed,false);
  assert.equal(identical.status,'unchanged');
  assert.equal(identical.text,correctReport(text));
 }finally{if(old===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=old;}
});
