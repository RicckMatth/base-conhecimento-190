import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('o layout Nexus só oculta a navegação principal enquanto a aba Docs está visível',()=>{
 const css=readFileSync(new URL('../app/nexus-documentation.css',import.meta.url),'utf8');
 const app=readFileSync(new URL('../app/page.jsx',import.meta.url),'utf8');
 assert.match(app,/hidden=\{screen!=='docs'\}/);
 assert.match(css,/\.shell:has\(\.content > div:not\(\[hidden\]\) > \.nexus-docs\)>\.sidebar/);
 assert.doesNotMatch(css,/:has\(\.nexus-docs\)/);
 assert.match(app,/onExit=\{\(\)=>go\('home'\)\}/);
});

test('o controle de reabrir a biblioteca é exibido no desktop e no celular mesmo com a barra recolhida',()=>{
 const css=readFileSync(new URL('../app/nexus-documentation.css',import.meta.url),'utf8');
 const jsx=readFileSync(new URL('../app/nexus-documentation.jsx',import.meta.url),'utf8');
 assert.match(jsx,/className="nx-icon-button nx-expand"/);
 assert.match(jsx,/\{!sideOpen&&<button type="button" className="nx-icon-button nx-expand"/);
 assert.match(jsx,/aria-label="Mostrar barra lateral da biblioteca"/);
 assert.match(jsx,/aria-controls="nx-documentation-sidebar"/);
 assert.match(jsx,/aria-expanded=\{false\}/);
 assert.match(jsx,/onClick=\{\(\)=>setSideOpen\(true\)\}/);
 assert.match(jsx,/aria-hidden=\{!sideOpen\} inert=\{!sideOpen\}/);
 assert.match(jsx,/aria-label="Ocultar barra lateral da biblioteca"/);
 assert.match(jsx,/className="nx-sidebar" id="nx-documentation-sidebar"/);
 assert.match(css,/\.nx-expand\{display:grid;/);
 assert.doesNotMatch(css,/\.nx-expand\{display:none/);
 assert.match(css,/\.nx-collapsed \.nx-expand\{/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/\.nx-sidebar\{width:0;flex-basis:0;opacity:0;/);
});

test('o Nexus usa apenas o botão da barra quando ela está aberta, exibindo reabertura apenas quando fechada',()=>{
 const jsx=readFileSync(new URL('../app/nexus-documentation.jsx',import.meta.url),'utf8');
 assert.match(jsx,/\{!sideOpen&&<button type="button" className="nx-icon-button nx-expand"/);
 assert.match(jsx,/onClick=\{\(\)=>setSideOpen\(false\)\}/);
 assert.equal((jsx.match(/className="nx-icon-button nx-expand"/g)||[]).length,1);
 assert.equal((jsx.match(/aria-label="Ocultar barra lateral da biblioteca"/g)||[]).length,1);
});
