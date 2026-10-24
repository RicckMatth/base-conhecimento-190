import {cleanDocument} from '../../../lib/documentation.js';
import { newFeedbackTicket,readFeedbackTicket,learnableQuestions } from '../../../lib/question-feedback.js';
import { withLearnedTriage,questionsFor } from '../../../lib/triage.js';
import { canTestGemini } from '../../../lib/permissions.js';
import { askGemini,aiStatus,rewriteWithGemini } from '../../../lib/gemini.js';
import { answerLocally,aiFailure } from '../../../lib/assistant.js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { db,prepare,ensureAdmin,log,loadLearnedQuestions,saveQuestionFeedback,consumeAiBudget,isRateLimited,recordFailure,clearFailure } from '../../../lib/db.js';
import { CEREBRO_190 } from '../../../lib/cerebro.js';
import { EXTRA_RULES } from '../../../lib/extras.js';
import { ADMIN_LOGIN, COOKIE_NAME,HOURS,cookieSettings,token,digest,passwordHash,passwordVerify,validLogin,string,sameOrigin,input } from '../../../lib/security.js';
export const runtime='nodejs';
export const maxDuration=30;
export const dynamic='force-dynamic';

const reply=(obj,status=200)=>NextResponse.json(obj,{status,headers:{'Cache-Control':'no-store'}});
const failure=(msg,status=400)=>reply({error:msg},status);
async function identity(){
  const cookieStore=await cookies();
  const raw=cookieStore.get(COOKIE_NAME)?.value;
  if(!raw || raw.length<35) return null;
  const result=await db().query(`SELECT u.id,u.username,u.display_name,u.role,u.must_change_password
    FROM sessions s JOIN users u ON s.user_id=u.id
    WHERE s.token_hash=$1 AND s.expires_at>now() AND s.revoked_at IS NULL AND u.active=true`,[digest(raw)]);
  return result.rows[0]||null;
}
function publicUser(u){return {id:u.id,username:u.username,name:u.display_name,role:u.role,canTestGemini:canTestGemini(u),mustChangePassword:Boolean(u.must_change_password)};}
function requireRole(u,admin=false){if(!u) return failure('Sessão ausente ou expirada.',401);if(admin&&u.role!=='admin')return failure('Acesso restrito ao administrador.',403);return null;}
const usernameOf=(v)=>string(v,40).toLowerCase();
function entryPayload(v) {
  const code=string(v.code,70).toUpperCase(),title=string(v.title,200),category=string(v.category,80),
    summary=string(v.summary,1000),body=string(v.body,16000),priority=string(v.priority,20);
  const tags=Array.isArray(v.tags)?v.tags.slice(0,30).map(x=>string(x,50)).filter(Boolean):[];
  if(!code||!title||!category||!summary||!body||!['Crítica','Alta','Média','Baixa'].includes(priority)) throw Error('Preencha código, título, categoria, prioridade, resumo e conteúdo.');
  return {code,title,category,summary,body,priority,tags};
}
async function createLoginSession(u) {
  const plain=token();
  await db().query(`INSERT INTO sessions(token_hash,user_id,expires_at)
  VALUES($1,$2,now()+interval '8 hours')`,[digest(plain),u.id]);
  const response=reply({user:publicUser(u)});
  response.cookies.set(COOKIE_NAME,plain,cookieSettings);
  return response;
}
async function gate(request,method,ctx){
  const params=await ctx.params;const seg=params.path||[];
  const route='/'+seg.join('/');
  if(method!=='GET'&&!sameOrigin(request)) return failure('Requisição de origem não autorizada.',403);
  if(route==='/health'&&method==='GET') return reply({status:'ok',databaseConfigured:Boolean(process.env.DATABASE_URL)});
  await prepare();

  if(route==='/access-requests'&&method==='POST') {
    const v=await input(request,2000), username=usernameOf(v.username),name=string(v.name,100),reason=string(v.reason,500);
    if(!validLogin(username)||username===ADMIN_LOGIN||name.length<3) return failure('Informe nome e usuário válido (4 a 40 caracteres).');
    const remote=digest(request.headers.get('x-forwarded-for')||'unknown').slice(0,20);
    if(await isRateLimited('request:'+remote,5)) return failure('Muitas solicitações. Tente mais tarde.',429);
    await recordFailure('request:'+remote);
    const existing=await db().query('SELECT id FROM users WHERE username=$1',[username]);
    if(existing.rowCount) return failure('O usuário já está cadastrado.',409);
    const previous=await db().query('SELECT status FROM access_requests WHERE username=$1',[username]);
    if(previous.rowCount) return failure('Já existe solicitação para este usuário.',409);
    await db().query('INSERT INTO access_requests(id,username,display_name,reason) VALUES($1,$2,$3,$4)',
      [randomUUID(),username,name,reason]);
    return reply({message:'Solicitação enviada. Aguarde a aprovação do administrador.'},201);
  }

  if(route==='/auth/login'&&method==='POST') {
    const v=await input(request,2000), username=usernameOf(v.username);
    const pass=typeof v.password==='string'?v.password:'';
    if(!validLogin(username)||pass.length>200||!pass) return failure('Credenciais inválidas.',401);
    const key='login:'+username;
    if(await isRateLimited(key)) return failure('Acesso temporariamente limitado. Tente novamente em 15 minutos.',429);
    if(username===ADMIN_LOGIN) await ensureAdmin();
    const found=await db().query('SELECT id,username,display_name,role,password_hash,active,must_change_password FROM users WHERE username=$1',[username]);
    const u=found.rows[0];
    // Mesmo em usuário não encontrado executa hash para reduzir diferenças de tempo.
    const valid=await passwordVerify(pass,u?.password_hash||'scrypt:00000000000000000000000000000000:'+('00'.repeat(64)));
    if(!u||!u.active||!valid) {await recordFailure(key);return failure('Credenciais inválidas.',401);}
    await clearFailure(key);
    await log(u.id,'login',u.username);
    return createLoginSession(u);
  }

  const u=await identity();
  if(route==='/auth/logout'&&method==='POST'){
    const raw=(await cookies()).get(COOKIE_NAME)?.value;
    if(raw) await db().query('UPDATE sessions SET revoked_at=now() WHERE token_hash=$1',[digest(raw)]);
    const out=reply({message:'Sessão encerrada.'});
    out.cookies.set(COOKIE_NAME,'',{...cookieSettings,maxAge:0});
    return out;
  }
  const blocked=requireRole(u);if(blocked) return blocked;
  if(route==='/session'&&method==='GET') return reply({user:publicUser(u)});
  if(route==='/auth/change-password'&&method==='POST'){
    const v=await input(request,3000);
    const current=typeof v.current==='string'?v.current:'',next=typeof v.next==='string'?v.next:'';
    if(next.length<12||next.length>128||!/[a-z]/.test(next)||!/[A-Z]/.test(next)||!/[0-9]/.test(next)||!/[^a-zA-Z0-9]/.test(next))
      return failure('Senha nova: use de 12 a 128 caracteres, maiúsculas, minúsculas, números e símbolo.');
    if(next===current)return failure('Escolha uma senha diferente da atual.');
    const key='change:'+u.id;
    if(await isRateLimited(key,5))return failure('Muitas tentativas. Aguarde 15 minutos.',429);
    const rec=await db().query('SELECT password_hash FROM users WHERE id=$1',[u.id]);
    if(!await passwordVerify(current,rec.rows[0]?.password_hash||'')){
      await recordFailure(key);return failure('Senha atual incorreta.',403);
    }
    const hash=await passwordHash(next);
    await db().query('UPDATE users SET password_hash=$2,must_change_password=false WHERE id=$1',[u.id,hash]);
    await db().query('UPDATE sessions SET revoked_at=now() WHERE user_id=$1',[u.id]);
    await clearFailure(key);
    await log(u.id,'password_changed',u.username);
    const out=reply({message:'Senha alterada. Entre novamente com a nova credencial.'});
    out.cookies.set(COOKIE_NAME,'',{...cookieSettings,maxAge:0});
    return out;
  }
  if(u.must_change_password)return failure('Troca obrigatória da senha provisória antes de utilizar a plataforma.',403);
  if(route==='/entries'&&method==='GET'){
    const rows=await db().query('SELECT id,code,title,category,priority,summary,body,tags,revision,updated_at FROM knowledge ORDER BY title LIMIT 800');
    const learned=await loadLearnedQuestions();
    const distributed=[...CEREBRO_190.regrasBase,...EXTRA_RULES].map(r=>withLearnedTriage(r,learned));
    return reply({entries:rows.rows.map(entry=>{const rule=distributed.find(r=>r.code===entry.code);return rule?{...entry,triageQuestions:questionsFor(rule).map(q=>q.text),legalBase:rule.legalBase,legal:rule.legal}:entry;})});
  }
  if(route==='/rules'&&method==='GET'){
    const custom=await db().query('SELECT id,definition,created_at FROM custom_rules ORDER BY created_at DESC LIMIT 200');
    const learned=await loadLearnedQuestions();
    return reply({base:CEREBRO_190.regrasBase.map(r=>withLearnedTriage(r,learned)),extras:EXTRA_RULES.map(r=>withLearnedTriage(r,learned)),custom:custom.rows});
  }
  if(route==='/documentation'&&method==='GET'){
    const rows=await db().query("SELECT p.*,u.display_name AS author FROM documentation_pages p LEFT JOIN users u ON u.id=p.author_id WHERE ($1 OR p.status='published') ORDER BY p.space,p.title",[u.role==='admin']);
    return reply({pages:rows.rows});
  }
  if(route==='/documentation/history'&&method==='GET'){
    const denied=requireRole(u,true);if(denied)return denied;
    const id=new URL(request.url).searchParams.get('id');
    if(!/^[0-9a-f-]{36}$/.test(id||''))return failure('Página inválida.');
    return reply({versions:(await db().query('SELECT revision,title,content,created_at FROM documentation_versions WHERE page_id=$1 ORDER BY revision DESC LIMIT 50',[id])).rows});
  }
  if(route==='/documentation'&&method==='POST'){
    const denied=requireRole(u,true);if(denied)return denied;
    const v=await input(request,250000),title=string(v.title,200),space=string(v.space,80)||'Geral';
    if(!title||!['draft','published'].includes(v.status))return failure('Informe título e estado válidos.');
    if(v.id&&!/^[0-9a-f-]{36}$/.test(v.id))return failure('Página inválida.');
    const content=cleanDocument(v.content),id=v.id||randomUUID(),client=await db().connect();
    try{
      await client.query('BEGIN');
      const saved=v.id?await client.query('UPDATE documentation_pages SET title=$2,space=$3,content=$4,status=$5,revision=revision+1,author_id=$6,updated_at=now() WHERE id=$1 AND revision=$7 RETURNING *',[id,title,space,content,v.status,u.id,v.revision]):await client.query('INSERT INTO documentation_pages(id,title,space,content,status,author_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[id,title,space,content,v.status,u.id]);
      if(!saved.rowCount){await client.query('ROLLBACK');return failure('Esta página foi alterada por outra pessoa. Copie seu texto e reabra a versão atual.',409);}
      const page=saved.rows[0];
      await client.query('INSERT INTO documentation_versions(page_id,revision,title,content,actor_id) VALUES($1,$2,$3,$4,$5)',[id,page.revision,title,content,u.id]);
      await client.query('COMMIT');return reply({page});
    }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  }
  if(route==='/ai/status'&&method==='GET')return reply(aiStatus());
  if(route==='/analysis-feedback'&&method==='POST'){
    const v=await input(request,5000);
    if(!['like','dislike'].includes(v.vote))return failure('Escolha like ou dislike.');
    if(!await consumeAiBudget('feedback:'+u.id,120))return failure('Muitas avaliações. Aguarde para continuar.',429);
    let proposal;
    try{proposal=readFeedbackTicket(v.ticket,u.id);}catch{return failure('Esta avaliação expirou ou não pertence à sua sessão. Faça uma nova análise.',400);}
    const distributed=[...CEREBRO_190.regrasBase,...EXTRA_RULES];
    let rule=distributed.find(r=>r.code===proposal.code);
    if(!rule&&proposal.code){const found=await db().query('SELECT code,title,category FROM knowledge WHERE code=$1',[proposal.code]);const row=found.rows[0];if(row)rule={...row,id:'custom-feedback',officialNature:row.title};}
    const questions=learnableQuestions(proposal,rule);
    const result=await saveQuestionFeedback(u.id,proposal,v.vote,questions);
    return reply({...result,message:v.vote==='dislike'?'Dislike registrado. Nenhuma pergunta desta avaliação alimenta o aprendizado.':questions.length?`${questions.length} pergunta(s) aprovada(s) para esta natureza. Somente as perguntas foram aproveitadas.`:'Like registrado. Não há pergunta nova ou natureza definida para acrescentar; nenhuma resposta foi salva.'});
  }

  if(route==='/rewrite'&&method==='POST'){
    const v=await input(request,12000),text=string(v.text,8000);
    if(text.length<3)return failure('Informe o relato para revisão.');
    if(!aiStatus().configured)return failure('Gemini ainda não configurado. Utilize a revisão local.',503);
    if(!await consumeAiBudget(u.id,30))return failure('Limite de consultas à IA atingido. A revisão local continua disponível.',429);
    try{return reply(await rewriteWithGemini(text));}
    catch(error){
      if(/^REWRITE_/.test(error?.message||''))return failure('A revisão sugerida alterou informações protegidas e foi descartada. Confira a revisão local.',422);
      return failure(aiFailure(error).message,503);
    }
  }

  if((route==='/chat'||route==='/admin/ai/test'||route==='/analyze')&&method==='POST'){
    if(route==='/admin/ai/test'&&!canTestGemini(u))return failure('Teste de conexão restrito ao administrador principal.',403);
    const v=await input(request,32000), relato=route==='/admin/ai/test'?'Responda apenas: conexão Gemini funcionando.':string(v.text,8000);
    if(relato.length<3)return failure('Insira pelo menos 3 caracteres.');
    const [custom,knowledge,learned]=await Promise.all([
      db().query('SELECT definition FROM custom_rules ORDER BY created_at DESC LIMIT 200'),
      db().query('SELECT code,title,category,summary,body,tags FROM knowledge ORDER BY title LIMIT 800'),
      loadLearnedQuestions()
    ]);
    const rules=[...custom.rows.map(x=>x.definition),...EXTRA_RULES];
    const distributed=[...CEREBRO_190.regrasBase,...EXTRA_RULES].map(r=>withLearnedTriage(r,learned));
    const enriched=knowledge.rows.map(entry=>{const rule=distributed.find(r=>r.code===entry.code);return rule?{...entry,triageQuestions:questionsFor(rule).map(q=>q.text),legalBase:rule.legalBase,legal:rule.legal}:entry;});
    const local=route==='/admin/ai/test'?null:answerLocally({text:relato,history:v.history,entries:enriched,
      classify:text=>CEREBRO_190.analisarEntrada(text,rules,learned)});
    if(local)return reply({result:local,disclaimer:'Resposta da base local. Confirme fatos e protocolo institucional.'});
    {
      if(!aiStatus().configured)return reply({error:'IA ainda não configurada. O administrador deve definir GEMINI_API_KEY na Vercel.',code:'AI_NOT_CONFIGURED'},503);
      if(!await consumeAiBudget(u.id,30))return failure('Limite de 30 consultas à IA em 15 minutos. Aguarde para continuar.',429);
      try{
        const result=await askGemini({text:relato,history:v.history,entries:enriched});
        if(route!=='/admin/ai/test')result.feedbackTicket=newFeedbackTicket(u.id,result.feedbackNature?.code,result.analysisQuestions);
        return reply({result,disclaimer:'Resposta gerada por IA; confira fatos, legislação e protocolo institucional.'});
      }catch(error){
        const safe=aiFailure(error);
        return reply({error:safe.message,code:safe.code},error?.statusCode===429?429:503);
      }
    }

  }

  const denied=requireRole(u,true);if(denied) return denied;
  if(route==='/admin/requests'&&method==='GET'){
    const v=await db().query('SELECT id,username,display_name,reason,status,created_at,resolved_at FROM access_requests ORDER BY created_at DESC LIMIT 250');
    return reply({requests:v.rows});
  }
  if(route==='/admin/users'&&method==='GET'){
    const v=await db().query('SELECT id,username,display_name,role,active,created_at FROM users ORDER BY created_at DESC LIMIT 250');
    return reply({users:v.rows});
  }
  if(route==='/admin/audit'&&method==='GET'){
    const v=await db().query(`SELECT a.action,a.target,a.at,u.username FROM audit_log a LEFT JOIN users u ON u.id=a.actor_id
    ORDER BY a.at DESC LIMIT 100`);
    return reply({events:v.rows});
  }
  if(route==='/admin/requests'&&method==='POST'){
    const v=await input(request,2000),id=string(v.id,50),action=string(v.action,30);
    if(!/^[0-9a-f-]{36}$/i.test(id)||!['approve','reject'].includes(action))return failure('Solicitação ou ação inválida.');
    const client=await db().connect();
    try{
      await client.query('BEGIN');
      const result=await client.query('SELECT * FROM access_requests WHERE id=$1 FOR UPDATE',[id]);
      if(!result.rowCount||result.rows[0].status!=='pending') {await client.query('ROLLBACK');return failure('Solicitação não está pendente.',409);}
      let temporaryPassword=null;
      if(action==='approve'){
        temporaryPassword=token().slice(0,24);
        const hash=await passwordHash(temporaryPassword);
        await client.query(`INSERT INTO users(id,username,display_name,password_hash,role,active,must_change_password)
          VALUES($1,$2,$3,$4,'user',true,true)`,
          [randomUUID(),result.rows[0].username,result.rows[0].display_name,hash]);
      }
      await client.query('UPDATE access_requests SET status=$2,resolved_at=now() WHERE id=$1',[id,action==='approve'?'approved':'rejected']);
      await client.query('INSERT INTO audit_log(id,actor_id,action,target) VALUES($1,$2,$3,$4)',[randomUUID(),u.id,'request_'+action,result.rows[0].username]);
      await client.query('COMMIT');
      return reply({message:action==='approve'?'Aprovado com perfil simples.':'Solicitação rejeitada.',temporaryPassword});
    }catch(e){await client.query('ROLLBACK');if(e.code==='23505')return failure('Usuário já existente.',409);throw e;}
    finally{client.release();}
  }
  if(route==='/admin/users'&&method==='PATCH'){
    const v=await input(request,2000),id=string(v.id,50);
    if(!/^[0-9a-f-]{36}$/i.test(id)||typeof v.active!=='boolean')return failure('Dados inválidos.');
    const result=await db().query(`UPDATE users SET active=$2 WHERE id=$1 AND role='user' RETURNING username`,[id,v.active]);
    if(!result.rowCount) return failure('Conta não encontrada ou protegida.',404);
    await log(u.id,v.active?'user_enabled':'user_disabled',result.rows[0].username);
    return reply({message:'Permissões de acesso atualizadas.'});
  }
  if(route==='/admin/users/reset'&&method==='POST'){
    const v=await input(request,2000),id=string(v.id,50);
    if(!/^[0-9a-f-]{36}$/i.test(id))return failure('Identificação inválida.');
    const tmp=token().slice(0,24),hash=await passwordHash(tmp);
    const res=await db().query(`UPDATE users SET password_hash=$2,must_change_password=true WHERE id=$1 AND role='user' RETURNING username`,[id,hash]);
    if(!res.rowCount)return failure('Conta não encontrada ou protegida.',404);
    await db().query('UPDATE sessions SET revoked_at=now() WHERE user_id=$1',[id]);
    await log(u.id,'password_reset',res.rows[0].username);
    return reply({temporaryPassword:tmp});
  }
  if(route==='/admin/entries'&&method==='POST'){
    const v=entryPayload(await input(request));
    const id=randomUUID();
    const res=await db().query(`INSERT INTO knowledge
      (id,code,title,category,priority,summary,body,tags,author_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9) RETURNING id`,
      [id,v.code,v.title,v.category,v.priority,v.summary,v.body,JSON.stringify(v.tags),u.id]);
    await log(u.id,'entry_created',v.code);
    return reply({id:res.rows[0].id},201);
  }
  if(route==='/admin/entries'&&method==='PATCH'){
    const v=await input(request);
    const id=string(v.id,50),revision=Number(v.revision),entry=entryPayload(v);
    if(!/^[0-9a-f-]{36}$/i.test(id)||!Number.isSafeInteger(revision)||revision<1)return failure('ID ou revisão inválida.');
    const client=await db().connect();
    try {
      await client.query('BEGIN');
      const old=await client.query('SELECT * FROM knowledge WHERE id=$1 FOR UPDATE',[id]);
      if(!old.rowCount||old.rows[0].revision!==revision){await client.query('ROLLBACK');return failure('Ficha alterada por outra sessão. Recarregue antes de salvar.',409);}
      await client.query('INSERT INTO knowledge_revisions(id,knowledge_id,revision,snapshot,actor_id) VALUES($1,$2,$3,$4::jsonb,$5)',
        [randomUUID(),id,revision,JSON.stringify(old.rows[0]),u.id]);
      await client.query(`UPDATE knowledge SET code=$2,title=$3,category=$4,priority=$5,summary=$6,body=$7,tags=$8::jsonb,
        revision=revision+1,updated_at=now(),author_id=$9 WHERE id=$1`,
        [id,entry.code,entry.title,entry.category,entry.priority,entry.summary,entry.body,JSON.stringify(entry.tags),u.id]);
      await client.query('COMMIT');
      await log(u.id,'entry_updated',entry.code);
      return reply({message:'Ficha revisada e histórico registrado.'});
    }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  }
  if(route==='/admin/entries/revisions'&&method==='GET'){
    const id=new URL(request.url).searchParams.get('id');
    if(!/^[0-9a-f-]{36}$/i.test(id||''))return failure('Ficha inválida.');
    const revisions=await db().query('SELECT revision,snapshot,created_at FROM knowledge_revisions WHERE knowledge_id=$1 ORDER BY revision DESC LIMIT 30',[id]);
    return reply({revisions:revisions.rows});
  }
  if(route==='/admin/rules'&&method==='POST'){
    const v=await input(request,12000);
    const code=string(v.code,60).toUpperCase(),name=string(v.officialNature,200),
      group1=Array.isArray(v.group1)?v.group1.slice(0,30).map(x=>string(x,60)).filter(Boolean):[],
      group2=Array.isArray(v.group2)?v.group2.slice(0,30).map(x=>string(x,60)).filter(Boolean):[];
    if(!code||!name||!group1.length)return failure('Código, nome e gatilhos obrigatórios.');
    const id=randomUUID(),rule={id:'db-'+id,code,officialNature:name,category:string(v.category,60)||'Geral',
      priority:['Crítica','Alta','Média','Baixa'].includes(v.priority)?v.priority:'Média',
      legalBase:string(v.legalBase,200)||'A confirmar',agency:'Central 190',
      requiredGroups:group2.length?[group1,group2]:[group1],
      boostKeywords:[],excludeKeywords:[],explanation:string(v.explanation,600),
      triageQuestions:[],dispatchMask:''};
    await db().query('INSERT INTO custom_rules(id,code,definition,author_id) VALUES($1,$2,$3::jsonb,$4)',[id,code,JSON.stringify(rule),u.id]);
    await log(u.id,'rule_created',code);
    return reply({message:'Regra cadastrada.',id},201);
  }
  if(route==='/admin/rules'&&method==='DELETE'){
    const v=await input(request,2000),id=string(v.id,50);
    if(!/^[0-9a-f-]{36}$/i.test(id))return failure('Regra inválida.');
    const row=await db().query('DELETE FROM custom_rules WHERE id=$1 RETURNING code',[id]);
    if(!row.rowCount)return failure('Regra não encontrada.',404);
    await log(u.id,'rule_deleted',row.rows[0].code);
    return reply({message:'Regra removida.'});
  }
  return failure('Rota não encontrada.',404);
}
async function run(request,method,ctx){
  try{return await gate(request,method,ctx);}
  catch(e){
    if(e?.code==='23505')return failure('Código ou usuário já cadastrado.',409);
    if(e?.message==='DATABASE_URL não configurada.') return failure('Banco de dados ainda não configurado pelo administrador.',503);
    if(e instanceof SyntaxError)return failure('JSON inválido.');
    if(/obrigatório|inválid|excede|Preencha|Informe|conteúdo/i.test(e?.message||''))return failure(e.message);
    console.error('API Base190:',e?.code||e?.name||'unknown');
    return failure('Não foi possível concluir a operação. Verifique a configuração do serviço.',503);
  }
}
export const GET=(req,ctx)=>run(req,'GET',ctx);
export const POST=(req,ctx)=>run(req,'POST',ctx);
export const PATCH=(req,ctx)=>run(req,'PATCH',ctx);
export const DELETE=(req,ctx)=>run(req,'DELETE',ctx);
