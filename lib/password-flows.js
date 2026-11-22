import { randomUUID } from 'node:crypto';
import { ADMIN_LOGIN, token, digest, passwordHash, validPmCivilLogin } from './security.js';

export const CAN_RESET_ROLES = Object.freeze(['dev', 'coordinator', 'manager']);
const problem = (message, status=400) => Object.assign(new Error(message),{status});
const UID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STRONG_PASSWORD = /^(?=.{12,128}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/s;

export function validateNewPassword(password) {
  return typeof password === 'string' && STRONG_PASSWORD.test(password);
}
export function canReviewReset(actor, target) {
  if (!actor || actor.must_change_password || !CAN_RESET_ROLES.includes(actor.operational_role)) return false;
  if (!target || !target.active || target.role === 'admin' || target.username === ADMIN_LOGIN ||
      target.id === actor.id || target.operational_role === 'dev') return false;
  if (actor.operational_role === 'dev') return true;
  if (actor.operational_role === 'coordinator') return target.operational_role !== 'coordinator';
  return target.operational_role === 'attendant';
}
export async function issueSetupCode(client, userId, actorId, purpose='activation') {
  if (!UID.test(userId) || !UID.test(actorId) || !['activation','reset'].includes(purpose)) throw problem('Solicitação inválida.');
  const code = token();
  await client.query(
    "INSERT INTO password_setup_codes(user_id,code_hash,purpose,expires_at,issued_by) " +
    "VALUES($1,$2,$3,now()+interval '24 hours',$4) " +
    "ON CONFLICT(user_id) DO UPDATE SET code_hash=EXCLUDED.code_hash,purpose=EXCLUDED.purpose, " +
    "expires_at=EXCLUDED.expires_at,issued_by=EXCLUDED.issued_by,created_at=now()",
    [userId,digest(code),purpose,actorId]);
  return code;
}
export async function requestPasswordReset(pool, value, limits) {
  const username=String(value?.username||'').trim().toLowerCase();
  // No account enumeration: the public response is always identical.
  const answer={message:'Se o acesso PM Civil estiver cadastrado, a solicitação será encaminhada ao responsável.'};
  if (!validPmCivilLogin(username)) return answer;
  if (await limits.isRateLimited('reset-request:'+username,3)) return answer;
  await limits.recordFailure('reset-request:'+username);
  const user=(await pool.query(
    'SELECT id,active,password_initialized FROM users WHERE username=$1',[username])).rows[0];
  if (!user?.active || !user.password_initialized) return answer;
  await pool.query(
    "INSERT INTO password_reset_requests(id,user_id,status) VALUES($1,$2,'pending') " +
    "ON CONFLICT(user_id) WHERE status='pending' DO NOTHING",
    [randomUUID(),user.id]);
  return answer;
}
export async function reviewPasswordReset(pool, actor, data) {
  const id=String(data?.id||''), decision=data?.action;
  if (!UID.test(id) || !['approve','reject'].includes(decision)) throw problem('Decisão inválida.');
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const req=(await client.query(
      "SELECT r.id,r.user_id,r.status,u.username,u.role,u.operational_role,u.active " +
      "FROM password_reset_requests r JOIN users u ON u.id=r.user_id " +
      "WHERE r.id=$1 FOR UPDATE OF r", [id])).rows[0];
    if (!req || req.status !== 'pending') throw problem('Solicitação indisponível.',409);
    if (!canReviewReset(actor, {...req,id:req.user_id})) throw problem('Acesso não autorizado.',403);
    let code=null;
    if (decision === 'approve') {
      code=await issueSetupCode(client,req.user_id,actor.id,'reset');
      await client.query('UPDATE sessions SET revoked_at=now() WHERE user_id=$1',[req.user_id]);
    }
    await client.query(
      "UPDATE password_reset_requests SET status=$2,reviewed_by=$3,reviewed_at=now() WHERE id=$1",
      [id,decision==='approve'?'approved':'rejected',actor.id]);
    await client.query(
      'INSERT INTO audit_log(id,actor_id,action,target) VALUES($1,$2,$3,$4)',
      [randomUUID(),actor.id,'password_reset_'+decision,req.username]);
    await client.query('COMMIT');
    return {message:decision==='approve'?'Reset autorizado. Encaminhe o código ao profissional por canal seguro.':'Solicitação de reset recusada.',
      username:req.username, setupCode:code};
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
export async function initializePassword(pool, data, limits) {
  const username=String(data?.username||'').trim().toLowerCase();
  const code=typeof data?.code==='string'?data.code.trim():'';
  const next=typeof data?.password==='string'?data.password:'';
  if (!validPmCivilLogin(username) || !validateNewPassword(next) || next!==data?.confirm || !/^[A-Za-z0-9_-]{43}$/.test(code))
    throw problem('Confira o acesso PM Civil, o código e a nova senha.',400);
  const key='setup:'+username;
  if (await limits.isRateLimited(key,5)) throw problem('Muitas tentativas. Tente novamente mais tarde.',429);
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const user=(await client.query(
      "SELECT id,active,password_initialized FROM users WHERE username=$1 FOR UPDATE",[username])).rows[0];
    const entry=user?(await client.query(
      "SELECT code_hash,purpose,expires_at FROM password_setup_codes WHERE user_id=$1 FOR UPDATE",[user.id])).rows[0]:null;
    const valid=Boolean(user?.active && entry &&
      new Date(entry.expires_at).getTime()>Date.now() && digest(code)===entry.code_hash &&
      (entry.purpose==='reset' || (entry.purpose==='activation' && !user.password_initialized)));
    if (!valid) {
      await client.query('ROLLBACK');
      await limits.recordFailure(key);
      throw problem('Código de ativação inválido ou expirado. Peça um novo código ao responsável.',403);
    }
    const hash=await passwordHash(next);
    await client.query(
      'UPDATE users SET password_hash=$2,password_initialized=true,must_change_password=false WHERE id=$1',
      [user.id,hash]);
    await client.query('DELETE FROM password_setup_codes WHERE user_id=$1',[user.id]);
    await client.query('UPDATE sessions SET revoked_at=now() WHERE user_id=$1',[user.id]);
    if(entry.purpose==='reset') await client.query(
      "UPDATE password_reset_requests SET status='completed' WHERE user_id=$1 AND status='approved'",[user.id]);
    await client.query(
      'INSERT INTO audit_log(id,actor_id,action,target) VALUES($1,$2,$3,$4)',
      [randomUUID(),user.id,entry.purpose==='reset'?'password_reset_completed':'password_activation_completed',username]);
    await client.query('COMMIT');
    await limits.clearFailure(key);
    return {message:'Senha criada com sucesso. Entre com seu acesso PM Civil e a nova senha.'};
  } catch(error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally {client.release();}
}
