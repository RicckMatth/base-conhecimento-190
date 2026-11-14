import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../public/copom-sade-190.html',import.meta.url),'utf8');
const source=html.match(/<script>\s*([\s\S]*?)<\/script>\s*<\/body>/i)?.[1];
assert.ok(source,'O motor completo deve constar no HTML incorporado.');
const document={getElementById:()=>({textContent:'',classList:{add(){},remove(){}}})};
const context=vm.createContext({document,window:{addEventListener(){}},console});
new vm.Script(source,{filename:'copom-sade-190.html'}).runInContext(context,{timeout:3000});
const evaluate=expression=>vm.runInContext(expression,context,{timeout:3000});
const analyze=text=>evaluate('({ctx:extrairContexto('+JSON.stringify(text)+'),result:classificarOcorrenciaSADE('+JSON.stringify(text)+',extrairContexto('+JSON.stringify(text)+'))})');

test('HTML mantém interface, catálogo completo e lógica local sem CDN externo',()=>{
 assert.doesNotMatch(html,/<script\s+src=/i);
 assert.doesNotMatch(html,/cdn\.tailwindcss\.com|fonts\.googleapis\.com/i);
 for(const id of ['reportInput','catalogModal','cadModal','editRoleModal'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/Apoio orientativo/);
 assert.match(html,/base190:sade-report/);
 assert.equal(evaluate('NATUREZAS_SADE.length'),769);
 assert.equal(evaluate('new Set(NATUREZAS_SADE.map(x=>x[0])).size'),769);
 assert.equal(evaluate('PRESET_SCENARIOS.length'),6);
});

test('atores e facão são reconhecidos sem confundir vítima e autor',()=>{
 const text='solicitante relata que seu pai sofreu ameaças do amigo, pede viatura no local pois o individuo está em frente a residencia armado com um facão tentando entrar na residencia';
 const {ctx,result}=analyze(text);
 assert.equal(ctx.vitimaActor.id,'pai');
 assert.equal(ctx.autorActor.id,'amigo');
 assert.equal(ctx.armaTipo,'ARMA_BRANCA');
 assert.equal(ctx.solicitanteTipo,'TERCEIRO_FAMILIAR');
 assert.ok(result.candidatas.some(x=>x.id===5));
 assert.ok(result.candidatas.some(x=>x.id===12));
 assert.ok(evaluate('gerarPerguntasProgramadas('+result.candidatas[0].id+',extrairContexto('+JSON.stringify(text)+')).length')>=5);
});

test('roubo com arma de fogo e motocicleta não vira acidente viário',()=>{
 const {ctx,result}=analyze('Solicitante relata que estava andando na rua quando dois indivíduos em uma moto apontaram uma arma de fogo, mandaram passar o celular e a bolsa e fugiram sentido centro.');
 assert.equal(ctx.armaTipo,'ARMA_FOGO');
 assert.equal(ctx.autorActor.num,'p');
 assert.equal(result.candidatas[0].id,37);
});

test('perturbação sonora mantém sua natureza SADE',()=>{
 const {ctx,result}=analyze('Morador informa que o vizinho ligou o som automotivo no último volume desde a madrugada com gritaria e algazarra, impedindo a vizinhança de dormir.');
 assert.equal(ctx.armaTipo,'NENHUMA');
 assert.equal(result.candidatas[0].id,2);
});

test('botão Enviar impede navegação, limpa campo e entrega o relato ao motor',()=>{
 const reportField={value:'  solicitante relata ameaça com facão  '};
 context.document.getElementById=id=>id==='reportInput'?reportField:{textContent:'',classList:{add(){},remove(){}}};
 const result=evaluate("(() => { let prevented=false; processarRelato = text => {globalThis.__submittedReport = text;}; handleSubmit({preventDefault(){prevented=true;}}); return {prevented,submitted:globalThis.__submittedReport,field:document.getElementById('reportInput').value}; })()");
 assert.equal(result.prevented,true);
 assert.equal(result.submitted,'solicitante relata ameaça com facão');
 assert.equal(result.field,'');
 assert.match(html,/<form onsubmit="handleSubmit\(event\)"/);
});
