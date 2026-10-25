import test from 'node:test';
import assert from 'node:assert/strict';
import {newFeedbackTicket,readFeedbackTicket,learnableQuestions} from '../lib/question-feedback.js';
import {questionOptions,questionsFor,withLearnedTriage,pendingSuggestedQuestions,evaluateTriage} from '../lib/triage.js';
import {askGemini} from '../lib/gemini.js';
process.env.FEEDBACK_SIGNING_KEY='test-signing-key-independent-32-characters';
process.env.GEMINI_API_KEY='unit-test-only-not-a-real-key';
const rule={id:'feedback-test',code:'TEST',title:'Ocorrência de teste',category:'Atendimento'};
const missing=questionOptions().find(q=>!questionsFor(rule).some(x=>x.id===q.id));
test('avaliação assinada é vinculada ao usuário, expira e rejeita adulteração',()=>{
 const ticket=newFeedbackTicket('user-a','TEST',[{topic:missing.id}],1000);
 assert.deepEqual(readFeedbackTicket(ticket,'user-a',2000).topics,[missing.id]);
 assert.throws(()=>readFeedbackTicket(ticket,'user-b',2000));
 assert.throws(()=>readFeedbackTicket(ticket,'user-a',86402000));
 const [payload,signature]=ticket.split('.');
 const altered=Buffer.from(JSON.stringify({...JSON.parse(Buffer.from(payload,'base64url')),code:'OTHER'})).toString('base64url');
 assert.throws(()=>readFeedbackTicket(altered+'.'+signature,'user-a',2000));
});
test('aprendizado contém somente perguntas canônicas e elimina repetições e dados pessoais',()=>{
 const ticket=newFeedbackTicket('user','TEST',[{topic:missing.id,question:'João mora na rua X?'},{topic:missing.id},{topic:'Pergunta sobre Maria'}]);
 const proposal=readFeedbackTicket(ticket,'user');
 assert.deepEqual(learnableQuestions(proposal,rule),[{topic:missing.id,question:missing.text}]);
 assert.equal(learnableQuestions(proposal,{...rule,code:'OTHER'}).length,0);
 assert.ok(!Buffer.from(ticket.split('.')[0],'base64url').toString().includes('João'));
 const standard=questionsFor(rule)[0];
 assert.equal(learnableQuestions({...proposal,topics:[standard.id]},rule).length,0);
});
test('perguntas aprendidas são específicas da natureza e não duplicam roteiro',()=>{
 const rows=[{nature_code:'TEST',topic:missing.id},{nature_code:'TEST',topic:missing.id}];
 assert.equal(questionsFor(withLearnedTriage(rule,rows)).filter(q=>q.id===missing.id).length,1);
 assert.equal(questionsFor(withLearnedTriage({...rule,code:'OTHER'},rows)).filter(q=>q.id===missing.id).length,0);
});
test('pergunta aprendida ou sugerida é ocultada quando o relato já a responde',()=>{
 const augmented=withLearnedTriage(rule,[{nature_code:'TEST',topic:'injured'}]);
 assert.ok(!evaluateTriage(augmented,'Não há feridos.').pending.some(q=>q.id==='injured'));
 assert.equal(pendingSuggestedQuestions(rule,'Não há feridos.',['injured']).length,0);
 assert.equal(pendingSuggestedQuestions(rule,'Informação ainda desconhecida.',['injured']).length,1);
});
test('Gemini separa explicação e perguntas; sem natureza reconhecida não aprende',async()=>{
 const text='Preciso de orientação adicional sobre este fato de teste';
 const entries=[{...rule,summary:text,body:text,tags:['teste']}];
 const generate=async()=>({output:{resposta:'Confira os dados informados.',natureCode:'TEST',questionTopics:['injured']}});
 const result=await askGemini({text,entries,generate});
 assert.equal(result.feedbackNature.code,'TEST');assert.equal(result.analysisQuestions[0].topic,'injured');
 const uncertain=await askGemini({text,entries,generate:async()=>({output:{resposta:'Faltam dados.',natureCode:null,questionTopics:['injured']}})});
 assert.equal(uncertain.feedbackNature,null);assert.deepEqual(uncertain.analysisQuestions,[]);
});

