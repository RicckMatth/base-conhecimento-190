BEGIN;

CREATE TABLE IF NOT EXISTS perf_catalog_revision(id boolean PRIMARY KEY DEFAULT true CHECK(id),revision bigint NOT NULL DEFAULT 1);
INSERT INTO perf_catalog_revision(id) VALUES(true) ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION perf_bump_catalog() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN UPDATE perf_catalog_revision SET revision=revision+1 WHERE id=true;RETURN NULL;END $$;
CREATE INDEX IF NOT EXISTS knowledge_title_perf_idx ON knowledge(title);
DROP TRIGGER IF EXISTS perf_catalog_changed ON knowledge;
CREATE TRIGGER perf_catalog_changed AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON knowledge FOR EACH STATEMENT EXECUTE FUNCTION perf_bump_catalog();
DROP TRIGGER IF EXISTS perf_catalog_changed ON custom_rules;
CREATE TRIGGER perf_catalog_changed AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON custom_rules FOR EACH STATEMENT EXECUTE FUNCTION perf_bump_catalog();
DROP TRIGGER IF EXISTS perf_catalog_changed ON learned_triage_questions;
CREATE TRIGGER perf_catalog_changed AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON learned_triage_questions FOR EACH STATEMENT EXECUTE FUNCTION perf_bump_catalog();
DROP TRIGGER IF EXISTS perf_catalog_changed ON triage_question_votes;
CREATE TRIGGER perf_catalog_changed AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON triage_question_votes FOR EACH STATEMENT EXECUTE FUNCTION perf_bump_catalog();
DROP TRIGGER IF EXISTS perf_catalog_changed ON triage_feedback;
CREATE TRIGGER perf_catalog_changed AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON triage_feedback FOR EACH STATEMENT EXECUTE FUNCTION perf_bump_catalog();
DROP TRIGGER IF EXISTS perf_catalog_changed ON users;
CREATE TRIGGER perf_catalog_changed AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON users FOR EACH STATEMENT EXECUTE FUNCTION perf_bump_catalog();
COMMIT;
