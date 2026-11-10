import {randomUUID} from 'node:crypto';
import {requireEditor} from './documentation-assets.js';

export const SPACE_ICONS=['📁','📚','⚖️','🛡️','🚓','📘','🧠','🗂️','🏛️','📝','🎯','🔍','💡','📊','🧩','🚨','🧭','🚦','👥','🔐','⚡','✅','📌','🗺️','📂','🗃️','⭐','🌐','🏢','🔎','🛠️'];
const allowed=new Set(SPACE_ICONS);
export function spaceName(value){
 if(typeof value!=='string')throw Object.assign(Error('Informe um nome de pasta válido.'),{status:400});
 const name=value.trim().replace(/\s+/g,' ');
 if(!name||name.length>80||/[\u0000-\u001f\u007f]/.test(name))throw Object.assign(Error('O nome da pasta deve ter entre 1 e 80 caracteres.'),{status:400});
 return name;
}
export const spaceIcon=value=>allowed.has(value)?value:'📁';
const descriptionOf=value=>String(value||'').trim().slice(0,240);
const conflict=message=>Object.assign(Error(message),{status:409});
async function inTransaction(pool,run){
 const client=await pool.connect();
 try{await client.query('BEGIN');await client.query("SELECT pg_advisory_xact_lock(hashtext('documentation-spaces'))");const result=await run(client);await client.query('COMMIT');return result;}
 catch(error){await client.query('ROLLBACK');throw error;}
 finally{client.release();}
}
export async function listDocumentationSpaces(pool){
 // A biblioteca anterior armazenava somente a string "space" em cada documento.
 // Esta reconciliação preserva os espaços legados e também os espaços vazios recém-criados.
 await pool.query("INSERT INTO documentation_spaces(name) SELECT DISTINCT space FROM documentation_pages WHERE length(trim(space))>0 ON CONFLICT(name) DO NOTHING");
 const result=await pool.query('SELECT s.name,s.icon,s.description,s.updated_at,COUNT(p.id)::int AS page_count FROM documentation_spaces s LEFT JOIN documentation_pages p ON p.space=s.name GROUP BY s.name,s.icon,s.description,s.updated_at ORDER BY lower(s.name),s.name');
 return result.rows;
}
export async function createDocumentationSpace(pool,user,value){
 requireEditor(user);
 const name=spaceName(value?.name),icon=spaceIcon(value?.icon),description=descriptionOf(value?.description);
 return inTransaction(pool,async client=>{
  if((await client.query('SELECT 1 FROM documentation_spaces WHERE lower(name)=lower($1) LIMIT 1',[name])).rowCount)throw conflict('Já existe uma pasta com esse nome.');
  const result=await client.query('INSERT INTO documentation_spaces(name,icon,description) VALUES($1,$2,$3) RETURNING *',[name,icon,description]);
  await client.query('INSERT INTO audit_log(id,actor_id,action,target) VALUES($1,$2,$3,$4)',[randomUUID(),user.id,'documentation_space_create',name]);
  return {space:result.rows[0]};
 });
}
export async function updateDocumentationSpace(pool,user,value){
 requireEditor(user);
 const oldName=spaceName(value?.oldName),name=spaceName(value?.name),icon=spaceIcon(value?.icon),description=descriptionOf(value?.description);
 return inTransaction(pool,async client=>{
  const found=await client.query('SELECT * FROM documentation_spaces WHERE name=$1 FOR UPDATE',[oldName]);
  if(!found.rowCount)throw Object.assign(Error('Pasta não encontrada. Atualize a biblioteca.'),{status:404});
  if(name!==oldName&&(await client.query('SELECT 1 FROM documentation_spaces WHERE lower(name)=lower($1) LIMIT 1',[name])).rowCount)throw conflict('Já existe uma pasta com esse nome.');
  if(name===oldName&&icon===found.rows[0].icon&&description===found.rows[0].description)return {space:found.rows[0],moved:0,unchanged:true};
  const result=await client.query('UPDATE documentation_spaces SET name=$2,icon=$3,description=$4,updated_at=now() WHERE name=$1 RETURNING *',[oldName,name,icon,description]);
  let moved=[];
  if(name!==oldName){
   // A mudança de pasta é versionada para que editores abertos não restaurem o nome antigo silenciosamente.
   moved=(await client.query('UPDATE documentation_pages SET space=$2,revision=revision+1,updated_at=now() WHERE space=$1 RETURNING *',[oldName,name])).rows;
   for(const page of moved){
    await client.query('INSERT INTO documentation_versions(page_id,revision,title,content,actor_id,metadata) VALUES($1,$2,$3,$4,$5,$6)',
     [page.id,page.revision,page.title,page.content,user.id,JSON.stringify({space:name,status:page.status,parent_id:page.parent_id||null,nexus_meta:page.nexus_meta||{},reason:'folder_rename'})]);
    // Imagens privadas precisam de referência na nova revisão (inclusive as de capa).
    await client.query('INSERT INTO documentation_asset_refs(asset_id,page_id,revision) SELECT asset_id,page_id,$3 FROM documentation_asset_refs WHERE page_id=$1 AND revision=$2 ON CONFLICT DO NOTHING',
      [page.id,page.revision-1,page.revision]);
    await client.query('INSERT INTO documentation_events(id,actor_id,page_id,action,revision) VALUES($1,$2,$3,$4,$5)',
     [randomUUID(),user.id,page.id,'space_rename',page.revision]);
   }
   // Drafts continuam disponíveis; só avança a revisão-base se o draft estava atualizado.
   for(const page of moved){
    await client.query("UPDATE documentation_drafts SET payload=jsonb_set(payload,'{baseRevision}',to_jsonb($2::int),true),updated_at=now() WHERE page_key=$1 AND (payload->>'baseRevision')::int=$3",
     [page.id,page.revision,page.revision-1]);
   }
   await client.query("UPDATE documentation_drafts SET payload=jsonb_set(payload,'{space}',to_jsonb($2::text),true),updated_at=now() WHERE payload->>'space'=$1",[oldName,name]);
  }
  await client.query('INSERT INTO audit_log(id,actor_id,action,target) VALUES($1,$2,$3,$4)',
   [randomUUID(),user.id,name!==oldName?'documentation_space_rename':'documentation_space_style',oldName+' -> '+name]);
  return {space:result.rows[0],moved:moved.length};
 });
}
