import {randomUUID} from 'node:crypto';
import {ADMIN_LOGIN,passwordHash,token,validLogin,string} from './security.js';

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
  requireManager(actor);
  const [requests,users]=await Promise.all([
    pool.query('SELECT id,username,display_name,reason,status,created_at,resolved_at FROM access_requests ORDER BY CASE WHEN status=$1 THEN 0 ELSE 1 END,created_at DESC LIMIT 250',['pending']),
    pool.query('SELECT id,username,display_name,role,operational_role,active,created_at FROM users ORDER BY lower(display_name),username LIMIT 400')
  ]);
  return {requests:requests.rows,users:users.rows,permission:actorRole(actor)};
}
export async function decideRequest(pool,actor,value){
  requireManager(actor);
  const id=requireId(value?.id),action=value?.action;
  if(!['approve','reject'].includes(action))throw problem('Decisão inválida.');
  const role=value?.role||'attendant';
  if(action==='approve')requireAssignable(actor,role);
  const temporaryPassword=action==='approve'?token().slice(0,24):null;
  const hash=temporaryPassword?await passwordHash(temporaryPassword):null;
  return transact(pool,async client=>{
    const rec=(await client.query('SELECT * FROM access_requests WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if(!rec||rec.status!=='pending')throw problem('A solicitação não está mais pendente.',409);
    if(action==='approve'){
      await client.query('INSERT INTO users(id,username,display_name,password_hash,role,operational_role,active,must_change_password) VALUES($1,$2,$3,$4,$5,$6,true,true)',
        [randomUUID(),rec.username,rec.display_name,hash,'user',role]);
    }
    await client.query('UPDATE access_requests SET status=$2,resolved_at=now() WHERE id=$1',[id,action==='approve'?'approved':'rejected']);
    await audit(client,actor,'access_request_'+action,rec.username+(action==='approve'?' → '+role:''));
    return {message:action==='approve'?'Acesso aprovado e cargo atribuído.':'Solicitação recusada.',temporaryPassword,username:rec.username};
  });
}
export async function createAccount(pool,actor,value){
  requireManager(actor);
  const username=string(value?.username,40).toLowerCase(),name=string(value?.name,100),role=value?.role||'attendant';
  if(!validLogin(username)||username===ADMIN_LOGIN||name.length<3)throw problem('Informe nome e usuário válidos.');
  requireAssignable(actor,role);
  const temporaryPassword=token().slice(0,24),hash=await passwordHash(temporaryPassword);
  return transact(pool,async client=>{
    await client.query('INSERT INTO users(id,username,display_name,password_hash,role,operational_role,active,must_change_password) VALUES($1,$2,$3,$4,$5,$6,true,true)',
      [randomUUID(),username,name,hash,'user',role]);
    await audit(client,actor,'access_account_created',username+' → '+role);
    return {message:'Usuário cadastrado. Entregue a senha provisória em canal seguro.',username,temporaryPassword};
  });
}
export async function updateAccount(pool,actor,value){
  requireManager(actor);
  const id=requireId(value?.id),action=value?.action;
  if(!['role','status','reset'].includes(action))throw problem('Ação inválida.');
  if(action==='role')requireAssignable(actor,value?.role);
  if(action==='status'&&typeof value?.active!=='boolean')throw problem('Estado de acesso inválido.');
  const temporaryPassword=action==='reset'?token().slice(0,24):null;
  const hash=temporaryPassword?await passwordHash(temporaryPassword):null;
  return transact(pool,async client=>{
    const target=(await client.query('SELECT id,username,role,operational_role,active FROM users WHERE id=$1 FOR UPDATE',[id])).rows[0];
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
    await client.query('UPDATE users SET password_hash=$2,must_change_password=true WHERE id=$1',[id,hash]);
    await client.query('UPDATE sessions SET revoked_at=now() WHERE user_id=$1',[id]);
    await audit(client,actor,'access_password_reset',target.username);
    return {message:'Senha provisória gerada e sessões encerradas.',temporaryPassword,username:target.username};
  });
}
