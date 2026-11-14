import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {COPOM_CATALOG} from '../lib/copom-catalog.js';

const page=await readFile(new URL('../app/page.jsx',import.meta.url),'utf8');

test('Chat 190 é a única aba pública de atendimento',()=>{
 assert.match(page,/\['chat','Chat 190','brain'\]/);
 assert.doesNotMatch(page,/\['brain','Cérebro 190','brain'\]/);
 assert.match(page,/if\(next==='brain'\)next='chat'/);
 assert.ok(page.includes('src="/copom-sade-190.html"'));
 assert.match(page,/sandbox="allow-scripts"/);
});

test('cada natureza do catálogo tem descrição de uso e perguntas essenciais',()=>{
 assert.equal(COPOM_CATALOG.length,769);
 for(const entry of COPOM_CATALOG){
  assert.match(entry.summary,/Quando usar:/,entry.code);
  assert.match(entry.summary,/Não usar automaticamente:/,entry.code);
  assert.equal(entry.triageQuestions.length,5,entry.code);
  assert.ok(entry.body.includes('Perguntas essenciais:'),entry.code);
 }
});
