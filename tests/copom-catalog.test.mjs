import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {CSV_NATURES,COPOM_CATALOG,catalogRules,localRecognitionRules} from '../lib/copom-catalog.js';
import {syncCopomCatalog} from '../lib/copom-import.js';

test('o arquivo original possui 769 IDs/naturezas intactos e fichas com descrições',()=>{
 assert.equal(CSV_NATURES.length,769);
 assert.equal(COPOM_CATALOG.length,769);
 assert.equal(new Set(COPOM_CATALOG.map(v=>v.code)).size,769);
 assert.equal(new Set(COPOM_CATALOG.map(v=>v.title)).size,769);
 assert.equal(COPOM_CATALOG[0].code,'NAT-0001');
 assert.equal(COPOM_CATALOG[0].title,'ABORDAGEM DE SUSPEITOS - SEM ILICITUDE');
 assert.equal(COPOM_CATALOG[768].code,'NAT-0769');
 assert.equal(COPOM_CATALOG[768].title,'VOTAR OU TENTAR VOTAR MAIS DE UMA VEZ / O EM LUGAR DE OUTREM');
 assert.equal(COPOM_CATALOG.find(v=>v.code==='NAT-0525').title.startsWith('"ART. 349-A.'),true);
 for(const record of COPOM_CATALOG){
  assert.equal(record.source_id,Number(record.code.slice(4)),'IDs devem corresponder ao CSV');
  assert.ok(record.summary.length>80,'toda natureza deve ter descrição útil: '+record.code);
  assert.ok(record.body.includes(record.title));
  assert.equal(record.priority,'Consulta');
 }
 const samples=['NAT-0005','NAT-0009','NAT-0010','NAT-0011','NAT-0012','NAT-0016','NAT-0039'];
 for(const code of samples){const r=COPOM_CATALOG.find(v=>v.code===code);assert.ok(r.summary.includes('relato')||r.summary.includes('Relato')||r.summary.includes('Suspeita')||r.summary.includes('Comunicação')||r.summary.includes('Comunica'),'descrição do '+code);}
 const rules=catalogRules();assert.equal(rules.length,769);
 assert.ok(localRecognitionRules().every(r=>rules.some(x=>x.code===r.code)),'triagem automática não pode usar códigos legados');
 assert.ok(localRecognitionRules().length<20,'não presumir natureza automaticamente sem dados suficientes');
});

test('importação de 769 natureza em PostgreSQL local é atômica, idempotente e preserva histórico legado',async()=>{
 const pg=new PGlite();
 await pg.exec("CREATE TABLE knowledge(id uuid PRIMARY KEY,code text UNIQUE NOT NULL,title text NOT NULL,category text NOT NULL,priority text NOT NULL,summary text NOT NULL,body text NOT NULL,tags jsonb NOT NULL DEFAULT '[]'::jsonb,revision integer NOT NULL DEFAULT 1,active_in_catalog boolean NOT NULL DEFAULT true,updated_at timestamptz NOT NULL DEFAULT now());CREATE TABLE knowledge_revisions(id uuid PRIMARY KEY,knowledge_id uuid REFERENCES knowledge(id) ON DELETE CASCADE,revision int,snapshot jsonb);CREATE TABLE custom_rules(id uuid PRIMARY KEY,definition jsonb NOT NULL,active_in_catalog boolean NOT NULL DEFAULT true);CREATE TABLE audit_log(id uuid PRIMARY KEY,actor_id uuid,action text NOT NULL,target text);");
 const legacyId=randomUUID();
 await pg.query("INSERT INTO knowledge(id,code,title,category,priority,summary,body) VALUES($1,'CAT-OLD','Natureza antiga','Teste','Alta','Descrição antiga','Corpo antigo')",[legacyId]);
 await pg.query("INSERT INTO knowledge_revisions(id,knowledge_id,revision,snapshot) VALUES($1,$2,1,'{}'::jsonb)",[randomUUID(),legacyId]);
 await pg.query("INSERT INTO custom_rules(id,definition) VALUES($1,'{}'::jsonb)",[randomUUID()]);
 const pool={connect:async()=>({query:(sql,params)=>pg.query(sql,params),release(){}})};
 try{
  const imported=await syncCopomCatalog(pool);assert.equal(imported.count,769);assert.equal(imported.changed,true);
  const stats=(await pg.query('SELECT active_in_catalog,count(*)::int AS n FROM knowledge GROUP BY active_in_catalog')).rows;
  assert.equal(stats.find(v=>v.active_in_catalog===true).n,769);
  assert.equal(stats.find(v=>v.active_in_catalog===false).n,1);
  const found=(await pg.query("SELECT code,title,summary,active_in_catalog FROM knowledge WHERE code='NAT-0005'")).rows[0];
  assert.equal(found.title,'AMEACA');assert.ok(found.summary.includes('Relato'));
  const history=(await pg.query('SELECT count(*)::int AS n FROM knowledge_revisions WHERE knowledge_id=$1',[legacyId])).rows[0];assert.equal(history.n,1);
  const oldRule=(await pg.query('SELECT active_in_catalog FROM custom_rules')).rows[0];assert.equal(oldRule.active_in_catalog,false);
  await pg.query("UPDATE knowledge SET summary='Descrição revisada pelo gestor' WHERE code='NAT-0005'");
  const second=await syncCopomCatalog(pool);assert.equal(second.changed,false);
  const updated=(await pg.query("SELECT summary FROM knowledge WHERE code='NAT-0005'")).rows[0];
  assert.equal(updated.summary,'Descrição revisada pelo gestor','edições posteriores não são sobrescritas a cada requisição');
  const total=(await pg.query('SELECT count(*)::int AS n FROM knowledge')).rows[0].n;assert.equal(total,770);
 }finally{await pg.close();}
});
