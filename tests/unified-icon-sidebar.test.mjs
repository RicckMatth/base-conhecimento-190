import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page=readFileSync(new URL('../app/page.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
const rail=css.slice(css.indexOf('BASE 190 · ICON RAIL EM TODAS AS ABAS'));

test('A mesma barra compacta de ícones aparece em todas as abas',()=>{
  assert.match(page,/<aside id="base190-sidebar" className="sidebar compact" aria-label="Navegação principal"/);
  assert.match(page,/data-expanded=\{sidebarExpanded\?'true':'false'\}/);
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


test('Expansão manual permanece disponível em qualquer aba e no celular',()=>{
  assert.match(page,/const \[sidebarExpanded,setSidebarExpanded\]=useState\(false\)/);
  assert.match(page,/function toggleSidebar\(\)/);
  assert.match(page,/localStorage\.setItem\('base190_sidebar_expanded_'\+user\.id/);
  assert.match(page,/aria-label=\{sidebarExpanded\?'Recolher barra lateral':'Expandir barra lateral'\}/);
  assert.match(page,/aria-expanded=\{sidebarExpanded\}/);
  assert.match(page,/className="sidebar-overlay" onClick=\{toggleSidebar\}/);
  assert.match(rail,/\.shell\.sidebar-expanded\{\s*--base-sidebar-width:238px/);
  assert.match(rail,/\.shell\.sidebar-expanded>\.sidebar\.compact \.nav-label\{\s*display:inline!important/);
  assert.match(rail,/@media\(max-width:650px\)\{[\s\S]*\.shell\.sidebar-expanded \.sidebar-overlay/);
});

test('Cabeçalho integrado mantém o ícone e o contexto da aba em todas as telas',()=>{
  assert.match(page,/const headerIconName=/);
  assert.match(page,/className="topbar base190-unified-header"/);
  assert.match(page,/className="base190-header-symbol"/);
  assert.match(page,/name=\{headerIconName\}/);
  assert.match(rail,/\.shell>\.main>\.content :is\(\.fc-hero,\.ac-hero,\.rs-hero\)/);
  assert.match(rail,/\.shell>\.main>\.content \.qm-section-header/);
});