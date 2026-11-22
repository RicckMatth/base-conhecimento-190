import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  NAVIGATION_TABS,NAVIGATION_LABELS,
  tabLabel,tabIcon,tabMotionTiming,tabDirection,safeNavigationTarget
} from '../lib/tab-navigation.js';

test('transição cobre todas as abas e rótulos de carregamento',()=>{
  for(const tab of ['home','docs','catalog','chat','floor','operations','quality','access',
    'announcements','editor','rules','audit','detail']){
    assert.ok(NAVIGATION_TABS.includes(tab),tab);
    assert.ok(NAVIGATION_LABELS[tab],tab);
    assert.notEqual(tabIcon(tab),'',tab);
  }
  assert.equal(tabLabel('quality'),'Qualidade');
  assert.equal(tabLabel('announcements'),'Estúdio de anúncios');
});
test('respeita ordem e direção inclusive ao voltar para uma aba anterior',()=>{
  assert.equal(tabDirection('home','quality'),'forward');
  assert.equal(tabDirection('quality','home'),'back');
  assert.equal(tabDirection('docs','catalog'),'forward');
  assert.equal(tabDirection('catalog','catalog'),'forward');
});
test('acesso a abas continua restrito a quem tem permissão',()=>{
  const allowed=['home','docs','catalog','chat'];
  assert.equal(safeNavigationTarget('brain',allowed),'chat');
  assert.equal(safeNavigationTarget('detail',allowed),'detail');
  assert.equal(safeNavigationTarget('announcements',allowed),'home');
  assert.equal(safeNavigationTarget('quality',allowed),'home');
  assert.equal(safeNavigationTarget('detail',['home','quality']),'home');
  assert.equal(safeNavigationTarget('rules',['quality','chat'],'chat'), 'usa aba de fallback disponível');
});
test('animações têm duração curta e são desativadas para movimento reduzido',()=>{
  assert.deepEqual(tabMotionTiming(true),{exit:0,enter:0,indicator:0});
  const timings=tabMotionTiming();
  assert.ok(timings.exit<=180);
  assert.ok(timings.enter<=400);
  assert.ok(timings.indicator>=150);
});
test('navegação protege dados não salvos e impede respostas atrasadas de sobrescrever navegação recente',()=>{
  const source=readFileSync(new URL('../app/page.jsx',import.meta.url),'utf8');
  assert.match(source,/base190:before-navigation/);
  assert.match(source,/navSequenceRef\.current/);
  assert.match(source,/if\(seq!==navSequenceRef\.current\)return/);
  assert.match(source,/if\(seq===navSequenceRef\.current\)setEvents/);
  assert.match(source,/if\(seq===navSequenceRef\.current\)setBrainRules/);
  assert.match(source,/if\(target==='docs'\)setDocsOpened\(true\)/);
  assert.match(source,/if\(target==='chat'\)setChatFrameLoading\(true\)/);
  assert.match(source,/preserveAnnouncement:true/);
  assert.match(source,/data-nav-phase=\{navigationPhase\}/);
  assert.match(source,/aria-busy=\{navigationPhase==='exit'\|\|tabLoading\}/);
});
test('transições não deslocam o shell e respeitam acessibilidade',()=>{
  const styles=readFileSync(new URL('../app/tab-transitions.css',import.meta.url),'utf8');
  const layout=readFileSync(new URL('../app/layout.jsx',import.meta.url),'utf8');
  assert.match(layout,/tab-transitions\.css/);
  assert.match(styles,/data-nav-phase="exit"/);
  assert.match(styles,/data-nav-phase="enter"/);
  assert.match(styles,/base190-navigation-hud/);
  assert.match(styles,/pointer-events:none/);
  assert.match(styles,/prefers-reduced-motion:reduce/);
  assert.doesNotMatch(styles,/\bdisplay\s*:\s*none\s*!important/);
});
