import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeNexusMeta,renderNexusContent} from '../lib/nexus-docs.js';

test('nexus: blocos conhecidos preservam conteúdo, abas e checklist',()=>{
 const input={icon:'📘',coverIndex:4,favorite:true,subtitle:'Guia de triagem',blocks:[
  {id:'a',type:'tabs',activeTabIndex:1,tabs:[{id:'first',title:'Fatos',content:'<p>Relato fictício</p>'},{id:'second',title:'Perguntas',content:'<p>Há vítimas?</p>'}]},
  {id:'b',type:'checklist',items:[{id:'c',text:'Confirmar localização',done:true}]}
 ]};
 const meta=normalizeNexusMeta(input);
 assert.equal(meta.blocks[0].activeTabIndex,1);
 assert.equal(meta.blocks[1].items[0].done,true);
 assert.equal(meta.favorite,true);
 const html=renderNexusContent(meta);
 assert.match(html,/Relato fictício/);
 assert.match(html,/Confirmar localização/);
});
test('nexus: HTML perigoso não sobrevive à normalização',()=>{
 const meta=normalizeNexusMeta({icon:'<script>',coverIndex:999,blocks:[
  {type:'rich',content:'<p>Conteúdo permitido</p><script>alert(1)</script><img src="https://example.test/tracker.png" onerror="alert(1)">'},
  {type:'code',code:'<img src=x onerror=alert(1)>'},
  {type:'table',headers:['Campo'],rows:[['<script>teste</script>']]}
 ]});
 assert.equal(meta.icon,'📘');
 assert.equal(meta.coverIndex,5);
 assert.ok(!meta.blocks[0].content.includes('<script'));
 assert.ok(!meta.blocks[0].content.includes('onerror'));
 const content=renderNexusContent(meta);
 assert.ok(!content.includes('<script>'));
 assert.ok(!content.includes('<img src=x'));
 assert.match(content,/&lt;img/);
});
test('nexus: metadados inválidos e tipos desconhecidos não quebram a biblioteca',()=>{
 const meta=normalizeNexusMeta({blocks:[{id:'x',type:'desconhecido',content:'Olá'},null]});
 assert.equal(meta.blocks.length,2);
 assert.equal(meta.blocks[0].type,'paragraph');
 assert.doesNotThrow(()=>renderNexusContent(meta));
});
