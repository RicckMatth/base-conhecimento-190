import {retrieveContext} from './assistant.js';
export const CATALOG_SQL='SELECT id,code,title,category,priority,summary,tags,revision,updated_at FROM knowledge ORDER BY title LIMIT 10000';
export const CUSTOM_SQL='SELECT id,definition,created_at FROM custom_rules ORDER BY created_at DESC LIMIT 200';
export const LEARNED_SQL=`SELECT q.nature_code,q.topic,q.question,count(*)::int AS approvals FROM learned_triage_questions q JOIN triage_question_votes v ON v.question_id=q.id JOIN triage_feedback f ON f.id=v.feedback_id JOIN users u ON u.id=f.user_id WHERE f.vote='like' AND u.active=true GROUP BY q.id ORDER BY q.nature_code,q.topic LIMIT 6000`;
function freeze(x){if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;}
export function createCatalogLoader(pool,{maxAgeMs=300000}={}){
 let cached=null,pending=null;const counters={queries:0,hits:0,misses:0,joined:0,errors:0};const query=(...args)=>{counters.queries++;return pool.query(...args);};
 async function revision(){return String((await query('SELECT revision FROM perf_catalog_revision WHERE id=true')).rows[0].revision);}
 async function load(){const version=await revision();if(cached?.version===version&&Date.now()-cached.at<maxAgeMs){counters.hits++;return cached.data;}if(pending?.version===version){counters.joined++;return pending.promise;}counters.misses++;
  const token={version};token.promise=(async()=>{for(let attempt=0;attempt<3;attempt++){const start=await revision();const [catalog,custom,learned]=await Promise.all([query(CATALOG_SQL),query(CUSTOM_SQL),query(LEARNED_SQL)]);const end=await revision();if(start===end){const data=freeze({catalog:catalog.rows,custom:custom.rows,learned:learned.rows});cached={version:end,data,at:Date.now()};return data;}}throw Error('Catálogo em atualização; tente novamente.');})().catch(e=>{counters.errors++;throw e;}).finally(()=>{if(pending===token)pending=null;});pending=token;return token.promise;
 }
 return {load,stats:()=>({...counters}),clear(){cached=null;},async candidates(text,history,entries){const matches=retrieveContext(text,entries,history);if(!matches.length)return [];const codes=matches.map(e=>e.code);const rows=(await query('SELECT code,body FROM knowledge WHERE code=ANY($1::text[])',[codes])).rows;const bodies=new Map(rows.map(r=>[r.code,r.body]));return matches.map(e=>({...e,body:bodies.get(e.code)||''}));}};
}
