import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validPmCivilLogin} from '../lib/security.js';
import {canReviewReset,validateNewPassword,requestPasswordReset} from '../lib/password-flows.js';

const dev={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',role:'admin',username:'pm-civil.bandeira',operational_role:'dev',must_change_password:false};
const coordinator={id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',role:'user',username:'pm-civil.coord',operational_role:'coordinator',must_change_password:false};
const manager={id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',role:'user',username:'pm-civil.manager',operational_role:'manager',must_change_password:false};
const attendant={id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',role:'user',username:'pm-civil.operator',operational_role:'attendant',active:true};
test('o acesso local aceita apenas a identidade PM Civil sem expor sua expressão regular na interface',()=>{
  assert.equal(validPmCivilLogin('pm-civil.bandeira'),true);
  assert.equal(validPmCivilLogin('pm-civil.operator'),true);
  assert.equal(validPmCivilLogin('atendente'),false);
  assert.equal(validPmCivilLogin('outra-empresa.bandeira'),false);
  assert.equal(validPmCivilLogin('pm-civil.'),false);
  assert.equal(validPmCivilLogin('pm-civil.test@minsait.com'),false);
  assert.equal(validPmCivilLogin('PM-CIVIL.OPERATOR'),false);
  const page=readFileSync(new URL('../app/page.jsx',import.meta.url),'utf8');
  assert.match(page,/Acesso PM Civil/);
  assert.match(page,/Primeiro acesso \/ criar senha/);
  assert.doesNotMatch(page,/placeholder="pm-civil\./);
});
test('apenas gestor, coordenador e dev podem aprovar reset conforme hierarquia',()=>{
  assert.equal(canReviewReset(manager,attendant),true);
  assert.equal(canReviewReset(coordinator,attendant),true);
  assert.equal(canReviewReset(dev,attendant),true);
  assert.equal(canReviewReset(manager,coordinator),false);
  assert.equal(canReviewReset(manager,{...attendant,operational_role:'manager'}),false);
  assert.equal(canReviewReset(coordinator,{...attendant,operational_role:'manager'}),true);
  assert.equal(canReviewReset(manager,{...attendant,active:false}),false);
  assert.equal(canReviewReset(dev,{...attendant,role:'admin'}),false);
  assert.equal(canReviewReset(manager,{...attendant,id:manager.id}),false);
});
test('senha nova requer complexidade de pelo menos 12 caracteres',()=>{
  assert.equal(validateNewPassword('AcessoPm190!2026'),true);
  assert.equal(validateNewPassword('muitofacil'),false);
  assert.equal(validateNewPassword('muitofacil2026'),false);
  assert.equal(validateNewPassword('MUITOFACIL123!'),false);
  assert.equal(validateNewPassword('Aa1!'),false);
});
test('pedido público de recuperação nunca revela se PM Civil está cadastrado', async()=>{
  const pool={query:async()=>({rows:[]})};
  const limits={isRateLimited:async()=>false,recordFailure:async()=>{}};
  const valid=await requestPasswordReset(pool,{username:'pm-civil.inexistente'},limits);
  const invalid=await requestPasswordReset(pool,{username:'estranho'},limits);
  assert.deepEqual(valid,invalid);
  assert.ok(!JSON.stringify(valid).includes('pm-civil.inexistente'));
});
test('a API possui rotas públicas de recuperação e exige sessão na aprovação',()=>{
  const src=readFileSync(new URL('../app/api/[[...path]]/route.js',import.meta.url),'utf8');
  assert.match(src,/route==='\/auth\/password\/reset\/request'/);
  assert.match(src,/route==='\/auth\/password\/setup'/);
  assert.match(src,/route==='\/management\/access\/resets'/);
  const managerRoute=src.indexOf("route==='/management/access/resets'");
  const sessionGate=src.indexOf('const u=await identity()');
  assert.ok(managerRoute>sessionGate);
});
test('carregamento inicial mostra progresso em vez de falsos zeros',()=>{
  const src=readFileSync(new URL('../app/page.jsx',import.meta.url),'utf8');
  assert.match(src,/setEntriesReady\(true\)/);
  assert.match(src,/setRulesReady\(true\)/);
  assert.match(src,/catalog-sync-banner/);
  assert.match(src,/catalog-skeleton-row/);
});
