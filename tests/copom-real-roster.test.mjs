import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../public/copom-190-gestao-operacional.html',import.meta.url),'utf8');
const source=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].at(-1)?.[1];
const realId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const managerId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function harness(){
  const banner={textContent:''};
  const saved=new Map();
  const context=vm.createContext({
    document:{title:'Gestão Operacional',addEventListener(){},getElementById(){return banner;}},
    localStorage:{setItem(k,v){saved.set(k,v);},getItem(k){return saved.get(k)||null;}},
    console
  });
  new vm.Script(source).runInContext(context);
  return {context,banner,saved,run:(expression)=>vm.runInContext(expression,context)};
}

test('Roster is sourced from authenticated Base 190 users, not the 12 demo agents',()=>{
  const h=harness();
  h.run("state.agents=[{id:'ag_1',name:'DEMO'}];state.groups=[{id:'grp_a',name:'Turno DEMO'}];");
  h.run("state.breaks={'2026-11-20':{ag_1:[{start:'08:00'}]}};state.daysOff={'2026-11-20':{ag_1:true}};state.history=[{description:'Demo'}];");
  const payload={
    users:[
      {id:realId,username:'ana.real',display_name:'Ana Real',operational_role:'attendant'},
      {id:managerId,username:'gestor.real',display_name:'Gestor Real',operational_role:'manager'}
    ],
    profiles:[{user_id:realId,start_time:'18:00',end_time:'00:20'}],
    entries:[]
  };
  h.run('syncOfficialRoster('+JSON.stringify(payload)+','+JSON.stringify({id:realId,operationalRole:'attendant',role:'user'})+')');
  const state=JSON.parse(h.run('JSON.stringify({agents:state.agents,groups:state.groups,breaks:state.breaks,daysOff:state.daysOff,history:state.history,loggedAgentId:state.loggedAgentId})'));
  assert.deepEqual(state.agents.map(a=>a.id),[realId]);
  assert.equal(state.agents[0].name,'Ana Real');
  assert.equal(state.agents[0].rank,'');
  assert.equal(state.agents[0].pa,'Não cadastrada');
  assert.equal(state.groups[0].start,'18:00');
  assert.equal(state.groups[0].end,'00:20');
  assert.equal(state.daysOff['2026-11-20'],undefined);
  assert.equal(state.breaks['2026-11-20'],undefined);
  assert.deepEqual(state.history,[]);
  assert.equal(state.loggedAgentId,realId);
  assert.match(h.banner.textContent,/1 atendente\(s\) ativo\(s\)/);
});
test('A real user without a configured schedule is displayed without fabricated shift or breaks',()=>{
  const h=harness();
  const payload={users:[{id:realId,display_name:'Pessoa Real',username:'pessoa.real',operational_role:'attendant'}],profiles:[],entries:[]};
  h.run('syncOfficialRoster('+JSON.stringify(payload)+','+JSON.stringify({id:realId,operationalRole:'attendant'})+')');
  const state=JSON.parse(h.run('JSON.stringify({groups:state.groups,agents:state.agents,breaks:state.breaks,daysOff:state.daysOff})'));
  assert.equal(state.agents.length,1);
  assert.equal(state.agents[0].groupId,null);
  assert.deepEqual(state.groups,[]);
  assert.deepEqual(state.breaks,{});
  assert.deepEqual(state.daysOff,{});
});
test('Official schedule entries are imported only for registered attendants',()=>{
  const h=harness();
  const payload={
    users:[{id:realId,display_name:'Pessoa Real',operational_role:'attendant'}],
    profiles:[{user_id:realId,start_time:'08:00',end_time:'14:20'}],
    entries:[
      {user_id:realId,day:'2026-11-20',is_off:false,break_1:'09:00',break_2:'11:00',break_3:'13:00'},
      {user_id:managerId,day:'2026-11-20',is_off:true}
    ]
  };
  h.run('syncOfficialRoster('+JSON.stringify(payload)+','+JSON.stringify({id:realId,operationalRole:'attendant'})+')');
  const data=JSON.parse(h.run("JSON.stringify({breaks:state.breaks['2026-11-20'],daysOff:state.daysOff})"));
  assert.deepEqual(data.breaks[realId].map(x=>x.start),['09:00','11:00','13:00']);
  assert.equal(data.breaks[managerId],undefined);
  assert.deepEqual(data.daysOff,{});
});
