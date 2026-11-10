import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {prepareDocumentationSchema} from '../lib/documentation-schema.js';
import {listDocumentationSpaces,createDocumentationSpace,updateDocumentationSpace} from '../lib/documentation-spaces.js';
import {normalizeNexusMeta,coverAssetIds} from '../lib/nexus-docs.js';

const admin={id:randomUUID(),role:'admin'},reader={id:randomUUID(),role:'user'};
test('pastas: migração de categorias legadas, criação, edição, revisão e proteção de anexos',async()=>{
 const pg=new PGlite(),query=(q,a)=>pg.query(q,a),pool={query,connect:async()=>({query,release(){}})};
 try{
  await pg.exec("CREATE TABLE users(id uuid PRIMARY KEY);CREATE TABLE audit_log(id uuid PRIMARY KEY,actor_id uuid,action text,target text);CREATE TABLE documentation_pages(id uuid PRIMARY KEY,title text NOT NULL,space text NOT NULL,content text NOT NULL DEFAULT '',status text NOT NULL DEFAULT 'draft',revision integer NOT NULL DEFAULT 1,author_id uuid REFERENCES users(id),updated_at timestamptz NOT NULL DEFAULT now());CREATE TABLE documentation_versions(page_id uuid REFERENCES documentation_pages(id) ON DELETE CASCADE,revision integer,content text NOT NULL,title text NOT NULL,actor_id uuid REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(page_id,revision));");
  await query('INSERT INTO users(id) VALUES($1),($2)',[admin.id,reader.id]);
  const pageId=randomUUID(),assetId=randomUUID();
  await query('INSERT INTO documentation_pages(id,title,space,content,status,author_id) VALUES($1,$2,$3,$4,$5,$6)',[pageId,'Orientações 190','Legado','<p>Conteúdo antigo</p>','published',admin.id]);
  await prepareDocumentationSchema(pool);
  await query('INSERT INTO documentation_versions(page_id,revision,title,content,actor_id) VALUES($1,1,$2,$3,$4)',[pageId,'Orientações 190','<p>Conteúdo antigo</p>',admin.id]);
  await query('INSERT INTO documentation_assets(id,pathname,mime,size,width,height,digest,creator_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[assetId,'docs/test-'+assetId+'.webp','image/webp',100,100,100,'fakehash',admin.id]);
  await query('INSERT INTO documentation_asset_refs(asset_id,page_id,revision) VALUES($1,$2,1)',[assetId,pageId]);
  await query("INSERT INTO documentation_drafts(user_id,page_key,payload) VALUES($1,$2,$3::jsonb)",[admin.id,pageId,JSON.stringify({title:'Orientações 190',space:'Legado',baseRevision:1,content:'<p>Rascunho conservado</p>'})]);
  const initial=await listDocumentationSpaces(pool);assert.ok(initial.some(s=>s.name==='Legado'));
  await assert.rejects(createDocumentationSpace(pool,reader,{name:'Nova'}),e=>e.status===403);
  const created=await createDocumentationSpace(pool,admin,{name:'Nova pasta',icon:'⚖️',description:'Jurídico'});
  assert.equal(created.space.icon,'⚖️');
  await assert.rejects(createDocumentationSpace(pool,admin,{name:'nova pasta'}),e=>e.status===409);
  const updated=await updateDocumentationSpace(pool,admin,{oldName:'Legado',name:'Protocolos 190',icon:'🛡️',description:'Procedimentos e guias'});
  assert.equal(updated.moved,1);
  const page=(await query('SELECT * FROM documentation_pages WHERE id=$1',[pageId])).rows[0];
  assert.equal(page.space,'Protocolos 190');assert.equal(page.revision,2);assert.equal(page.content,'<p>Conteúdo antigo</p>');
  assert.equal((await query('SELECT count(*)::int AS n FROM documentation_versions WHERE page_id=$1',[pageId])).rows[0].n,2);
  assert.equal((await query('SELECT count(*)::int AS n FROM documentation_asset_refs WHERE page_id=$1 AND revision=2',[pageId])).rows[0].n,1);
  const draft=(await query('SELECT payload FROM documentation_drafts WHERE page_key=$1',[pageId])).rows[0].payload;
  assert.equal(draft.space,'Protocolos 190');assert.equal(draft.baseRevision,2);assert.equal(draft.content,'<p>Rascunho conservado</p>');
  const list=await listDocumentationSpaces(pool);
  assert.ok(list.some(s=>s.name==='Protocolos 190'&&s.icon==='🛡️'&&s.page_count===1));
  assert.ok(list.some(s=>s.name==='Nova pasta'&&s.icon==='⚖️'&&s.page_count===0));
  await assert.rejects(updateDocumentationSpace(pool,reader,{oldName:'Protocolos 190',name:'Inválido'}),e=>e.status===403);
 }finally{await pg.close();}
});
test('capas: cores maliciosas e imagens de ID inválido não são aceitas',()=>{
 const imageId=randomUUID(),meta=normalizeNexusMeta({cover:{mode:'image',imageId,from:'red;url(javascript:alert(1))',position:500,overlay:-7,caption:'Documento'}});
 assert.deepEqual(coverAssetIds(meta),[imageId]);
 assert.equal(meta.cover.from,'#4f46e5');assert.equal(meta.cover.position,100);assert.equal(meta.cover.overlay,0);
 const invalid=normalizeNexusMeta({cover:{mode:'image',imageId:'javascript:alert(1)',color:'url(//outside.invalid)'}});
 assert.equal(invalid.cover.mode,'preset');assert.deepEqual(coverAssetIds(invalid),[]);assert.equal(invalid.cover.color,'#4f46e5');
});
