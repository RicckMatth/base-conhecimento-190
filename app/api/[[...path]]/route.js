import {put,get,del} from '@vercel/blob';
import {normalizeImage,readLimited,storeAsset,readableAsset,deleteAsset,requireEditor,importExternalImage} from '../../../lib/documentation-assets.js';
import {saveDocument,saveDraft,uuid} from '../../../lib/documentation-store.js';
import {getSchedule,editOperationalRole,editShift,editScheduleDay,generateMonth,editSchedulePreferences,editSundayChoice} from '../../../lib/floor-scheduling.js';
import {qualityBoard,qualitySaveMonitor,qualitySaveFollowup,qualityAcknowledge} from '../../../lib/quality-store.js';
import {listDocumentationSpaces,createDocumentationSpace,updateDocumentationSpace} from '../../../lib/documentation-spaces.js';
import {cleanDocument} from '../../../lib/documentation.js';
import { readFeedbackTicket,learnableQuestions } from '../../../lib/question-feedback.js';
import { canTestGemini } from '../../../lib/permissions.js';
import { aiStatus,rewriteWithGemini } from '../../../lib/gemini.js';
import {analyzeOfflineReport,answerOffline} from '../../../lib/offline-sade-triage.js';
import {COPOM_CATALOG,catalogRules} from '../../../lib/copom-catalog.js';
import { answerLocally,aiFailure } from '../../../lib/assistant.js';
import {resolveChatIntent} from '../../../lib/chat-intent.js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { db,prepare,ensureAdmin,log,saveQuestionFeedback,consumeAiBudget,isRateLimited,recordFailure,clearFailure } from '../../../lib/db.js';
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
  const result=await db().query(`SELECT u.id,u.username,u.display_name,u.role,u.operational_role,u.must_change_password
    FROM sessions s JOIN users u ON s.user_id=u.id
    WHERE s.token_hash=$1 AND s.expires_at>now() AND s.revoked_at IS NULL AND u.active=true`,[digest(raw)]);
  return result.rows[0]||null;
}
function publicUser(u){return {id:u.id,username:u.username,name:u.display_name,role:u.role,operationalRole:u.operational_role||'attendant',canTestGemini:canTestGemini(u),mustChangePassword:Boolean(u.must_change_password)};}
function requireRole(u,admin=false){if(!u) return failure('Sessão ausente ou expirada.',401);if(admin&&u.role!=='admin')return failure('Acesso restrito ao administrador.',403);return null;}
const usernameOf=(v)=>string(v,40).toLowerCase();
function entryPayload(v) {
  const code=string(v.code,70).toUpperCase(),title=string(v.title,200),category=string(v.category,80),
    summary=string(v.summary,1000),body=string(v.body,16000),priority=string(v.priority,20);
  const tags=Array.isArray(v.tags)?v.tags.slice(0,30).map(x=>string(x,50)).filter(Boolean):[];
  if(!code||!title||!category||!summary||!body||!['Crítica','Alta','Média','Baixa','Consulta'].includes(priority)) throw Error('Preencha código, título, categoria, prioridade, resumo e conteúdo.');
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
  // Se a preparação complementar falhar, consultas autenticadas de leitura
  // ainda podem exibir o catálogo estático, sem escrever no banco.
  let bootstrapIssue=null;
  try{await prepare();}catch(error){
    bootstrapIssue=error;
    console.error('Base190 bootstrap failure',{route,code:error?.code||'unknown'});
    if(!((method==='GET'&&['/entries','/rules','/session','/quality'].includes(route))||(method==='POST'&&['/chat','/analyze','/quality/monitor','/quality/followup','/quality/ack'].includes(route))))throw error;
  }

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
    const found=await db().query('SELECT id,username,display_name,role,operational_role,password_hash,active,must_change_password FROM users WHERE username=$1',[username]);
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
  // Qualidade 190: GET/POST protegidos pela sessão; todas as permissões,
  // assinaturas e notas são verificadas novamente no servidor.
  if(route==='/quality'&&method==='GET'){
   try{
    const month=new URL(request.url).searchParams.get('month')||new Date().toISOString().slice(0,7);
    return reply(await qualityBoard(db(),u,month));
   }catch(error){return failure(error.message,error.status||503);}
  }
  if(route==='/quality/monitor'&&method==='POST'){
   try{
    const v=await input(request,20000);
    return reply(await qualitySaveMonitor(db(),u,v,{publish:v.publish===true}),v.id?200:201);
   }catch(error){return failure(error.message,error.status||400);}
  }
  if(route==='/quality/followup'&&method==='POST'){
   try{
    const v=await input(request,16000);
    return reply(await qualitySaveFollowup(db(),u,v,{publish:v.publish===true}),201);
   }catch(error){return failure(error.message,error.status||400);}
  }
  if(route==='/quality/ack'&&method==='POST'){
   try{
    const v=await input(request,140000);
    return reply(await qualityAcknowledge(db(),u,v));
   }catch(error){return failure(error.message,error.status||400);}
  }

  if(route==='/entries'&&method==='GET'){
    try{
      if(bootstrapIssue)throw bootstrapIssue;
      const rows=await db().query('SELECT id,code,title,category,priority,summary,body,tags,revision,updated_at FROM knowledge WHERE active_in_catalog=true ORDER BY title LIMIT 2000');
      if(rows.rows.length)return reply({entries:rows.rows,catalogSource:'copom-csv-v2',catalogImported:769,degraded:false});
      console.error('Base190 catalog empty: no active rows (read-only fallback)');
    }catch(error){console.error('Base190 entries query failure',{code:error?.code||'unknown'});}
    return reply({entries:COPOM_CATALOG.map(e=>({...e,id:'offline-'+e.code,revision:0,readOnly:true})),catalogSource:'copom-csv-v2-static',catalogImported:769,degraded:true,
      warning:'Catálogo exibido a partir do arquivo local. A conexão ou sincronização do banco precisa ser verificada; alterações administrativas podem estar temporariamente indisponíveis.'});
  }
  if(route==='/rules'&&method==='GET'){
    try{
      if(bootstrapIssue)throw bootstrapIssue;
      const [custom,knowledge]=await Promise.all([
        db().query('SELECT id,definition,created_at FROM custom_rules WHERE active_in_catalog=true ORDER BY created_at DESC LIMIT 200'),
        db().query('SELECT code,title,category,priority,summary FROM knowledge WHERE active_in_catalog=true ORDER BY title LIMIT 2000')
      ]);
      if(knowledge.rows.length)return reply({base:catalogRules(knowledge.rows),extras:[],custom:custom.rows,degraded:false});
      console.error('Base190 classification rules empty: no active knowledge records');
    }catch(error){console.error('Base190 rules query failure',{code:error?.code||'unknown'});}
    return reply({base:catalogRules(COPOM_CATALOG),extras:[],custom:[],degraded:true,
      warning:'Regras exibidas a partir do catálogo local. Regras personalizadas estão indisponíveis enquanto a conexão do banco não for restabelecida.'});
  }
  if(route.startsWith('/documentation/assets')){
    const assetId=route.slice('/documentation/assets/'.length);
    if(method==='GET'&&uuid(assetId)){const asset=await readableAsset(db(),u,assetId);if(!asset)return failure('Anexo indisponível.',404);const file=await get(asset.pathname,{access:'private',abortSignal:AbortSignal.timeout(15000)});if(!file||file.statusCode!==200)return failure('Anexo não encontrado.',404);return new Response(file.stream,{headers:{'Content-Type':asset.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline; filename="image.webp"','Content-Security-Policy':"default-src 'none'; sandbox"}});}
    try{requireEditor(u);}catch(e){return failure(e.message,403);}
    if(method==='GET'&&route==='/documentation/assets'){const rows=(await db().query("SELECT id,page_id,created_at FROM documentation_assets WHERE creator_id=$1 AND state='ready' ORDER BY created_at DESC LIMIT 100",[u.id])).rows;return reply({assets:rows.map(a=>({...a,src:'/api/documentation/assets/'+a.id})),configured:Boolean(process.env.BLOB_STORE_ID||process.env.BLOB_READ_WRITE_TOKEN)});}
    if(method==='POST'&&!process.env.BLOB_STORE_ID&&!process.env.BLOB_READ_WRITE_TOKEN)return failure('Armazenamento privado não configurado. Conecte um Vercel Blob PRIVATE no ambiente.',503);
    if(method==='DELETE'&&uuid(assetId)){try{return reply(await deleteAsset(db(),u,assetId,{del}));}catch(e){return failure(e.message,e.status||400);}}
    if(method==='POST'&&route==='/documentation/assets'){if(Number(request.headers.get('content-length'))>3145728)return failure('Limite de 3 MB.',413);try{const image=await normalizeImage(await readLimited(request.body),(request.headers.get('content-type')||'').split(';')[0]);return reply(await storeAsset(db(),u,image,{put,del}),201);}catch(e){return failure(e.message,400);}}
    if(method==='POST'&&route==='/documentation/assets/import'){try{const v=await input(request,3000),image=await importExternalImage(v.url);return reply(await storeAsset(db(),u,image,{put,del}),201);}catch(e){return failure(e.message,400);}}
    return failure('Operação não encontrada.',404);
  }
  if(route==='/documentation/draft'){
    try{requireEditor(u);}catch(e){return failure(e.message,403);}
    const key=new URL(request.url).searchParams.get('key');
    if(method==='GET'){if(key!=='new'&&!uuid(key))return failure('Rascunho inválido.');const draft=(await db().query('SELECT * FROM documentation_drafts WHERE user_id=$1 AND page_key=$2',[u.id,key])).rows[0]||null;return reply({draft});}
    if(method==='POST'){try{return reply(await saveDraft(db(),u,await input(request,250000)));}catch(e){return failure(e.message,e.status||400);}}
    if(method==='DELETE'){if(key!=='new'&&!uuid(key))return failure('Rascunho inválido.');await db().query('DELETE FROM documentation_drafts WHERE user_id=$1 AND page_key=$2',[u.id,key]);return reply({ok:true});}
  }
  if(route==='/documentation'&&method==='GET'){
    const [rows,spaces]=await Promise.all([
      db().query("SELECT p.*,u.display_name AS author FROM documentation_pages p LEFT JOIN users u ON u.id=p.author_id WHERE ($1 OR p.status='published') ORDER BY p.space,p.title",[u.role==='admin']),
      listDocumentationSpaces(db(),u.role==='admin')
    ]);
    return reply({pages:rows.rows,spaces});
  }
  if(route==='/documentation/spaces'&&method==='POST'){
    try{return reply(await createDocumentationSpace(db(),u,await input(request,2500)),201);}catch(e){return failure(e.message,e.status||400);}
  }
  if(route==='/documentation/spaces'&&method==='PATCH'){
    try{return reply(await updateDocumentationSpace(db(),u,await input(request,2500)));}catch(e){return failure(e.message,e.status||400);}
  }
  if(route==='/documentation/history'&&method==='GET'){
    const denied=requireRole(u,true);if(denied)return denied;
    const id=new URL(request.url).searchParams.get('id');
    if(!/^[0-9a-f-]{36}$/.test(id||''))return failure('Página inválida.');
    return reply({versions:(await db().query('SELECT revision,title,content,created_at,metadata,actor_id FROM documentation_versions WHERE page_id=$1 ORDER BY revision DESC LIMIT 50',[id])).rows});
  }
  if(route==='/documentation'&&method==='POST'){
    try{return reply(await saveDocument(db(),u,await input(request,250000)));}catch(e){return failure(e.message,e.status||400);}
  }

  if(route==='/ai/status'&&method==='GET')return reply(aiStatus());
  if(route==='/analysis-feedback'&&method==='POST'){
    const v=await input(request,5000);
    if(!['like','dislike'].includes(v.vote))return failure('Escolha like ou dislike.');
    if(!await consumeAiBudget('feedback:'+u.id,120))return failure('Muitas avaliações. Aguarde para continuar.',429);
    let proposal;
    try{proposal=readFeedbackTicket(v.ticket,u.id);}catch{return failure('Esta avaliação expirou ou não pertence à sua sessão. Faça uma nova análise.',400);}
    // O feedback só pode referenciar naturezas do catálogo atual.
    let rule=null;
    if(proposal.code){const found=await db().query('SELECT code,title,category FROM knowledge WHERE code=$1 AND active_in_catalog=true',[proposal.code]);const row=found.rows[0];if(row)rule={...row,id:'copom-feedback',officialNature:row.title};}
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
      if(/^REWRITE_/.test(error?.message||''))return failure(error.message==='REWRITE_EMPTY'?'O Gemini não retornou um texto revisado. O texto local continua disponível.':error.message==='REWRITE_WORDS_CHANGED'?'A IA tentou acrescentar, retirar ou trocar palavras. A sugestão foi rejeitada; nenhuma alteração foi aplicada ao relato.':'A IA propôs alterações incompatíveis com a preservação fiel do relato. A sugestão foi rejeitada; use a versão local.',422);
      return failure(aiFailure(error).message,503);
    }
  }

  // Gemini é EXCLUSIVO para reescrever um relato sob solicitação explícita
  // no POST /rewrite. Testes não geram texto e não consomem tokens.
  if(route==='/admin/ai/test'&&method==='POST'){
    if(!canTestGemini(u))return failure('Verificação restrita ao administrador principal.',403);
    const configured=aiStatus().configured;
    return reply({result:{resposta:configured?
      'Chave do Gemini cadastrada. O serviço de IA só será chamado ao clicar em Revisar texto com IA no relato.':
      'Chave do Gemini não configurada. A análise local continua funcionando.'}});
  }
  if((route==='/chat'||route==='/analyze')&&method==='POST'){
    const v=await input(request,32000),relato=string(v.text,8000);
    if(relato.length<3)return failure('Insira pelo menos 3 caracteres.');
    try{
      let entries,readFallback=false;
      try{
        if(bootstrapIssue)throw bootstrapIssue;
        const knowledge=await db().query('SELECT code,title,category,summary,body,tags FROM knowledge WHERE active_in_catalog=true ORDER BY title LIMIT 2000');
        entries=knowledge.rows.length?knowledge.rows:COPOM_CATALOG;
        readFallback=!knowledge.rows.length;
      }catch(error){
        console.error('Base190 local triage catalog fallback',{code:error?.code||'unknown'});
        entries=COPOM_CATALOG;readFallback=true;
      }
      // Não confundir "qual natureza?" com pergunta teórica. A pergunta pode
      // conter os fatos de uma ocorrência; complementos podem retomar o relato
      // anterior, mas casos independentes não devem misturar seus contextos.
      const intent=route==='/chat'?resolveChatIntent(relato,v.history):{type:'report',text:relato,usedHistory:false};
      const result=intent.type==='question'
        ?(answerLocally({text:relato,history:[],entries})||answerOffline({text:relato,entries}))
        :intent.type==='needs_context'
          ?{tipo:'faq',source:'local',titulo:'Informe o caso para continuar',resposta:'Ainda não há um relato anterior identificável nesta conversa. Descreva os fatos, as pessoas envolvidas e o que foi informado para receber sugestões de natureza e cinco perguntas de sondagem.'}
          :analyzeOfflineReport({text:intent.text,entries});
      if(intent.usedHistory){result.contextUsed=true;result.contextNote='Complemento analisado junto ao relato anterior desta conversa.';}
      return reply({result,degraded:readFallback,disclaimer:readFallback?
        'Triagem em contingência com as 769 naturezas do arquivo local. O banco deve ser verificado; não há sincronização de edições administrativas neste modo.':
        'Análise inteiramente local e heurística. Confira natureza, fatos e protocolo institucional. O Gemini só é utilizado mediante solicitação explícita para aprimorar a escrita.'});
    }catch(error){
      console.error('Erro na triagem local:',error?.message||error);
      return failure('Não foi possível consultar o catálogo para a triagem local. Tente novamente.',503);
    }
  }

  // Escalas: qualquer usuário autenticado pode consultar; servidor aplica RBAC em toda mutação.
  if(route==='/floor/schedules'&&method==='GET'){
    try{
      const month=new URL(request.url).searchParams.get('month')||new Date().toISOString().slice(0,7);
      return reply(await getSchedule(db(),u,month));
    }catch(e){return failure(e.message,e.status||400);}
  }
  if(route==='/floor/schedules/roles'&&method==='PATCH'){
    try{return reply(await editOperationalRole(db(),u,await input(request,1800)));}catch(e){return failure(e.message,e.status||400);}
  }
  if(route==='/floor/schedules/preferences'&&method==='PATCH'){
    try{return reply(await editSchedulePreferences(db(),u,await input(request,2000)));}catch(e){return failure(e.message,e.status||400);}
  }
  if(route==='/floor/schedules/sunday'&&method==='PATCH'){
    try{return reply(await editSundayChoice(db(),u,await input(request,1800)));}catch(e){return failure(e.message,e.status||400);}
  }
  if(route==='/floor/schedules/shift'&&method==='PATCH'){
    try{return reply(await editShift(db(),u,await input(request,1800)));}catch(e){return failure(e.message,e.status||400);}
  }
  if(route==='/floor/schedules/day'&&method==='PATCH'){
    try{return reply(await editScheduleDay(db(),u,await input(request,2200)));}catch(e){return failure(e.message,e.status||400);}
  }
  if(route==='/floor/schedules/generate'&&method==='POST'){
    try{return reply(await generateMonth(db(),u,await input(request,6000)));}catch(e){return failure(e.message,e.status||400);}
  }

  // Gestão de piso — autenticação existente; leitura e tratamento restritos à administração.
  if(route==='/floor/events'&&method==='GET'){
    if(u.role!=='admin')return reply({events:[],summary:null,canView:false});
    const [rows,counts]=await Promise.all([
      db().query('SELECT id,protocol,kind,desk,category,urgency,description,asset,status,created_at,updated_at FROM floor_events ORDER BY created_at DESC LIMIT 250'),
      db().query("SELECT kind,count(*)::int AS total FROM floor_events WHERE status<>'Resolvido' GROUP BY kind")
    ]);
    const summary={celular:0,computador:0,open:0};
    for(const row of counts.rows){summary[row.kind]=row.total;summary.open+=row.total;}
    return reply({events:rows.rows,summary,canView:true});
  }
  if(route==='/floor/events'&&method==='POST'){
    if(await isRateLimited('floor-events:'+u.id,12))return failure('Limite de 12 registros em 15 minutos. Aguarde antes de enviar novamente.',429);
    const v=await input(request,2500);
    const desk=Number(v.desk),kind=string(v.kind,20),category=string(v.category,120),
      description=string(v.description,600),asset=string(v.asset,100);
    if(!Number.isSafeInteger(desk)||desk<1||desk>999)return failure('Informe um número de PA entre 1 e 999.');
    const cellOptions=[
      'Uso de celular na bancada de atendimento','Uso de celular durante atendimento ativo',
      'Possível captura de informações da operação'
    ];
    const techOptions=['Hardware & Periféricos','Sistema & Lentidão','Rede & VoIP','Energia & Elétrica'];
    if(kind==='celular'&&!cellOptions.includes(category) || kind==='computador'&&!techOptions.includes(category) ||
      !['celular','computador'].includes(kind))return failure('Categoria de reporte inválida.');
    const urgency=kind==='computador'?string(v.urgency,40):'A verificar';
    if(kind==='computador'&&(!['Baixo','Moderado','Crítico (PA Parada)'].includes(urgency)||description.length<5))
      return failure('Informe o impacto operacional e descreva o problema com pelo menos 5 caracteres.');
    // Não guarda autor do reporte; logs do provedor, contudo, podem existir.
    const id=randomUUID(),protocol=(kind==='celular'?'COMP-':'INC-')+id.replace(/-/g,'').slice(0,12).toUpperCase();
    await db().query(`INSERT INTO floor_events
      (id,protocol,kind,desk,category,urgency,description,asset)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id,protocol,kind,desk,category,urgency,description,kind==='computador'?asset:'']);
    await recordFailure('floor-events:'+u.id);
    return reply({protocol,message:'Registro criado e disponível à gestão.'},201);
  }
  if(route==='/floor/events'&&method==='PATCH'){
    const denied=requireRole(u,true);if(denied)return denied;
    const v=await input(request,2000),id=string(v.id,50),status=string(v.status,30);
    if(!/^[0-9a-f-]{36}$/i.test(id)||!['Em atendimento','Resolvido'].includes(status))
      return failure('Identificador ou estado inválido.');
    const result=await db().query(`UPDATE floor_events SET status=$2,updated_at=now()
       WHERE id=$1 AND status<>'Resolvido' RETURNING protocol`,[id,status]);
    if(!result.rowCount)return failure('Registro inexistente ou já concluído.',404);
    await log(u.id,'floor_event_status',result.rows[0].protocol+': '+status);
    return reply({message:'Estado do evento atualizado.'});
  }

  const denied=requireRole(u,true);if(denied) return denied;
  if(route==='/admin/requests'&&method==='GET'){
    const v=await db().query('SELECT id,username,display_name,reason,status,created_at,resolved_at FROM access_requests ORDER BY created_at DESC LIMIT 250');
    return reply({requests:v.rows});
  }
  if(route==='/admin/users'&&method==='GET'){
    const v=await db().query('SELECT id,username,display_name,role,operational_role,active,created_at FROM users ORDER BY created_at DESC LIMIT 250');
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

