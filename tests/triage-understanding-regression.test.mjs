import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRoles} from '../lib/offline-sade-parser.js';
import {analyzeOfflineReport} from '../lib/offline-sade-triage.js';
import {COPOM_CATALOG} from '../lib/copom-catalog.js';

const text='solicitante ligou informando que tem um individuo no meio do mato agredindo uma mulher, pede viatura no local pois o individuo está muito alterado e é possível ouvir os gritos da mulher';
test('motor entende cena progressiva com comunicante, agente e pessoa atingida',()=>{
 const roles=parseRoles(text);
 assert.equal(roles.caller,'Familiar/comunicante (terceiro)');
 assert.equal(roles.victim,'mulher');
 assert.equal(roles.author,'indivíduo');
 assert.equal(roles.callerType,'terceiro');
 assert.ok(['voz ativa com agente e alvo','cena progressiva com agente e alvo'].includes(roles.method));
 const result=analyzeOfflineReport({text,entries:COPOM_CATALOG});
 assert.equal(result.roleAnalysis.caller,'Familiar/comunicante (terceiro)');
 assert.equal(result.roleAnalysis.victim,'mulher');
 assert.equal(result.roleAnalysis.author,'indivíduo');
 assert.ok(result.natureSuggestions.some(x=>['NAT-0049','NAT-0011'].includes(x.code)));
 assert.equal(result.insufficientData,true);
 assert.equal(result.analysisQuestions.length,5);
});
