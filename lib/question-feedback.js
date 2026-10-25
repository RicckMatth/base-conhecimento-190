import {createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
import {questionOptions,questionsFor} from './triage.js';
const options=new Map(questionOptions().map(q=>[q.id,q]));
function signingKey(version=2,previous=false){
 const key=version===1?process.env.GEMINI_API_KEY?.trim():(previous?process.env.FEEDBACK_SIGNING_KEY_PREVIOUS:process.env.FEEDBACK_SIGNING_KEY)?.trim();
 if(!key||version===2&&key.length<32)throw new Error('FEEDBACK_UNAVAILABLE');
 return createHmac('sha256',key).update('base190:question-feedback:v'+version).digest();
}
export function feedbackConfigured(){try{signingKey();return true;}catch{return false;}}
export function newFeedbackTicket(userId,natureCode,questions=[],now=Date.now()){
 const topics=[...new Set(questions.map(q=>q.topic))].filter(id=>options.has(id)).slice(0,6);
 const payload={v:2,logic:'triage-v1',id:randomUUID(),uid:userId,code:natureCode||'',topics,iat:now,exp:now+86400000};
 const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');
 return encoded+'.'+createHmac('sha256',signingKey()).update(encoded).digest('base64url');
}
export function readFeedbackTicket(ticket,userId,now=Date.now()){
 if(typeof ticket!=='string'||ticket.length>2500)throw new Error('FEEDBACK_INVALID');
 const parts=ticket.split('.');if(parts.length!==2)throw new Error('FEEDBACK_INVALID');
 let p;try{p=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));}catch{throw new Error('FEEDBACK_INVALID');}
 if(!p||![1,2].includes(p.v))throw new Error('FEEDBACK_INVALID');
 if(p.v===1){const cutoff=Date.parse(process.env.FEEDBACK_LEGACY_ACCEPT_UNTIL||'');if(!Number.isFinite(cutoff)||now>=cutoff||p.iat>=cutoff)throw new Error('FEEDBACK_INVALID');}
 const actual=Buffer.from(parts[1],'base64url');let valid=false;
 for(const previous of p.v===2?[false,true]:[false]){try{const signature=createHmac('sha256',signingKey(p.v,previous)).update(parts[0]).digest();if(actual.length===signature.length&&timingSafeEqual(actual,signature))valid=true;}catch{}}
 if(!valid)throw new Error('FEEDBACK_INVALID');
 if((p.v===2&&p.logic!=='triage-v1')||p.exp-p.iat>86400000||p.uid!==userId||!Number.isFinite(p.iat)||!Number.isFinite(p.exp)||p.exp<=now||p.iat>now+60000||!Array.isArray(p.topics)||p.topics.length>6||!p.topics.every(t=>options.has(t))||typeof p.code!=='string'||p.code.length>70||!/^[-0-9a-f]{36}$/.test(p.id))throw new Error('FEEDBACK_INVALID');
 return p;
}
export function learnableQuestions(proposal,rule){
 if(!rule||proposal.code!==rule.code)return [];
 const existing=new Set(questionsFor({...rule,learnedTriage:[]}).map(q=>q.id));
 return [...new Set(proposal.topics)].filter(topic=>options.has(topic)&&!existing.has(topic)).map(topic=>({topic,question:options.get(topic).text}));
}

