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
