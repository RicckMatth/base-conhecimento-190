import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire,Module} from 'node:module';
import {fileURLToPath} from 'node:url';
import {JSDOM} from 'jsdom';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {analyzeOfflineReport} from '../lib/offline-sade-triage.js';
import {COPOM_CATALOG} from '../lib/copom-catalog.js';
const require=createRequire(import.meta.url);
const {transformSync}=require('next/dist/build/swc');
function component(name){
 const filename=fileURLToPath(new URL('../app/'+name,import.meta.url));
 const module=new Module(filename);module.filename=filename;module.paths=Module._nodeModulePaths(fileURLToPath(new URL('../app',import.meta.url)));
 const native=module.require.bind(module);
 module.require=id=>{
  if(id==='next/dynamic')return ()=>()=>null;
  if(id==='./icons.jsx')return {Icon:()=>null,categoryIcon:()=>''};
  if(id==='./gemini-insights.jsx')return component('gemini-insights.jsx');
  if(id.endsWith('.jsx'))return ()=>null;
  return native(id);
 };
 module._compile(transformSync(readFileSync(filename,'utf8'),{filename,jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}}).code,filename);
 return module.exports;
}

test('chat montado ignora eventos da extensão e apresenta interface SADE isolada',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://base.example'}),saved=new Map();
 const install=(key,value)=>{saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});};
 for(const key of ['window','document','navigator','HTMLElement','Event','CustomEvent','localStorage'])install(key,dom.window[key]);
 install('IS_REACT_ACT_ENVIRONMENT',true);dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
 const calls=[],outbound=[];
 for(const name of ['base190:extension-discover','base190:site-analysis','base190:open-settings'])dom.window.addEventListener(name,()=>outbound.push(name));
 install('fetch',async(url,options={})=>{
  calls.push({url,options});let data={};
  if(url==='/api/session')data={user:{id:'test',role:'user',mustChangePassword:false}};
  if(url==='/api/entries')data={entries:COPOM_CATALOG};
  if(url==='/api/rules')data={base:[],extras:[],custom:[]};
  if(['/api/chat','/api/analyze'].includes(url))data={result:analyzeOfflineReport({...JSON.parse(options.body),entries:COPOM_CATALOG})};
  return {ok:true,json:async()=>data};
 });
 const root=createRoot(document.getElementById('root'));
 const click=async text=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent===text);assert.ok(b,text);await act(async()=>b.click());};
 try{
  const Home=component('page.jsx').default;
  await act(async()=>root.render(React.createElement(Home)));
  const before=calls.length;
  await act(async()=>{
   window.dispatchEvent(new CustomEvent('base190:extension-ready'));
   window.dispatchEvent(new CustomEvent('base190:extension-result',{detail:{version:1,result:{tipo:'classificacao',resposta:'INJEÇÃO EXTERNA'}}}));
   window.dispatchEvent(new CustomEvent('base190:extension-pending'));
  });
  assert.equal(calls.length,before);assert.ok(document.body.textContent.includes('Clareza para cada atendimento.'));
  assert.doesNotMatch(document.body.textContent,/INJEÇÃO EXTERNA|Extensão detectada|Baixar extensão|Integração 190/);
  await click('Chat 190');
  const iframe=document.querySelector('iframe.sade-embed-frame');
  assert.ok(iframe,'O Chat 190 deve montar a tela SADE completa.');
  assert.equal(iframe.getAttribute('src'),'/copom-sade-190.html');
  assert.equal(iframe.getAttribute('sandbox'),'allow-scripts allow-forms');
  assert.equal(iframe.hasAttribute('allow-same-origin'),false);
  assert.ok(!iframe.getAttribute('sandbox').includes('allow-same-origin'));
  assert.match(iframe.getAttribute('title'),/Assistente de Triagem Inteligente SADE/);
  assert.equal(calls.some(c=>c.url==='/api/chat'),false,'A navegação não deve disparar análise sem relato.');
  assert.deepEqual(outbound,[]);
 }finally{
  await act(async()=>root.unmount());dom.window.close();
  for(const [key,value] of saved){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}
 }
});

test('rotas do site preservam sessão e origem, sem endpoints ou canais exclusivos da extensão',()=>{
 const api=readFileSync(new URL('../app/api/[[...path]]/route.js',import.meta.url),'utf8');
 const page=readFileSync(new URL('../app/page.jsx',import.meta.url),'utf8');
 assert.doesNotMatch(page,/base190:(?:extension-|site-analysis|open-settings)|extensionOnline|190-extensao_integrada/);
 assert.doesNotMatch(api,/chrome-extension:|Access-Control-Allow-Origin|route==='\/(?:extension|bridge|relato190)/i);
 assert.ok(api.indexOf('const blocked=requireRole(u)')<api.indexOf("if((route==='/chat'"));
 assert.match(api,/method!=='GET'&&!sameOrigin\(request\)/);
});
