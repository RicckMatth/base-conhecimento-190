import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {transform} from 'next/dist/build/swc/index.js';
import {REVIEW_NOTICE} from '../lib/narrative-review.js';

test('renderiza alerta, perguntas, falha recuperável e escapa texto do relato',async()=>{
 const source=readFileSync(new URL('../app/narrative-assessment.jsx',import.meta.url),'utf8');
 const {code}=await transform(source,{filename:'narrative-assessment.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
 const module={exports:{}};
 new Function('module','exports','require',code)(module,module.exports,createRequire(import.meta.url));
 const Component=module.exports.default;
 const html=renderToStaticMarkup(createElement(Component,{result:{assessment:{status:'informacao_insuficiente',notice:REVIEW_NOTICE,excerpts:['<script>alert(1)</script>']},clarificationQuestions:[{topic:'womanAssault',question:'Houve agressão contra a mulher?'}],aiReview:{state:'unavailable',message:'Tempo excedido.'}}}));
 assert.match(html,/narrative-assessment-critical/);assert.match(html,/INFORMAÇÕES INSUFICIENTES/);assert.match(html,/Houve agressão contra a mulher/);assert.match(html,/Tempo excedido/);assert.match(html,/aria-live="polite"/);assert.ok(!html.includes('<script>'));assert.match(html,/&lt;script&gt;/);
 const noEvidence=renderToStaticMarkup(createElement(Component,{result:{assessment:{status:'sem_indicios_relatados',notice:REVIEW_NOTICE}}}));
 assert.match(noEvidence,/CONTEÚDO INFORMADO/);assert.match(noEvidence,/Não encerre nem recuse/);
});
