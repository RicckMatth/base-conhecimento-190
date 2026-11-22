import {randomUUID} from 'node:crypto';
import {ADMIN_LOGIN,passwordHash,token,validPmCivilLogin,string} from './security.js';
import {CAN_RESET_ROLES,issueSetupCode} from './password-flows.js';

export const MANAGED_ROLES=Object.freeze(['attendant','manager','quality_analyst','coordinator']);
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const problem=(message,status=400)=>Object.assign(new Error(message),{status});
export const actorRole=actor=>actor?.operational_role||'attendant';
export const canManageAccess=actor=>Boolean(actor&&!actor.must_change_password&&['dev','coordinator'].includes(actorRole(actor)));
export const canAssignRole=(actor,role)=>canManageAccess(actor)&&MANAGED_ROLES.includes(role)&&(actorRole(actor)==='dev'||role!=='coordinator');
export function canManageAccount(actor,target){
  return canManageAccess(actor)&&target&&target.role!=='admin'&&target.username!==ADMIN_LOGIN&&target.id!==actor.id&&
    target.operational_role!=='dev'&&(actorRole(actor)==='dev'||target.operational_role!=='coordinator');
}
const requireManager=actor=>{if(!canManageAccess(actor))throw problem('Somente Coordenador e Dev podem gerenciar acessos.',403);};
const requireId=id=>{if(!ID.test(String(id||'')))throw problem('Identificador inválido.');return id;};
const requireAssignable=(actor,role)=>{if(!canAssignRole(actor,role))throw problem('Você não pode atribuir este cargo.',403);};
async function transact(pool,callback){
  const client=await pool.connect();
  try{await client.query('BEGIN');const result=await callback(client);await client.query('COMMIT');return result;}
  catch(error){await client.query('ROLLBACK');throw error;}
  finally{client.release();}
}
async function audit(client,actor,action,target){
  await client.query('INSERT INTO audit_log(id,actor_id,action,target) VALUES($1,$2,$3,$4)',
    [randomUUID(),actor.id,action,String(target).slice(0,200)]);
}
export async function listAccess(pool,actor){
  const level=actorRole(actor),canAdmin=canManageAccess(actor);
  if(!actor||actor.must_change_password||(!canAdmin&&!CAN_RESET_ROLES.includes(level)))
    throw problem('Você não tem permissão para gerenciar acessos.',403);
  const manager=level==='manager';
  const [req,users,resets]=await Promise.all([
    canAdmin?pool.query('SELECT id,username,display_name,reason,status,created_at,resolved_at FROM access_requests ORDER BY CASE WHEN status=$1 THEN 0 ELSE 1 END,created_at DESC LIMIT 250',['pending']):Promise.resolve({rows:[]}),
    pool.query("SELECT id,username,display_name,role,operational_role,active,password_initialized,created_at FROM users"+
      (manager?" WHERE operational_role='attendant' AND role='user'":"")+
      " ORDER BY lower(display_name),username LIMIT 400"),
    pool.query(
      "SELECT r.id,r.status,r.created_at,r.reviewed_at,u.username,u.display_name,u.operational_role,u.active "+
      "FROM password_reset_requests r JOIN users u ON u.id=r.user_id "+
      (manager?"WHERE u.operational_role='attendant' AND u.role='user' ":"")+
      "ORDER BY CASE WHEN r.status='pending' THEN 0 ELSE 1 END,r.created_at DESC LIMIT 200")
  ]);
  return {requests:req.rows,users:users.rows,resetRequests:resets.rows,
    permission:level,canCreateUsers:canAdmin};
}
export async function decideRequest(pool,actor,value){
  requireManager(actor);
  const id=requireId(value?.id),action=value?.action;
  if(!['approve','reject'].includes(action))throw problem('Decisão inválida.');
  const role=value?.role||'attendant';
  if(action==='approve')requireAssignable(actor,role);
  return transact(pool,async client=>{
    const rec=(await client.query('SELECT * FROM access_requests WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if(!rec||rec.status!=='pending')throw problem('A solicitação não está mais pendente.',409);
    let setupCode=null,temporaryPassword=null;
    const isMicrosoft=/^ms-[a-f0-9]{32}$/.test(rec.username);
    if(action==='approve'){
      if(!validPmCivilLogin(rec.username)&&!isMicrosoft)
        throw problem('O acesso solicitado não é uma identidade PM Civil autorizada.',400);
      const accountId=randomUUID();
      if(isMicrosoft){
        temporaryPassword=token().slice(0,24);
        const hash=await passwordHash(temporaryPassword);
        await client.query('INSERT INTO users(id,username,display_name,password_hash,role,operational_role,active,must_change_password) VALUES($1,$2,$3,$4,$5,$6,true,true)',
          [accountId,rec.username,rec.display_name,hash,'user',role]);
      }else{
        const hash=await passwordHash(token());
        await client.query('INSERT INTO users(id,username,display_name,password_hash,role,operational_role,active,must_change_password,password_initialized) VALUES($1,$2,$3,$4,$5,$6,true,false,false)',
          [accountId,rec.username,rec.display_name,hash,'user',role]);
        setupCode=await issueSetupCode(client,accountId,actor.id,'activation');
      }
    }
    await client.query('UPDATE access_requests SET status=$2,resolved_at=now() WHERE id=$1',[id,action==='approve'?'approved':'rejected']);
    await audit(client,actor,'access_request_'+action,rec.username+(action==='approve'?' → '+role:''));
    return {message:action==='approve'?'Acesso autorizado e cargo atribuído.':'Solicitação recusada.',
      setupCode,temporaryPassword,username:rec.username};
  });
}
export async function createAccount(pool,actor,value){
  requireManager(actor);
  const username=typeof value?.username==='string'?value.username.trim().toLowerCase():'',name=string(value?.name,100),role=value?.role||'attendant';
  if(!validPmCivilLogin(username)||username===ADMIN_LOGIN||name.length<3)
    throw problem('Informe um acesso PM Civil válido e o nome do profissional.');
  requireAssignable(actor,role);
  const hash=await passwordHash(token());
  return transact(pool,async client=>{
    const id=randomUUID();
    await client.query('INSERT INTO users(id,username,display_name,password_hash,role,operational_role,active,must_change_password,password_initialized) VALUES($1,$2,$3,$4,$5,$6,true,false,false)',
      [id,username,name,hash,'user',role]);
    const setupCode=await issueSetupCode(client,id,actor.id,'activation');
    await audit(client,actor,'access_pm_civil_pre_authorized',username+' → '+role);
    return {message:'Acesso PM Civil pré-autorizado. Encaminhe o código de ativação ao profissional por canal seguro.',username,setupCode};
  });
}
export async function updateAccount(pool,actor,value){
  requireManager(actor);
  const id=requireId(value?.id),action=value?.action;
  if(!['role','status','reset','activation'].includes(action))throw problem('Ação inválida.');
  if(action==='role')requireAssignable(actor,value?.role);
  if(action==='status'&&typeof value?.active!=='boolean')throw problem('Estado de acesso inválido.');
  return transact(pool,async client=>{
    const target=(await client.query('SELECT id,username,role,operational_role,active,password_initialized FROM users WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if(!target)throw problem('Usuário não encontrado.',404);
    if(!canManageAccount(actor,target))throw problem('Conta protegida ou cargo fora da sua permissão.',403);
    if(action==='role'){
      await client.query('UPDATE users SET operational_role=$2 WHERE id=$1',[id,value.role]);
      await client.query('UPDATE sessions SET revoked_at=now() WHERE user_id=$1',[id]);
      await audit(client,actor,'access_role_changed',target.username+': '+target.operational_role+' → '+value.role);
      return {message:'Cargo atualizado. O usuário precisará entrar novamente.'};
    }
    if(action==='status'){
      await client.query('UPDATE users SET active=$2 WHERE id=$1',[id,value.active]);
      if(!value.active)await client.query('UPDATE sessions SET revoked_at=now() WHERE user_id=$1',[id]);
      await audit(client,actor,value.active?'access_account_enabled':'access_account_disabled',target.username);
      return {message:value.active?'Acesso liberado.':'Acesso bloqueado e sessões encerradas.'};
    }
    if(action==='activation'){
      if(target.password_initialized||!validPmCivilLogin(target.username))throw problem('O acesso já foi ativado.',409);
      const setupCode=await issueSetupCode(client,target.id,actor.id,'activation');
      await audit(client,actor,'access_activation_reissued',target.username);
      return {message:'Novo código de ativação gerado. Envie ao usuário por canal seguro.',username:target.username,setupCode};
    }
    if(!validPmCivilLogin(target.username))throw problem('O reset local só é permitido para acessos PM Civil.',400);
    // Ações administrativas não redefinem senhas diretamente; criam uma solicitação para revisão.
    await client.query(
      "INSERT INTO password_reset_requests(id,user_id,status) VALUES($1,$2,'pending') "+
      "ON CONFLICT(user_id) WHERE status='pending' DO NOTHING",[randomUUID(),target.id]);
    await audit(client,actor,'password_reset_requested_by_manager',target.username);
    return {message:'Solicitação de redefinição registrada. Aprove-a na seção Recuperação de senhas.'};
  });
}
