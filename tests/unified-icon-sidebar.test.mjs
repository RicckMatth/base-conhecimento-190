import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page=readFileSync(new URL('../app/page.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
const rail=css.slice(css.indexOf('BASE 190 · ICON RAIL EM TODAS AS ABAS'));

test('A mesma barra compacta de ícones aparece em todas as abas',()=>{
  assert.match(page,/<aside className="sidebar compact" aria-label="Navegação principal — ícones">/);
  assert.doesNotMatch(page,/<aside className=\{.*isImmersiveScreen/);
  for(const screen of ['home','docs','catalog','chat','floor','operations','quality','access']){
    assert.ok(page.includes("['"+screen+"',"),'Aba ausente: '+screen);
  }
  assert.match(rail,/--base-sidebar-width:68px/);
  assert.match(rail,/grid-template-columns:var\(--base-sidebar-width\) minmax\(0,1fr\)/);
  assert.match(rail,/\.shell>\.sidebar\.compact \.nav-label\{display:none!important\}/);
  assert.match(rail,/\.shell>\.sidebar\.compact \.sidebar-profile-box/);
  assert.match(rail,/\.shell>\.sidebar\.compact \.sidebar-bottom/);
});

test('Navegação por ícones mantém descrições acessíveis e troca de perfil',()=>{
  assert.match(page,/onClick=\{\(\)=>go\(id\)\} aria-label=\{label\}/);
  assert.match(page,/className="nav-btn profile-switch-btn"/);
  assert.match(page,/onClick=\{\(\)=>setProfileModalOpen\(true\)\}/);
  assert.match(page,/aria-label="Encerrar sessão"/);
  assert.match(page,/className="nav-btn theme-toggle-btn"/);
});

test('No celular a barra também permanece lateral e as abas usam toda a largura restante',()=>{
  assert.match(rail,/@media\(max-width:650px\)/);
  assert.match(rail,/--base-sidebar-width:56px/);
  assert.match(rail,/grid-template-rows:minmax\(0,1fr\)/);
  assert.match(rail,/overflow-y:auto/);
  assert.match(rail,/\.shell>\.main\{height:100%;min-height:0\}/);
});
