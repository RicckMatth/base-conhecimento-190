import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const api=readFileSync(new URL('../app/api/[[...path]]/route.js',import.meta.url),'utf8');
const page=readFileSync(new URL('../app/page.jsx',import.meta.url),'utf8');
const inspector=readFileSync(new URL('../app/gemini-insights.jsx',import.meta.url),'utf8');

test('analyze e chat operam exclusivamente offline, sem API Gemini de geração',()=>{
 assert.match(api,/if\(\(route==='\/chat'\|\|route==='\/analyze'\)\&\&method==='POST'\)/);
 assert.match(api,/answerOffline\(\{text:relato,entries\}\)/);
 assert.match(api,/resolveChatIntent\(relato,v\.history\)/);
 assert.match(api,/analyzeOfflineReport\(\{text:intent\.text,entries\}\)/);
 assert.doesNotMatch(api,/askGemini\s*\(/);
 assert.doesNotMatch(api,/GEMINI_API_KEY.*\/chat/);
});
test('Gemini somente para revisão textual solicitada pelo usuário; teste administrativo não gera resposta',()=>{
 assert.match(api,/if\(route==='\/rewrite'\&\&method==='POST'\)/);
 assert.equal((api.match(/rewriteWithGemini\(/g)||[]).length,1);
 const section=api.slice(api.indexOf("if(route==='/admin/ai/test'"),api.indexOf("if((route==='/chat'"));
 assert.match(section,/aiStatus\(\)\.configured/);
 assert.doesNotMatch(section,/generateText\(|askGemini\(|rewriteWithGemini\(/);
});
test('UI da triagem local inclui cinco perguntas, relatório, e revisão opt-in sem envio automático',()=>{
 assert.match(page,/result\.tipo==='local-triage'/);
 assert.match(page,/WritingReview original=\{result\.originalReport\}/);
 assert.match(inspector,/roleAnalysis/);
 assert.match(inspector,/natureSuggestions/);
 assert.match(inspector,/analysisQuestions/);
 assert.match(inspector,/Sem IA/);
 assert.match(page,/Gemini só para revisar a escrita/);
});
