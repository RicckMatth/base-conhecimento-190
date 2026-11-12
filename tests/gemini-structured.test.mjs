import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeNatureSuggestions,essentialSondagem} from '../lib/gemini-response.js';
import {askGemini} from '../lib/gemini.js';

const catalog=[
 {code:'NAT-0005',title:'AMEAÇA CONTRA MULHER',category:'Pessoas',summary:'Ameaça relatada, sem crime automático.'},
 {code:'NAT-0009',title:'LESÃO CORPORAL',category:'Pessoas',summary:'Agressão e lesão a confirmar.'},
 {code:'NAT-0012',title:'VIOLAÇÃO DE DOMICÍLIO',category:'Patrimônio',summary:'Entrada sem autorização.'},
];
function mockEnv(){
 const previous=process.env.GEMINI_API_KEY;
 process.env.GEMINI_API_KEY='key-for-tests';
 return ()=>{if(previous===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=previous;};
}
test('ranking descarta códigos inexistentes, duplicatas e percentuais inválidos, sem alterar títulos oficiais',()=>{
 const actual=normalizeNatureSuggestions([
  {code:'NAT-9999',proximidade:99,motivo:'Código inventado'},
  {code:'NAT-0005',proximidade:58,motivo:'Ameaça mencionada'},
  {code:'NAT-0009',proximidade:77,motivo:'Lesão não confirmada'},
  {code:'NAT-0005',proximidade:95,motivo:'Duplicado'},
  {code:'NAT-0012',proximidade:110,motivo:'Fora de faixa'},
  {code:'NAT-0012',proximidade:34,motivo:'Entrada não autorizada a confirmar'},
 ],catalog);
 assert.deepEqual(actual.map(x=>[x.code,x.proximity]),[['NAT-0009',77],['NAT-0005',58],['NAT-0012',34]]);
 assert.equal(actual[0].title,'LESÃO CORPORAL');
 assert.ok(actual.every(x=>x.proximity>=0&&x.proximity<=100));
 assert.deepEqual(normalizeNatureSuggestions([{code:'INVENTADO',proximidade:100}],catalog),[]);
});
test('perguntas devem ser cinco, distintas, padronizadas, e não repetir informação já respondida',()=>{
 const relato='O marido foi embora. A mulher informa que não houve feridos e ninguém estava armado.';
 const q=essentialSondagem({text:relato,isOccurrence:true,nature:catalog[0],
  suggestedTopics:['injured','weapons','ongoing','relationship','threat','address','safe','address']});
 assert.equal(q.length,5);
 assert.equal(new Set(q.map(x=>x.topic)).size,5);
 assert.ok(!q.some(x=>x.topic==='injured'),'não repetir resposta negativa sobre feridos');
 assert.ok(!q.some(x=>x.topic==='weapons'),'não repetir negativa de armas');
 assert.ok(q.every(x=>x.question.endsWith('?')));
 assert.equal(essentialSondagem({text:'Qual a diferença entre furto e roubo?',isOccurrence:false}).length,0);
});
test('sem natureza identificada, o Gemini ainda recebe cinco perguntas de sondagem',()=>{
 const result=essentialSondagem({text:'Uma pessoa ligou porque houve uma discussão e alguém saiu.',isOccurrence:true,suggestedTopics:[]});
 assert.equal(result.length,5);
 assert.equal(new Set(result.map(x=>x.topic)).size,5);
});
test('Gemini retorna análise orientativa, ranking validado e cinco perguntas fora do texto',async()=>{
 const restore=mockEnv();
 try{
  let calls=0;
  const output={tipoConsulta:'relato',dadosInsuficientes:true,
   resposta:'Foi relatada discussão entre adultos e não há informação de agressão. Não é possível afirmar a ocorrência de crime com base no relato atual.',
   questionTopics:['injured','weapons','safe','relationship','threat'],
   natureSuggestions:[
    {code:'NAT-0005',proximidade:52,motivo:'Possível ameaça, mas não foram informadas palavras ameaçadoras.'},
    {code:'NAT-9999',proximidade:98,motivo:'Código falso'}
   ]};
  const result=await askGemini({text:'Mulher informa discussão com marido que foi embora, sem feridos.',entries:catalog,mode:'relato',
   generate:async opts=>{calls++;assert.ok(opts.maxOutputTokens>=3000);assert.equal(opts.maxRetries,0);
    assert.match(opts.instructions,/exatamente CINCO/);assert.match(opts.instructions,/proximidade/);
    assert.ok(!opts.instructions.includes('key-for-tests'));return {output};}});
  assert.equal(calls,1);
  assert.equal(result.responseType,'relato');
  assert.equal(result.natureSuggestions.length,1);
  assert.equal(result.natureSuggestions[0].code,'NAT-0005');
  assert.equal(result.natureSuggestions[0].proximity,52);
  assert.equal(result.insufficientData,true);
  assert.equal(result.analysisQuestions.length,5);
  assert.ok(result.analysisQuestions.every(x=>x.topic!=='injured'));
  assert.equal(result.feedbackNature.code,'NAT-0005');
  assert.equal(result.tipo,'ia');
 }finally{restore();}
});
test('Gemini não inventa hipótese se não encontra ficha; mantém sondagem',async()=>{
 const restore=mockEnv();
 try{
  const result=await askGemini({text:'Uma pessoa está pedindo apoio sem detalhes.',entries:[],mode:'relato',
   generate:async()=>({output:{tipoConsulta:'relato',dadosInsuficientes:false,
    resposta:'Não há fatos suficientes para reconhecer uma natureza.',questionTopics:[],
    natureSuggestions:[{code:'NAT-9999',proximidade:100,motivo:'Inexistente'}]}})});
  assert.equal(result.natureSuggestions.length,0);
  assert.equal(result.insufficientData,true);
  assert.equal(result.analysisQuestions.length,5);
  assert.equal(result.feedbackNature,null);
 }finally{restore();}
});
test('dúvida conceitual e teste técnico não forçam cinco perguntas nem percentuais',async()=>{
 const restore=mockEnv();
 try{
  for(const mode of ['auto','diagnostic']){
   const result=await askGemini({text:'Qual a diferença entre furto e roubo?',entries:catalog,mode,generate:async()=>({output:{
    tipoConsulta:'duvida',dadosInsuficientes:false,
    resposta:'Diferencie a subtração sem violência da praticada com violência ou grave ameaça.',
    questionTopics:[],natureSuggestions:[]
   }})});
   assert.equal(result.responseType,'duvida');
   assert.deepEqual(result.analysisQuestions,[]);
   assert.deepEqual(result.natureSuggestions,[]);
  }
 }finally{restore();}
});
