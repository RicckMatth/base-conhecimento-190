import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {listDocumentationSpaces} from '../lib/documentation-spaces.js';

test('pastas são listadas sem operações de escrita por solicitação',async()=>{
 const db=new PGlite();
 try{
  await db.exec("CREATE TABLE documentation_spaces(name text PRIMARY KEY,icon text NOT NULL DEFAULT '📁',description text NOT NULL DEFAULT '',updated_at timestamptz DEFAULT now())");
  await db.exec("CREATE TABLE documentation_pages(id uuid PRIMARY KEY,space text NOT NULL,status text NOT NULL)");
  await db.query("INSERT INTO documentation_spaces(name,icon) VALUES('A','📚'),('Vazia','🗂️')");
  await db.query("INSERT INTO documentation_pages(id,space,status) VALUES"+
    "('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','A','published'),"+
    "('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Legado','published'),"+
    "('cccccccc-cccc-4ccc-8ccc-cccccccccccc','Rascunhos','draft')");
  const users=await listDocumentationSpaces(db,false);
  assert.deepEqual(users.map(x=>x.name),['A','Legado']);
  assert.equal(users.find(x=>x.name==='Legado').icon,'📁');
  assert.equal(users.find(x=>x.name==='A').page_count,1);
  const admins=await listDocumentationSpaces(db,true);
  assert.deepEqual(admins.map(x=>x.name),['A','Legado','Rascunhos','Vazia']);
  assert.equal((await db.query("SELECT COUNT(*)::int AS c FROM documentation_spaces")).rows[0].c,2);
 }finally{await db.close();}
});
test('API envia índice compacto e busca conteúdo da página somente ao abrir',()=>{
 const api=readFileSync(new URL('../app/api/[[...path]]/route.js',import.meta.url),'utf8');
 assert.match(api,/route==='\/documentation'&&method==='GET'/);
 assert.match(api,/route==='\/documentation\/page'&&method==='GET'/);
 assert.match(api,/route==='\/documentation\/search'&&method==='GET'/);
 assert.match(api,/\(COALESCE\(p\.nexus_meta,'\{\}'::jsonb\) - 'blocks'\)/);
 assert.match(api,/WHERE p\.id=\$1 AND \(\$2 OR p\.status='published'\)/);
 assert.match(api,/\/documentation\/draft/);
 assert.match(api,/route\.startsWith\('\/documentation\/assets\/'\)/);
});
test('editor mostra skeleton até terminar a sincronização, seleciona páginas por id e cancela respostas antigas',()=>{
 const page=readFileSync(new URL('../app/nexus-documentation.jsx',import.meta.url),'utf8');
 assert.match(page,/indexLoading/);
 assert.match(page,/pageLoading/);
 assert.match(page,/nx-tree-loading/);
 assert.match(page,/nx-document-loading/);
 assert.match(page,/\/page\?id=/);
 assert.match(page,/detailRequest\.current/);
 assert.match(page,/pageCache\.current/);
 assert.match(page,/searchBusy/);
 assert.match(page,/\/search\?q=/);
 assert.match(page,/void reload\(\{showLoading:true\}\)/);
 assert.match(page,/nx-tree-load-error/);
});
test('o scroll horizontal é ocultado só na árvore, mantendo o scroll vertical',()=>{
 const css=readFileSync(new URL('../app/nexus-documentation.css',import.meta.url),'utf8');
 assert.match(css,/\.nexus-docs \.nx-tree\s*\{[^}]*overflow-x:hidden!important/);
 assert.match(css,/\.nexus-docs \.nx-tree\s*\{[^}]*overflow-y:auto/);
 assert.match(css,/\.nx-table-wrap\{overflow-x:auto/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
