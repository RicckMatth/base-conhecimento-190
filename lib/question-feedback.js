import {createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
import {questionOptions,questionsFor} from './triage.js';
const options=new Map(questionOptions().map(q=>[q.id,q]));
function signingKey(){
 const key=process.env.GEMINI_API_KEY?.trim();
 if(!key)throw new Error('FEEDBACK_UNAVAILABLE');
 return createHmac('sha256',key).update('base190:question-feedback:v1').digest();
}
export function newFeedbackTicket(userId,natureCode,questions=[],now=Date.now()){
 const topics=[...new Set(questions.map(q=>q.topic))].filter(id=>options.has(id)).slice(0,6);
 const payload={v:1,id:randomUUID(),uid:userId,code:natureCode||'',topics,iat:now,exp:now+86400000};
 const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');
 return encoded+'.'+createHmac('sha256',signingKey()).update(encoded).digest('base64url');
}
export function readFeedbackTicket(ticket,userId,now=Date.now()){
 if(typeof ticket!=='string'||ticket.length>2500)throw new Error('FEEDBACK_INVALID');
 const parts=ticket.split('.');if(parts.length!==2)throw new Error('FEEDBACK_INVALID');
 const signature=createHmac('sha256',signingKey()).update(parts[0]).digest();
 const actual=Buffer.from(parts[1],'base64url');
 if(actual.length!==signature.length||!timingSafeEqual(actual,signature))throw new Error('FEEDBACK_INVALID');
 let p;try{p=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));}catch{throw new Error('FEEDBACK_INVALID');}
 if(p.v!==1||p.uid!==userId||!Number.isFinite(p.iat)||!Number.isFinite(p.exp)||p.exp<=now||p.iat>now+60000||!Array.isArray(p.topics)||p.topics.length>6||!p.topics.every(t=>options.has(t))||typeof p.code!=='string'||p.code.length>70||!/^[-0-9a-f]{36}$/.test(p.id))throw new Error('FEEDBACK_INVALID');
 return p;
}
export function learnableQuestions(proposal,rule){
 if(!rule||proposal.code!==rule.code)return [];
 const existing=new Set(questionsFor({...rule,learnedTriage:[]}).map(q=>q.id));
 return [...new Set(proposal.topics)].filter(topic=>options.has(topic)&&!existing.has(topic)).map(topic=>({topic,question:options.get(topic).text}));
}
