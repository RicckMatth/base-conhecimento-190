import {randomUUID} from 'node:crypto';
import {questionOptions} from './triage.js';
import {ADMIN_LOGIN} from './permissions.js';
const topics=new Map(questionOptions().map(q=>[q.id,q]));
export function assertQualityAdmin(actor){if(!actor||actor.role!=='admin'||actor.username!==ADMIN_LOGIN||actor.must_change_password||actor.mustChangePassword)throw Object.assign(Error('Controle de qualidade restrito ao administrador principal.'),{status:403});}
export function safeEditorial(value,max){if(typeof value!=='string'||value.length>max)throw Error('Texto editorial inválido.');const text=value.trim();if(/<[^>]*>|\b\d[\d .()+-]{7,}\d\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b(?:CPF|CEP|telefone|rua|avenida)\s*[:=]\s*\S+/i.test(text))throw Error('Remova identificadores pessoais, contatos, endereços e HTML do texto editorial.');return text;}
async function transaction(pool,work){const c=await pool.connect();try{await c.query('BEGIN');const r=await work(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
async function snapshot(c,p,actor,action,before,reason){await c.query('INSERT INTO quality_decisions(id,proposal_id,actor_id,action,before_value,after_value,reason) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),p.id,actor?.id||null,action,JSON.stringify(before),JSON.stringify(p),reason]);}
export async function registerQualityFeedback(pool,userId,proposal,vote,questions){
 if(!['like','dislike'].includes(vote))throw Error('FEEDBACK_INVALID');
 return transaction(pool,async c=>{
 await c.query("SELECT pg_advisory_xact_lock(hashtext('quality-editorial'))");
 await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',['quality:'+proposal.code]);
 const previous=(await c.query('SELECT vote FROM triage_feedback WHERE id=$1',[proposal.id])).rows[0];
 const stored=await c.query(`INSERT INTO triage_feedback(id,user_id,nature_code,vote) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET vote=EXCLUDED.vote,updated_at=now() WHERE triage_feedback.user_id=EXCLUDED.user_id AND triage_feedback.nature_code=EXCLUDED.nature_code RETURNING id`,[proposal.id,userId,proposal.code,vote]);if(!stored.rows.length)throw Error('FEEDBACK_INVALID');
 if(previous?.vote!==vote)await c.query('INSERT INTO quality_feedback_events(id,feedback_id,vote) VALUES($1,$2,$3)',[randomUUID(),proposal.id,vote]);
 // Votes change; administrative publications do not. Existing vote links preserve negative feedback history.
 let count=0;
 if(vote==='like')for(const item of questions){const canonical=topics.get(item.topic);if(!canonical||!proposal.topics.includes(item.topic))throw Error('FEEDBACK_INVALID');
 const id=randomUUID(),logic=proposal.logic||'legacy-ticket-v1';
 const inserted=await c.query(`INSERT INTO quality_proposals(id,nature_code,topic,logic_version,origin,original_question,question) VALUES($1,$2,$3,$4,'gemini',$5,$5) ON CONFLICT(nature_code,topic,logic_version) DO NOTHING RETURNING *`,[id,proposal.code,item.topic,logic,canonical.text]);
 let p=inserted.rows[0]||(await c.query('SELECT * FROM quality_proposals WHERE nature_code=$1 AND topic=$2 AND logic_version=$3',[proposal.code,item.topic,logic])).rows[0];
 let hops=0;while(p.status==='merged'){if(++hops>20)throw Error('Cadeia de mesclas inválida.');const next=(await c.query('SELECT * FROM quality_proposals WHERE id=$1',[p.merged_into])).rows[0];if(!next||next.nature_code!==proposal.code||next.topic!==item.topic)throw Error('Mescla inválida.');p=next;}
 await c.query('INSERT INTO quality_votes(feedback_id,proposal_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[proposal.id,p.id]);if(inserted.rows.length)await snapshot(c,p,null,'submitted',null,'Pergunta canônica; relato e resposta não persistidos.');count++;
 }
 return {vote,learned:0,submitted:count};});
}
export async function activeQualityQuestions(pool){return (await pool.query(`SELECT p.nature_code,p.topic,p.question FROM quality_publications p JOIN quality_proposals q ON q.id=p.proposal_id WHERE p.active AND q.status IN ('approved','legacy') ORDER BY p.nature_code,p.topic LIMIT 6000`)).rows;}
export async function qualityList(pool,actor,filters={}){assertQualityAdmin(actor);
 const f={status:String(filters.status||''),nature:String(filters.nature||'').slice(0,70),origin:String(filters.origin||''),from:filters.from||null,to:filters.to||null,likes:Math.max(0,Math.min(100000,Number(filters.likes)||0)),page:Math.max(0,Math.floor(Number(filters.page)||0))};
 for(const date of [f.from,f.to])if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Data inválida.');
 const args=[f.status,f.nature,f.origin,f.from,f.to,f.likes];
 const sql=`WITH items AS(SELECT p.*,count(v.feedback_id) FILTER(WHERE fb.vote='like' AND u.active=true)::int AS likes FROM quality_proposals p LEFT JOIN quality_votes v ON v.proposal_id=p.id LEFT JOIN triage_feedback fb ON fb.id=v.feedback_id LEFT JOIN users u ON u.id=fb.user_id GROUP BY p.id) SELECT * FROM items WHERE ($1='' OR status=$1) AND ($2='' OR nature_code=$2) AND ($3='' OR origin=$3) AND ($4::date IS NULL OR created_at>=$4::date) AND ($5::date IS NULL OR created_at<($5::date+interval '1 day')) AND likes>=$6`;
 const rows=(await pool.query(sql+' ORDER BY created_at DESC,id LIMIT 30 OFFSET $7',[...args,f.page*30])).rows;
 const total=Number((await pool.query('SELECT count(*)::int AS count FROM ('+sql+')q',args)).rows[0].count);
 const stats=(await pool.query(`SELECT status,count(*)::int AS count FROM quality_proposals GROUP BY status`)).rows;const published=Number((await pool.query('SELECT count(*)::int AS count FROM quality_publications WHERE active')).rows[0].count);
 return {items:rows,total,stats,published,page:f.page};}
export async function qualityDetail(pool,actor,id){assertQualityAdmin(actor);const proposal=(await pool.query('SELECT * FROM quality_proposals WHERE id=$1',[id])).rows[0];if(!proposal)throw Error('Proposta não encontrada.');const similar=(await pool.query('SELECT id,topic,question,status,nature_code,revision FROM quality_proposals WHERE nature_code=$1 AND topic=$2 AND id<>$3 ORDER BY created_at DESC',[proposal.nature_code,proposal.topic,id])).rows;const history=(await pool.query('SELECT id,action,actor_id,before_value,after_value,reason,created_at FROM quality_decisions WHERE proposal_id=$1 ORDER BY created_at DESC,id',[id])).rows;const likes=Number((await pool.query("SELECT count(*)::int AS count FROM quality_votes v JOIN triage_feedback f ON f.id=v.feedback_id JOIN users u ON u.id=f.user_id WHERE v.proposal_id=$1 AND f.vote='like' AND u.active=true",[id])).rows[0].count);const feedbackHistory=(await pool.query('SELECT e.id,e.vote,e.created_at FROM quality_feedback_events e JOIN quality_votes v ON v.feedback_id=e.feedback_id WHERE v.proposal_id=$1 ORDER BY e.created_at DESC LIMIT 100',[id])).rows;const publication=(await pool.query('SELECT proposal_id,active,published_at FROM quality_publications WHERE nature_code=$1 AND topic=$2',[proposal.nature_code,proposal.topic])).rows[0]||null;return {proposal,publication,likes,similar,history,feedbackHistory,preview:null,previewReason:'A resposta e o relato originais não foram armazenados. Apenas perguntas canônicas e metadados permitidos são persistidos.'};}
export async function reviewQuality(pool,actor,input){assertQualityAdmin(actor);const actions=['edit','approve','reject','revision','merge'];if(!actions.includes(input.action))throw Error('Decisão inválida.');const reason=safeEditorial(input.reason,1000);if(!reason)throw Error('Informe a justificativa.');
 return transaction(pool,async c=>{
 // One lock for editorial decisions guarantees deterministic merge/publish order, even across proposals.
 await c.query("SELECT pg_advisory_xact_lock(hashtext('quality-editorial'))");
 const before=(await c.query('SELECT * FROM quality_proposals WHERE id=$1 FOR UPDATE',[input.id])).rows[0];if(!before)throw Error('Proposta não encontrada.');if(before.revision!==input.revision)throw Object.assign(Error('Outra revisão alterou esta proposta. Recarregue antes de decidir.'),{status:409});
 if(before.status==='merged')throw Error('Proposta já mesclada.');
 let question=before.question,reference=before.reference_text,note=before.editorial_note,status=before.status,merged=null;
 if(input.action==='edit'){
  question=safeEditorial(input.question,600);reference=safeEditorial(input.reference_text||'',4000);note=safeEditorial(input.editorial_note||'',2000);if(!question||!topics.has(before.topic))throw Error('Tópico sem detector conhecido. Não é permitido criar detector por edição.');
  if(input.detectorConfirmed!==true)throw Error('Confirme que a redação mantém o mesmo tópico e os mesmos critérios de resposta.');status='revision';
 }
 if(input.action==='approve'){if(!topics.has(before.topic))throw Error('Tópico sem detector confiável.');if(input.detectorConfirmed!==true)throw Error('Confirme a compatibilidade com o detector.');status='approved';}
 if(['edit','approve'].includes(input.action)){const normalize=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();const equivalent=normalize(question);if([...topics.values()].some(q=>q.id!==before.topic&&normalize(q.text)===equivalent))throw Error('Esta redação pertence a outro tópico/detector.');const others=(await c.query("SELECT topic,question FROM quality_proposals WHERE nature_code=$1 AND topic<>$2 AND status NOT IN ('merged','rejected')",[before.nature_code,before.topic])).rows;if(others.some(q=>normalize(q.question)===equivalent))throw Error('Pergunta duplicada em outro tópico desta natureza.');}
 if(input.action==='reject')status='rejected';if(input.action==='revision')status='revision';
 if(input.action==='merge'){
 const target=(await c.query('SELECT * FROM quality_proposals WHERE id=$1 FOR UPDATE',[input.targetId])).rows[0];if(!target||target.id===before.id||target.nature_code!==before.nature_code||target.topic!==before.topic||['merged','rejected'].includes(target.status))throw Error('Mescla exige o mesmo tópico e natureza e um destino válido.');
 if(target.revision!==input.targetRevision)throw Object.assign(Error('O destino foi alterado. Recarregue.'),{status:409});
 await c.query('INSERT INTO quality_votes(feedback_id,proposal_id) SELECT feedback_id,$2 FROM quality_votes WHERE proposal_id=$1 ON CONFLICT DO NOTHING',[before.id,target.id]);
 const changed=(await c.query('UPDATE quality_proposals SET revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *',[target.id])).rows[0];await snapshot(c,changed,actor,'merge-target',target,reason);status='merged';merged=target.id;
 }
 const after=(await c.query('UPDATE quality_proposals SET question=$2,reference_text=$3,editorial_note=$4,status=$5,merged_into=$6,revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *',[before.id,question,reference,note,status,merged])).rows[0];
 // Editing/rejecting/returning an active proposal withdraws it. An edit always needs fresh approval.
 await c.query('UPDATE quality_publications SET active=false WHERE proposal_id=$1',[before.id]);
 if(input.action==='merge'){const destination=(await c.query('SELECT * FROM quality_proposals WHERE id=$1',[merged])).rows[0];if(destination.status==='approved')await c.query(`INSERT INTO quality_publications(nature_code,topic,question,proposal_id) VALUES($1,$2,$3,$4) ON CONFLICT(nature_code,topic) DO UPDATE SET question=EXCLUDED.question,proposal_id=EXCLUDED.proposal_id,active=true,published_at=now()`,[destination.nature_code,destination.topic,destination.question,destination.id]);}
 if(input.action==='approve')await c.query(`INSERT INTO quality_publications(nature_code,topic,question,proposal_id) VALUES($1,$2,$3,$4) ON CONFLICT(nature_code,topic) DO UPDATE SET question=EXCLUDED.question,proposal_id=EXCLUDED.proposal_id,active=true,published_at=now()`,[before.nature_code,before.topic,question,before.id]);
 await snapshot(c,after,actor,input.action,before,reason);return after;
 });}

export async function purgeQualityFeedback(pool,actor){assertQualityAdmin(actor);return transaction(pool,async c=>{const deleted=await c.query("DELETE FROM triage_feedback WHERE created_at<now()-interval '180 days' RETURNING id");return {removed:deleted.rows.length};});}
