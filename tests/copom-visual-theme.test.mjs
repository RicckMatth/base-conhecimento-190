import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const html=readFileSync(new URL('../public/copom-190-gestao-operacional.html',import.meta.url),'utf8');
const page=readFileSync(new URL('../app/page.jsx',import.meta.url),'utf8');

test('Operational dashboard shares Base 190 light and dark design tokens',()=>{
  assert.match(html,/id="base190-operations-visual-theme"/);
  for(const token of ['--ops-bg:#f4f6fb','--ops-panel:#ffffff','--ops-ink:#101b32','--ops-blue:#2662d9','--ops-soft:#edf3ff','--ops-bg:#0a1222','--ops-panel:#131f33','--ops-ink:#eef4ff','--ops-blue:#78a7ff','--ops-cyan:#55d6df']){
    assert.ok(html.includes(token),'Missing shared theme color '+token);
  }
  for(const outdated of ['#0A84FF','#090B10','#1D1D1F','#11141C','#FF453A']){
    assert.ok(!html.toUpperCase().includes(outdated),'Outdated palette value: '+outdated);
  }
});

test('Embedded dashboard respects parent theme and keeps standalone theme toggle',()=>{
  assert.match(html,/function inheritBaseTheme\(\)/);
  assert.match(html,/window\.parent\.location\.origin !== window\.location\.origin/);
  assert.match(html,/host\.dataset\.theme === 'dark'/);
  assert.match(html,/watcher\.observe\(host, \{attributes:true,attributeFilter:\['data-theme'\]\}\)/);
  assert.match(html,/base190-embedded #btnTheme\{display:none!important\}/);
  assert.match(html,/if \(!inheritBaseTheme\(\)\) document\.documentElement\.classList\.toggle/);
  const inlineScripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  assert.ok(inlineScripts.length>=1);
  assert.doesNotThrow(()=>new Script(inlineScripts.at(-1)[1]));
});

test('Parent operations tab uses Base 190 palette rather than undefined surface and old dark hardcode',()=>{
  const block=page.match(/\{screen==='operations'&&<section[\s\S]*?<\/section>\}/)?.[0];
  assert.ok(block,'Missing parent operations section');
  assert.match(block,/className="tab-view-container base190-operations-embed"/);
  assert.match(block,/className="base190-operations-frame"/);
  const css=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
  assert.match(css,/\.shell \.base190-operations-frame\{/);
  assert.match(css,/background:var\(--panel\)/);
  assert.doesNotMatch(block,/var\(--surface\)|#090B10/);
});
