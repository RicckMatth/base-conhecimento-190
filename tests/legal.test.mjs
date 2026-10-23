import test from 'node:test';import assert from 'node:assert/strict';
import {LEGAL_REFERENCES,withLegalReferences} from '../lib/legal-references.js';
import {CEREBRO_190} from '../lib/cerebro.js';import {EXTRA_RULES} from '../lib/extras.js';
test('todas as 100 naturezas têm referência ou justificativa explícita sem crime automático',()=>{
 const all=[...CEREBRO_190.regrasBase,...EXTRA_RULES];assert.equal(Object.keys(LEGAL_REFERENCES).length,100);
 for(const r of all){assert.ok(r.legal,r.id);assert.ok(r.legal.note.length>30);assert.equal(r.legal.reviewedAt,'2026-10-23');for(const ref of r.legal.references)assert.ok(new URL(ref.url).hostname.endsWith('planalto.gov.br')||new URL(ref.url).hostname.endsWith('stf.jus.br'));}
});
test('Maria da Penha e Código Penal são referências distintas',()=>{
 const r=CEREBRO_190.analisarEntrada('Uma mulher está sendo agredida pelo marido dentro de casa',EXTRA_RULES);
 assert.equal(r.principal.legal.status,'cp');assert.ok(r.principal.legal.references.some(x=>x.lawId==='CP'&&x.article.includes('129')));assert.ok(r.principal.legal.references.some(x=>x.lawId==='MP'));
 const mpu=CEREBRO_190.regrasBase.find(r=>r.id==='nat-vd-mpu');assert.equal(mpu.legal.status,'special');assert.ok(mpu.legal.references.some(x=>x.lawId==='MP'&&x.article==='Art. 24-A'));
});
test('emergências, extravio e arma encontrada não são crimes automaticamente',()=>{
 for(const id of ['catalogo-010','catalogo-023','catalogo-045','catalogo-063','catalogo-065','catalogo-070'])assert.equal(LEGAL_REFERENCES[id].status,'service');
 assert.equal(LEGAL_REFERENCES['catalogo-011'].references[0].lawId,'RAC');assert.equal(LEGAL_REFERENCES['catalogo-044'].references[0].lawId,'AMB');
 assert.equal(withLegalReferences({id:'custom-unknown'}).legal,undefined);
});
