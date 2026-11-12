import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COPOM_CATALOG,catalogRules} from '../lib/copom-catalog.js';

const api=readFileSync(new URL('../app/api/[[...path]]/route.js',import.meta.url),'utf8');
const page=readFileSync(new URL('../app/page.jsx',import.meta.url),'utf8');

test('catálogo de contingência fornece 769 fichas preservadas, com IDs estáveis só de consulta',()=>{
 assert.equal(COPOM_CATALOG.length,769);
 const fallback=COPOM_CATALOG.map(e=>({...e,id:'offline-'+e.code,revision:0,readOnly:true}));
 assert.equal(new Set(fallback.map(e=>e.id)).size,769);
 assert.equal(fallback[0].code,'NAT-0001');
 assert.equal(fallback[768].code,'NAT-0769');
 assert.ok(fallback.every(e=>e.readOnly===true&&e.title&&e.summary&&e.body));
 assert.equal(catalogRules(COPOM_CATALOG).length,769);
});
test('consultas autenticadas recuperam catálogo e regras de modo somente leitura, sem apagar fichas do banco',()=>{
 assert.match(api,/if\(route==='\/entries'&&method==='GET'\)/);
 assert.match(api,/if\(route==='\/rules'&&method==='GET'\)/);
 assert.match(api,/if\(bootstrapIssue\)throw bootstrapIssue/);
 assert.match(api,/readOnly:true/);
 assert.match(api,/degraded:true/);
 assert.match(api,/catalogRules\(COPOM_CATALOG\)/);
 assert.match(api,/if\(!u\)return failure/);
 assert.match(api,/const u=await identity\(\)/);
 const fallbackArea=api.slice(api.indexOf("if(route==='/entries'"),api.indexOf("if(route.startsWith('/documentation/assets'))"));
 assert.doesNotMatch(fallbackArea,/UPDATE knowledge|DELETE FROM knowledge|TRUNCATE/);
});
test('front-end recebe fichas mesmo se regras falharem e não mostra zero falso',()=>{
 assert.match(page,/Promise\.allSettled\(\[call\('\/entries'\),call\('\/rules'\)\]\)/);
 assert.match(page,/catalog\.status==='fulfilled'/);
 assert.match(page,/rules\.status==='fulfilled'/);
 assert.match(page,/setCatalogDegraded\(degraded\.length>0\)/);
 assert.match(page,/catalogIssue&&!entries\.length\?'—':entries\.length/);
 assert.match(page,/catalogIssue&&!totalRules\?'—':totalRules/);
 assert.match(page,/Tentar novamente/);
 assert.match(page,/if\(entry\?\.readOnly\|\|catalogDegraded\)/);
});
test('triagem offline continua utilizando apenas naturezas válidas do arquivo em falha de consulta',()=>{
 assert.match(api,/entries=knowledge\.rows\.length\?knowledge\.rows:COPOM_CATALOG/);
 assert.match(api,/entries=COPOM_CATALOG;readFallback=true/);
 assert.match(api,/result,degraded:readFallback/);
 assert.doesNotMatch(api.slice(api.indexOf("if((route==='/chat'"),api.indexOf("// Escalas:")),/askGemini\(/);
});
