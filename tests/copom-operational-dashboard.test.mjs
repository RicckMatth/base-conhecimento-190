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
  assert.ok(scripts.length >= 2, 'Expected inline application logic');
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
