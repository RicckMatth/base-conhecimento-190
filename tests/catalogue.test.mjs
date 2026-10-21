import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGUE_RULES } from '../lib/catalogue.js';
import { EXTRA_RULES } from '../lib/extras.js';
import { CEREBRO_190 } from '../lib/cerebro.js';
const all=[...CEREBRO_190.regrasBase,...EXTRA_RULES];
test('catálogo unificado tem 100 fichas com IDs e códigos únicos',()=>{
 assert.equal(all.length,100);
 assert.equal(new Set(all.map(x=>x.id)).size,all.length);
 assert.equal(new Set(all.map(x=>x.code)).size,all.length);
 for(const r of CATALOGUE_RULES){
  assert.match(r.code,/^CAT-\d{3}$/); assert.equal(r.codeType,'interno');
  assert.ok(r.triageQuestions.length>=3);assert.ok(r.explanation.length>30);
  assert.ok(r.requiredGroups.every(g=>g.length&&g.every(t=>t.length>3)));
 }
});
test('reconhece novos cenários representativos em diferentes áreas',()=>{
 for(const [text,code] of [
  ['Há vazamento de gás no prédio','CAT-052'],
  ['Denúncia de racismo no estabelecimento','CAT-011'],
  ['Há desmatamento acontecendo nesta área','CAT-048'],
  ['Relato de direção perigosa na avenida','CAT-036'],
  ['O solicitante comunica descumprimento de ordem judicial','CAT-068'],
  ['Uma pessoa com deficiencia agredida pede ajuda','CAT-019']
 ])assert.equal(CEREBRO_190.analisarEntrada(text,EXTRA_RULES)?.principal?.code,code,text);
});
test('não identifica natureza com texto sem informação de ocorrência',()=>{
 const out=CEREBRO_190.analisarEntrada('Preciso consultar o catálogo de atendimento',EXTRA_RULES);
 assert.notEqual(out?.tipo,'classificacao');
});
