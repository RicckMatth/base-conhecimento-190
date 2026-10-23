import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt=promisify(scryptCallback);
export { ADMIN_LOGIN } from './permissions.js';
export const COOKIE_NAME='base190_session';
export const HOURS=8;
export const uid=()=>randomUUID();
export const token=()=>randomBytes(32).toString('base64url');
export const digest=(v)=>createHash('sha256').update(String(v)).digest('hex');
export async function passwordHash(pass) {
  const salt=randomBytes(16).toString('hex');
  const hash=await scrypt(pass,salt,64);
  return 'scrypt:'+salt+':'+hash.toString('hex');
}
export async function passwordVerify(pass,stored) {
  try {
    const [algorithm,salt,hex]=stored.split(':');
    if(algorithm!=='scrypt'||!salt||!hex) return false;
    const calc=await scrypt(pass,salt,64);
    const original=Buffer.from(hex,'hex');
    return original.length===calc.length && timingSafeEqual(original,calc);
  } catch { return false; }
}
export const validLogin=(s)=>/^[a-z0-9._-]{4,40}$/.test(String(s||''));
export const string=(x,max=200)=>typeof x==='string'?x.trim().slice(0,max):'';
export const cookieSettings={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:HOURS*3600};
export function sameOrigin(req){
  const origin=req.headers.get('origin');
  if(!origin) return false;
  try { return new URL(origin).host === new URL(req.url).host && new URL(origin).protocol==='https:' || (process.env.NODE_ENV!=='production' && new URL(origin).origin === new URL(req.url).origin); }
  catch { return false; }
}
export async function input(req,limit=20000){
  if(!(req.headers.get('content-type')||'').startsWith('application/json')) throw new Error('Formato JSON obrigatório.');
  const txt=await req.text();
  if(txt.length>limit) throw new Error('Conteúdo excede o limite permitido.');
  const v=JSON.parse(txt); if(!v || typeof v!=='object' || Array.isArray(v)) throw new Error('Objeto JSON inválido.');
  return v;
}
