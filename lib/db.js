import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { ADMIN_LOGIN, passwordHash } from './security.js';
import { CEREBRO_190 } from './cerebro.js';
import { EXTRA_RULES } from './extras.js';
const { Pool }=pg;
let pool, ready;
export function db(){
  if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL não configurada.');
  if(!pool) pool=new Pool({connectionString:process.env.DATABASE_URL,max:2,connectionTimeoutMillis:8000,idleTimeoutMillis:10000});
  return pool;
}
export async function prepare(){
  if(!ready) {
    ready=(async()=>{
      const p=db();
      await p.query(`CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY, username text NOT NULL UNIQUE, display_name text NOT NULL,
        password_hash text NOT NULL, role text NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
        active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
      )`);
      await p.query(`CREATE TABLE IF NOT EXISTS sessions (
        token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at timestamptz NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
      )`);
      await p.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false");
      await p.query('CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id)');
      await p.query(`CREATE TABLE IF NOT EXISTS access_requests (
        id uuid PRIMARY KEY, username text NOT NULL UNIQUE, display_name text NOT NULL,
        reason text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending','approved','rejected')),
        created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz
      )`);
      await p.query(`CREATE TABLE IF NOT EXISTS auth_limits (
        key text PRIMARY KEY, failures int NOT NULL DEFAULT 0, window_start timestamptz NOT NULL DEFAULT now()
      )`);
      await p.query(`CREATE TABLE IF NOT EXISTS knowledge (
        id uuid PRIMARY KEY, code text NOT NULL UNIQUE, title text NOT NULL, category text NOT NULL,
        priority text NOT NULL, summary text NOT NULL, body text NOT NULL,
        tags jsonb NOT NULL DEFAULT '[]'::jsonb, revision int NOT NULL DEFAULT 1,
        author_id uuid REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      )`);
      await p.query(`CREATE TABLE IF NOT EXISTS knowledge_revisions (
        id uuid PRIMARY KEY, knowledge_id uuid NOT NULL REFERENCES knowledge(id) ON DELETE CASCADE,
        revision int NOT NULL, snapshot jsonb NOT NULL, actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
      await p.query(`CREATE TABLE IF NOT EXISTS custom_rules (
        id uuid PRIMARY KEY, code text NOT NULL UNIQUE, definition jsonb NOT NULL,
        author_id uuid REFERENCES users(id) ON DELETE SET NULL, created_at timestamptz DEFAULT now()
      )`);
      await p.query(`CREATE TABLE IF NOT EXISTS audit_log (
        id uuid PRIMARY KEY, actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
        action text NOT NULL, target text, at timestamptz NOT NULL DEFAULT now()
      )`);
      // Semente demonstrativa. Evita criar direitos administrativos por seed do catálogo.
      for (const r of [...CEREBRO_190.regrasBase, ...EXTRA_RULES]) {
        await p.query(`INSERT INTO knowledge (id,code,title,category,priority,summary,body,tags)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb) ON CONFLICT(code) DO NOTHING`,
        [randomUUID(),r.code,r.officialNature,r.category,r.priority,r.explanation,
          ['Ficha orientativa: confirmar natureza, código e prioridade no protocolo institucional.', r.explanation, 'Base legal sugerida: '+(r.legalBase||'A validar'),
            'Perguntas de triagem:',''+(r.triageQuestions||[]).map(q=>'• '+q).join('\n'),
            'Máscara orientativa:',r.dispatchMask||''].join('\n\n'),
          JSON.stringify((r.boostKeywords||[]).slice(0,12))]);
      }
      return true;
    })().catch(e=>{ready=null;throw e});
  }
  return ready;
}
export async function ensureAdmin(){
  const pass=process.env.ADMIN_INITIAL_PASSWORD;
  if(!pass) return;
  const exists=await db().query('SELECT id FROM users WHERE username=$1',[ADMIN_LOGIN]);
  if(exists.rowCount) return;
  if(pass.length<12) throw new Error('Senha inicial de administrador precisa ter ao menos 12 caracteres.');
  const hash=await passwordHash(pass);
  await db().query(`INSERT INTO users(id,username,display_name,password_hash,role,must_change_password)
    VALUES ($1,$2,'Administrador principal',$3,'admin',true) ON CONFLICT(username) DO NOTHING`,
    [randomUUID(),ADMIN_LOGIN,hash]);
}
export async function log(actor,action,target=''){
  await db().query('INSERT INTO audit_log(id,actor_id,action,target) VALUES($1,$2,$3,$4)',[randomUUID(),actor||null,action,String(target).slice(0,200)]);
}
export async function isRateLimited(key,max=6){
  const res=await db().query(`SELECT failures, window_start > now()-interval '15 minutes' AS valid FROM auth_limits WHERE key=$1`,[key]);
  return res.rowCount>0 && res.rows[0].valid && res.rows[0].failures>=max;
}
export async function recordFailure(key){
  await db().query(`INSERT INTO auth_limits(key,failures,window_start) VALUES($1,1,now())
    ON CONFLICT(key) DO UPDATE SET failures=CASE WHEN auth_limits.window_start < now()-interval '15 minutes'
    THEN 1 ELSE auth_limits.failures+1 END,
    window_start=CASE WHEN auth_limits.window_start < now()-interval '15 minutes'
    THEN now() ELSE auth_limits.window_start END`,[key]);
}
export async function clearFailure(key){await db().query('DELETE FROM auth_limits WHERE key=$1',[key]);}
