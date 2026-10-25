export const PERFORMANCE_SCHEMA=`
CREATE TABLE IF NOT EXISTS perf_catalog_revision(id boolean PRIMARY KEY DEFAULT true CHECK(id),revision bigint NOT NULL DEFAULT 1);
INSERT INTO perf_catalog_revision(id) VALUES(true) ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION perf_bump_catalog() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN UPDATE perf_catalog_revision SET revision=revision+1 WHERE id=true;RETURN NULL;END $$;
CREATE INDEX IF NOT EXISTS knowledge_title_perf_idx ON knowledge(title);
`;
export async function preparePerformanceSchema(client){await client.query(PERFORMANCE_SCHEMA);for(const table of ['knowledge','custom_rules','learned_triage_questions','triage_question_votes','triage_feedback','users']){await client.query(`DROP TRIGGER IF EXISTS perf_catalog_changed ON ${table}`);await client.query(`CREATE TRIGGER perf_catalog_changed AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON ${table} FOR EACH STATEMENT EXECUTE FUNCTION perf_bump_catalog()`);}}
