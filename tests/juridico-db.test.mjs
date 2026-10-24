import test from 'node:test';import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';import {readFile} from 'node:fs/promises';
import {stageImport,reviewVersion,searchLegal} from '../lib/juridico/service.js';
const uid='11111111-1111-4111-8111-111111111111';
test('PostgreSQL isolado: migração idempotente, importação, aprovação, FTS, histórico e invalidação',async()=>{
 const pg=new PGlite();const query=async(sql,args)=>{const r=await pg.query(sql,args);return {...r,rowCount:r.affectedRows??r.rows.length};};const pool={query,connect:async()=>({query,release(){}})};
 try{
 await pg.exec('CREATE TABLE users(id uuid PRIMARY KEY);');await query('INSERT INTO users VALUES($1)',[uid]);
 const migration=await readFile(new URL('../migrations/001_legal_library.sql',import.meta.url),'utf8');await pg.exec(migration);await pg.exec(migration);
 await query("INSERT INTO cij_norms(code,title,source_url) VALUES('CP','Norma fictícia de teste','https://example.invalid')");
 const html='<p>Art. 147º Ameaça fictícia para teste automatizado.</p><div>§ 1º Complemento integral de teste.</div><p>Art. 148º Outro texto fictício.</p>';
 const staged=await stageImport('CP',uid,html,pool);assert.equal(staged.articles,2);
 assert.deepEqual(await searchLegal('ameaça','CP',30,pool),[]);
 assert.equal((await stageImport('CP',uid,html,pool)).duplicate,true);
 await reviewVersion(staged.id,'approved','Fixture fictícia conferida para teste; não é legislação.',uid,pool);
 const exact=await searchLegal('art. 147 do Código Penal','',30,pool);assert.equal(exact.length,1);assert.match(exact[0].body,/Complemento integral/);
 assert.equal((await searchLegal('ameaça','CP',30,pool)).length,1);
 assert.equal((await searchLegal('ele me ameaçou','CP',30,pool)).length,1);
 const second=await stageImport('CP',uid,html.replace('Complemento integral','Complemento alterado'),pool);assert.notEqual(second.id,staged.id);
 assert.match((await searchLegal('art. 147','CP',30,pool))[0].body,/Complemento integral/);
 await reviewVersion(second.id,'approved','Segunda fixture conferida.',uid,pool);
 assert.match((await searchLegal('art. 147','CP',30,pool))[0].body,/Complemento alterado/);
 await query("UPDATE cij_norms SET enabled=false WHERE code='CP'");assert.deepEqual(await searchLegal('ameaça','CP',30,pool),[]);
 await query("UPDATE cij_norms SET enabled=true WHERE code='CP'");
 await reviewVersion(second.id,'invalid','Fixture invalidada.',uid,pool);await reviewVersion(staged.id,'invalid','Fixture invalidada.',uid,pool);
 assert.deepEqual(await searchLegal('ameaça','CP',30,pool),[]);
 assert.equal((await query('SELECT count(*)::int AS n FROM cij_versions')).rows[0].n,2);
 }finally{await pg.close();}
});
