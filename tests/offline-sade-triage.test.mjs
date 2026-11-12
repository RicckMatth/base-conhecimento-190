import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRoles,parseEvidence} from '../lib/offline-sade-parser.js';
import {analyzeOfflineReport,answerOffline} from '../lib/offline-sade-triage.js';
import {COPOM_CATALOG} from '../lib/copom-catalog.js';

const examine=text=>analyzeOfflineReport({text,entries:COPOM_CATALOG});
const codes=result=>result.natureSuggestions.map(x=>x.code);
test('parser separa pai vítima e amigo autor mesmo com correferência indivíduo',()=>{
 const text='Solicitante relata que seu pai sofreu ameaças do amigo, pede viatura pois o indivíduo está em frente à residência armado com um facão tentando forçar a porta da residência';
 const actors=parseRoles(text),facts=parseEvidence(text);
 assert.equal(actors.victim,'pai');
 assert.equal(actors.author,'amigo');
 assert.equal(actors.callerType,'terceiro');
 assert.equal(facts.weaponType,'Arma branca');
 assert.equal(facts.signals.gun.yes,false);
 const r=examine(text);
 assert.equal(r.tipo,'local-triage');
 assert.ok(codes(r).includes('NAT-0005'),JSON.stringify(r.natureSuggestions));
 assert.ok(codes(r).includes('NAT-0012'),JSON.stringify(r.natureSuggestions));
 assert.ok(!codes(r).includes('NAT-0076'));
 assert.ok(!codes(r).includes('NAT-0274'));
 assert.equal(r.analysisQuestions.length,5);
});
test('discussão familiar e saída com filho não viram subtração de incapaz ou agressão sem evidência',()=>{
 const r=examine('Uma mulher relata que discutiu com o pai do filho. O pai saiu com o filho no carro e ela tentou abrir a porta, mas não conseguiu. A solicitante não informou qualquer ameaça ou agressão.');
 assert.ok(codes(r).includes('NAT-0023'),JSON.stringify(r.natureSuggestions));
 assert.ok(!codes(r).includes('NAT-0133'));
 assert.ok(!codes(r).includes('NAT-0009'));
 assert.ok(!codes(r).includes('NAT-0005'));
 assert.equal(r.insufficientData,true);
 assert.equal(r.analysisQuestions.length,5);
});
test('negativas explícitas não se transformam em crimes e afastam armamento e ferimentos',()=>{
 const text='Houve uma discussão. Não houve ameaças, não houve feridos e não estava armado com facão.';
 const f=parseEvidence(text);
 assert.equal(f.signals.threat.yes,false);
 assert.equal(f.signals.injury.yes,false);
 assert.equal(f.signals.knife.yes,false);
 const r=examine(text);
 assert.ok(!codes(r).includes('NAT-0005'));
 assert.ok(!codes(r).includes('NAT-0110'));
 assert.ok(r.analysisQuestions.length===5);
});
test('ameaça doméstica não é presumida sem vítima feminina identificada',()=>{
 const r=examine('O pai sofreu ameaças do filho em casa.');
 assert.equal(r.roleAnalysis.victim,'pai');
 assert.ok(!codes(r).includes('NAT-0019'));
 assert.ok(codes(r).includes('NAT-0005'));
});
test('agressão familiar com lesões evidentes sugere natureza distinta de mera discussão',()=>{
 const r=examine('A esposa foi agredida pelo marido e ficou ferida, apresentando sangramento.');
 assert.equal(r.roleAnalysis.victim,'esposa');
 assert.equal(r.roleAnalysis.author,'marido');
 assert.ok(codes(r).includes('NAT-0004'),JSON.stringify(r.natureSuggestions));
 assert.ok(!codes(r).includes('NAT-0023'));
});
test('arma de fogo não é inferida a partir de facão e roubo não é disparado por celular isolado',()=>{
 const a=examine('Um amigo armado com facão está em frente à residência proferindo ameaças.');
 assert.ok(!codes(a).some(c=>['NAT-0076','NAT-0037'].includes(c)));
 const b=examine('O morador informou que seu celular estava na mesa da residência.');
 assert.ok(!codes(b).some(c=>['NAT-0016','NAT-0010','NAT-0037'].includes(c)));
});
test('roubo com arma de fogo em motocicleta não vira infração de trânsito por palavra moto',()=>{
 const r=examine('Dois indivíduos em uma moto apontaram uma arma de fogo e mandaram passar o celular antes de fugir.');
 assert.ok(codes(r).includes('NAT-0016'),JSON.stringify(r.natureSuggestions));
 assert.ok(!codes(r).includes('NAT-0045'));
});
test('sinistro viário e embriaguez são separados sem presumir ferimento',()=>{
 const r=examine('Motorista bêbado conduzia um veículo e colidiu com outro carro na avenida. Ninguém ficou ferido.');
 assert.ok(codes(r).includes('NAT-0006'),JSON.stringify(r.natureSuggestions));
 assert.ok(!codes(r).includes('NAT-0129'));
});
test('sem pistas o motor não inventa natureza nem códigos, mas ainda faz cinco perguntas',()=>{
 const r=examine('Um fato desconhecido aconteceu e pediram atendimento sem qualquer outra informação.');
 assert.equal(r.natureSuggestions.length,0);
 assert.equal(r.insufficientData,true);
 assert.equal(r.analysisQuestions.length,5);
 assert.equal(new Set(r.analysisQuestions.map(q=>q.topic)).size,5);
 const none=analyzeOfflineReport({text:'O homem foi embora.',entries:[]});
 assert.deepEqual(none.natureSuggestions,[]);
 assert.deepEqual(none.references,[]);
});
test('análise offline não exige chave Gemini ou ligação externa',()=>{
 const saved=process.env.GEMINI_API_KEY;delete process.env.GEMINI_API_KEY;
 try{
  const r=examine('Som alto e algazarra impedem moradores de dormir.');
  assert.equal(r.source,'local');assert.ok(codes(r).includes('NAT-0002'));
 }finally{if(saved===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=saved;}
});
test('consulta teórica continua sem forçar sondagem de ocorrência',()=>{
 const r=answerOffline({text:'Como funciona o reconhecimento de relatos?',entries:COPOM_CATALOG});
 assert.equal(r.tipo,'faq');
});
