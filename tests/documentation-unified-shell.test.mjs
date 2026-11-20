import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page=readFileSync(new URL('../app/page.jsx',import.meta.url),'utf8');
const docs=readFileSync(new URL('../app/documentation.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
const integrated=css.slice(css.indexOf('BASE 190 · BIBLIOTECA INTEGRADA AO SHELL'));

test('Base de conhecimento usa o mesmo shell, header e a barra global de expandir/recolher',()=>{
  assert.match(page,/className="topbar base190-unified-header"/);
  assert.match(page,/className="sidebar compact"/);
  assert.match(page,/className="sidebar-toggle"/);
  assert.match(page,/\{docsOpened&&<div key="docs" hidden=\{screen!=='docs'\} className="tab-view-container">/);
  assert.match(page,/data-current-tab=\{screen\}/);
  assert.match(docs,/docs-workspace library-wide docs-integrated/);
  assert.match(integrated,/\.shell \.docs-workspace\.library-wide\.docs-integrated\{\s*position:relative;\s*inset:auto;\s*z-index:1;/);
  assert.match(integrated,/\.shell>\.main>\.content\[data-current-tab="docs"\]/);
});

test('Índice da biblioteca é um painel secundário acessível que não cobre a barra lateral global',()=>{
  assert.match(docs,/const \[indexOpen,setIndexOpen\]=useState\(false\)/);
  assert.match(docs,/className="library-index-toggle"/);
  assert.match(docs,/aria-controls="docs-index"/);
  assert.match(docs,/className="library-index-backdrop"/);
  assert.match(docs,/id="docs-index" className="docs-sidebar"/);
  assert.match(docs,/className="docs-index-close"/);
  assert.match(docs,/setIndexOpen\(false\)/);
  assert.match(integrated,/\.shell \.docs-workspace\.docs-integrated>\.docs-sidebar\{\s*display:none;/);
  assert.match(integrated,/\.shell \.docs-workspace\.docs-integrated\.index-open>\.docs-sidebar\{\s*display:block;/);
  assert.match(integrated,/@media\(max-width:600px\)/);
  assert.doesNotMatch(docs,/requestFullscreen\(\)/);
});

test('Biblioteca acompanha os tokens de tema claro/escuro, incluindo capas, categorias e editor',()=>{
  assert.match(css,/:root\{--bg:#f2f5f8;--panel:#fff;/);
  assert.match(css,/:root\[data-theme="dark"\]\{--bg:#09141e;--panel:#101f2c;/);
  assert.match(integrated,/\.docs-integrated \.library-cover\{\s*background:linear-gradient\(115deg,var\(--panel\),var\(--soft\)\)/);
  assert.match(integrated,/\.docs-integrated \.area-summary\{\s*background:var\(--soft\);/);
  assert.match(integrated,/\.docs-integrated \.docs-paper\{[\s\S]*?border-top:3px solid var\(--blue\)/);
  assert.match(integrated,/\.docs-integrated \.docs-toolbar\{\s*position:sticky;/);
  assert.match(docs,/useEditor\(/);
  assert.match(docs,/onClick=\{\(\)=>save\('published'\)\}/);
});
