import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const html=readFileSync(new URL('../public/copom-190-gestao-operacional.html',import.meta.url),'utf8');
const hostCss=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
const bootstrapMatch=html.match(/<script id="base190-theme-bootstrap">([\s\S]*?)<\/script>/);
assert.ok(bootstrapMatch,'Missing early iframe theme bootstrap');

function simulateFirstPaint(mode){
  const host={dataset:{theme:mode}};
  const css={
    '--bg':mode==='dark'?'#09141e':'#f2f5f8',
    '--panel':mode==='dark'?'#101f2c':'#fff',
    '--ink':mode==='dark'?'#e3edf3':'#142c40',
    '--muted':mode==='dark'?'#9db0bd':'#5e7181',
    '--line':mode==='dark'?'#263a48':'#dce5eb',
    '--blue':mode==='dark'?'#69d0e0':'#086b83',
    '--soft':mode==='dark'?'#173544':'#eaf5f7',
    '--nav':mode==='dark'?'#07121c':'#0a1d2b',
    '--shadow':mode==='dark'?'0 12px 32px #0003':'0 8px 28px #18334408'
  };
  const assigned={},classes=new Set();
  const root={
    classList:{add(value){classes.add(value);},toggle(value,on){if(on)classes.add(value);else classes.delete(value);}},
    style:{setProperty(name,value){assigned[name]=value;},colorScheme:''}
  };
  const parent={location:{origin:'https://base190.test'},document:{documentElement:host},
    getComputedStyle(){return{getPropertyValue(name){return css[name]||'';}}}};
  const window={self:{},top:{},parent,location:{origin:'https://base190.test'}};
  new Script(bootstrapMatch[1]).runInNewContext({window,document:{documentElement:root},console});
  return {classes,assigned,root,css};
}

test('Theme is resolved in document head, before user can see the embedded panel',()=>{
  assert.ok(html.indexOf('id="base190-theme-bootstrap"')<html.indexOf('<body'));
  assert.match(hostCss,/:root\{--bg:#f2f5f8;.*--blue:#086b83;/);
  assert.match(hostCss,/:root\[data-theme="dark"\]\{--bg:#09141e;.*--blue:#69d0e0;/);
  assert.doesNotMatch(html,/#2662D9|rgb\(10 132 255/);
});
test('Light mode uses the host accent immediately, without blue-to-teal transition',()=>{
  const {classes,assigned,root}=simulateFirstPaint('light');
  assert.equal(classes.has('base190-inside-shell'),true);
  assert.equal(classes.has('dark'),false);
  assert.equal(root.style.colorScheme,'light');
  assert.equal(assigned['--ops-blue'],'#086b83');
  assert.equal(assigned['--ops-bg'],'#f2f5f8');
  assert.equal(assigned['--ops-panel'],'#fff');
});
test('Dark mode inherits the correct light-cyan host accent before first paint',()=>{
  const {classes,assigned,root}=simulateFirstPaint('dark');
  assert.equal(classes.has('dark'),true);
  assert.equal(root.style.colorScheme,'dark');
  assert.equal(assigned['--ops-blue'],'#69d0e0');
  assert.equal(assigned['--ops-bg'],'#09141e');
  assert.equal(assigned['--ops-panel'],'#101f2c');
});
