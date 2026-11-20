import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {actorRole,canManageAccess,canAssignRole,canManageAccount,listAccess,createAccount,decideRequest,updateAccount} from '../lib/access-management.js';

const dev={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',username:'primary',role:'admin',operational_role:'dev',must_change_password:false};
const coordinator={id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',username:'coord',role:'user',operational_role:'coordinator',must_change_password:false};
const manager={id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',username:'gestor',role:'user',operational_role:'manager',must_change_password:false};
const attendant={id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',username:'atendente',role:'user',operational_role:'attendant',must_change_password:false};
const fakePool={query(){throw Error('Forbidden query reached.');},connect(){throw Error('Forbidden connection reached.');}};

test('only authenticated Dev and Coordinator may manage access',()=>{
  assert.equal(actorRole(coordinator),'coordinator');
  assert.equal(canManageAccess(dev),true);
  assert.equal(canManageAccess(coordinator),true);
  assert.equal(canManageAccess({...dev,must_change_password:true}),false);
  assert.equal(canManageAccess({...dev,operational_role:'attendant'}),false);
  assert.equal(canManageAccess({...coordinator,operational_role:'manager'}),false);
  assert.equal(canManageAccess({...attendant,role:'admin'}),false);
  assert.equal(canManageAccess(null),false);
});
test('coordinator cannot promote to their own role or reserved Dev',()=>{
  assert.equal(canAssignRole(coordinator,'attendant'),true);
  assert.equal(canAssignRole(coordinator,'manager'),true);
  assert.equal(canAssignRole(coordinator,'quality_analyst'),true);
  assert.equal(canAssignRole(coordinator,'coordinator'),false);
  assert.equal(canAssignRole(coordinator,'dev'),false);
  assert.equal(canAssignRole(dev,'coordinator'),true);
  assert.equal(canAssignRole(dev,'dev'),false);
});
test('protected accounts and equal-ranking coordinators cannot be changed',()=>{
  assert.equal(canManageAccount(coordinator,manager),true);
  assert.equal(canManageAccount(coordinator,attendant),true);
  assert.equal(canManageAccount(coordinator,{...manager,operational_role:'quality_analyst'}),true);
  assert.equal(canManageAccount(coordinator,coordinator),false);
  assert.equal(canManageAccount(coordinator,{...manager,operational_role:'coordinator'}),false);
  assert.equal(canManageAccount(dev,coordinator),true);
  assert.equal(canManageAccount(dev,dev),false);
  assert.equal(canManageAccount(dev,{...attendant,role:'admin'}),false);
  assert.equal(canManageAccount(dev,{...attendant,operational_role:'dev'}),false);
  assert.equal(canManageAccount(dev,{...attendant,username:'pm-civil.bandeira'}),false);
});
test('forbidden server calls are denied before any database access',async()=>{
  const unauthorized={...attendant,role:'admin'};
  for(const action of [
    ()=>listAccess(fakePool,unauthorized),
    ()=>createAccount(fakePool,unauthorized,{name:'Pessoa Teste',username:'pessoa.teste',role:'dev'}),
    ()=>decideRequest(fakePool,unauthorized,{id:attendant.id,action:'approve'}),
    ()=>updateAccount(fakePool,unauthorized,{id:attendant.id,action:'status',active:false})
  ])await assert.rejects(action(),error=>error.status===403);
});
test('frontend no longer trusts a local switchable operational role',()=>{
  const page=readFileSync(new URL('../app/page.jsx',import.meta.url),'utf8');
  const html=readFileSync(new URL('../public/copom-190-gestao-operacional.html',import.meta.url),'utf8');
  assert.match(page,/user\?\.operationalRole/);
  assert.match(page,/const canPreviewRoles=user\?\.role==='admin'&&user\?\.operationalRole==='dev'/);
  assert.match(page,/function switchProfile\(targetId\)/);
  assert.match(page,/if\(!canPreviewRoles\)return/);
  assert.match(page,/['"]access['"],['"]Acessos e Cargos['"]/);
  assert.match(html,/fetch\('\/api\/session'/);
  assert.match(html,/rolePreviewAllowed = account\.operationalRole === 'dev' && account\.role === 'admin'/);
  assert.match(html,/state\.userRole = rolePreviewAllowed/);
  assert.match(html,/roleMap\[account\.operationalRole\]/);
});
