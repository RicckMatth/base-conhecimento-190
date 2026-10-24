import pg from 'pg';
import {readFile} from 'node:fs/promises';
import {SOURCES} from '../lib/juridico/sources.js';
if(process.env.CIJ_ALLOW_MIGRATION!=='yes')throw Error('Use CIJ_ALLOW_MIGRATION=yes com banco isolado de desenvolvimento.');
const client=new pg.Client({connectionString:process.env.DATABASE_URL});await client.connect();
try{await client.query('BEGIN');await client.query("SELECT pg_advisory_xact_lock(hashtext('cij-migrations'))");await client.query('CREATE TABLE IF NOT EXISTS cij_migrations(version text PRIMARY KEY,applied_at timestamptz DEFAULT now())');const exists=await client.query("SELECT 1 FROM cij_migrations WHERE version='001'");if(!exists.rowCount){await client.query(await readFile(new URL('../migrations/001_legal_library.sql',import.meta.url),'utf8'));await client.query("INSERT INTO cij_migrations(version) VALUES('001')");}for(const [code,s]of Object.entries(SOURCES))await client.query('INSERT INTO cij_norms(code,title,source_url) VALUES($1,$2,$3) ON CONFLICT(code) DO NOTHING',[code,s.title,s.url]);await client.query('COMMIT');console.log('Migração jurídica 001 aplicada.');}catch(e){await client.query('ROLLBACK');throw e;}finally{await client.end();}
