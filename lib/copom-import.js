// Migração não destrutiva: registros históricos seguem na tabela com active_in_catalog=false.
// Usuários continuam tendo acesso a revisões, auditoria e documentação independente.
import {randomUUID} from 'node:crypto';
import {COPOM_CATALOG} from './copom-catalog.js';

const VERSION='copom-csv-v2-769-2026-11';
export async function syncCopomCatalog(pool,{catalog=COPOM_CATALOG}={}){
 if(!Array.isArray(catalog)||catalog.length!==769||new Set(catalog.map(r=>r.code)).size!==769)
  throw new Error('Importação abortada: esperadas 769 naturezas únicas.');
 // Todas as etapas do importador são serializadas e atômicas.
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  await c.query("SELECT pg_advisory_xact_lock(hashtext('base190-copom-catalog-v2'))");
  await c.query("CREATE TABLE IF NOT EXISTS copom_catalog_migrations(version text PRIMARY KEY, imported_count integer NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())");
  const stamped=await c.query('SELECT imported_count FROM copom_catalog_migrations WHERE version=$1',[VERSION]);
  if(stamped.rowCount){
   if(Number(stamped.rows[0].imported_count)!==769)throw new Error('Estado da migração do catálogo inconsistente.');
   await c.query('COMMIT');
   return {changed:false,count:769};
  }
  // Desativa conteúdo anterior, preservando todas as fichas e seus históricos.
  await c.query('UPDATE knowledge SET active_in_catalog=false WHERE active_in_catalog=true');
  await c.query('UPDATE custom_rules SET active_in_catalog=false WHERE active_in_catalog=true');
  let inserted=0;
  for(let i=0;i<catalog.length;i+=140){
   const batch=catalog.slice(i,i+140).map(e=>({
    id:randomUUID(),code:e.code,title:e.title,category:e.category,priority:e.priority,
    summary:e.summary,body:e.body,tags:e.tags
   }));
   const result=await c.query(
    "INSERT INTO knowledge(id,code,title,category,priority,summary,body,tags,active_in_catalog) "+
    "SELECT id,code,title,category,priority,summary,body,tags,true FROM jsonb_to_recordset($1::jsonb) AS r(id uuid,code text,title text,category text,priority text,summary text,body text,tags jsonb) "+
    "ON CONFLICT(code) DO UPDATE SET title=EXCLUDED.title,category=EXCLUDED.category,priority=EXCLUDED.priority,summary=EXCLUDED.summary,body=EXCLUDED.body,tags=EXCLUDED.tags,active_in_catalog=true,updated_at=now() RETURNING code",
    [JSON.stringify(batch)]
   );
   inserted+=result.rowCount;
  }
  if(inserted!==769)throw new Error('Importação incompleta: '+inserted+' de 769 naturezas.');
  await c.query('INSERT INTO copom_catalog_migrations(version,imported_count) VALUES($1,$2)',[VERSION,inserted]);
  await c.query('INSERT INTO audit_log(id,actor_id,action,target) VALUES($1,NULL,$2,$3)',[randomUUID(),'copom_catalog_replaced',VERSION+': '+inserted+' fichas; catálogo anterior inativo']);
  await c.query('COMMIT');
  return {changed:true,count:inserted};
 }catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}
}
