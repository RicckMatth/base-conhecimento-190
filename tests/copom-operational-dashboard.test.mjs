import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const managementPath = new URL('../public/copom-190-gestao-operacional.html', import.meta.url);
const pagePath = new URL('../app/page.jsx', import.meta.url);
const html = readFileSync(managementPath, 'utf8');
const page = readFileSync(pagePath, 'utf8');

test('COPOM 190 operational dashboard retains all five functional sections', () => {
  assert.match(html, /<!DOCTYPE html>/i);
  assert.match(html, /<\/body>\s*<\/html>\s*$/i);
  for (const id of ['overview', 'breaks', 'schedule', 'groups', 'history']) {
    assert.ok(html.includes(`id="tab-${id}"`), `Missing dashboard section: ${id}`);
  }
  assert.match(html, /localStorage\.setItem\(STORAGE_KEY/);
});

test('COPOM operational dashboard script parses as JavaScript', () => {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length >= 1, 'Expected inline application logic');
  assert.doesNotThrow(() => new Script(scripts.at(-1)[1], { filename: 'copom-190-gestao-operacional.html' }));
});

test('COPOM operational dashboard is included in every authorized profile navigation', () => {
  const profiles = [...page.matchAll(/centralTabs:\[([^\]]+)\]/g)];
  assert.equal(profiles.length, 5);
  assert.ok(profiles.every(([, value]) => value.includes("'operations'")));
  assert.match(page, /\['operations','Pausas e Folgas','calendar'\]/);
  assert.match(page, /screen==='operations'/);
  assert.match(page, /src="\/copom-190-gestao-operacional\.html"/);
});


test('Operational iframe is allowed only same-origin, unlike other protected routes',async()=>{
  const {default:config}=await import('../next.config.mjs');
  const patterns=await config.headers();
  const common=patterns.find(x=>x.source==='/:path*');
  const panel=patterns.find(x=>x.source==='/copom-190-gestao-operacional.html');
  assert.ok(common&&panel,'Expected strict default headers and panel exception');
  const value=(item,key)=>item.headers.find(x=>x.key===key)?.value;
  assert.equal(value(common,'X-Frame-Options'),'DENY');
  assert.equal(value(panel,'X-Frame-Options'),'SAMEORIGIN');
  assert.match(value(panel,'Content-Security-Policy'),/frame-ancestors 'self'/);
  assert.match(value(panel,'Content-Security-Policy'),/connect-src 'self'/);
});
test('No demonstration users or fabricated initial schedule in operational panel',()=>{
  assert.doesNotMatch(html,/seedDefaultData\s*\(/);
  for(const fake of ['Lucas Ferreira','Mariana Costa','Rafael Oliveira','Bruno Almeida','Fernanda Souza','ag_12','de 12 atendentes']){
    assert.ok(!html.includes(fake),'Unremoved example: '+fake);
  }
  assert.match(html,/fetch\('\/api\/floor\/schedules\?month='/);
  assert.match(html,/data\.users\.filter\(u=>u\?\.operational_role==='attendant'/);
  assert.match(html,/filter\(\(\[id\]\)=>ids\.has\(id\)\)/);
  assert.match(page,/src="\/copom-190-gestao-operacional\.html" loading="eager"/);
});
