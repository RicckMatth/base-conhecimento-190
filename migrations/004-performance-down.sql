-- Executar sob controle do operador após reverter o código, em transação.
-- Mantém usuários, sessões, conhecimento, regras, feedback e documentação intactos.
BEGIN;
DROP TRIGGER IF EXISTS perf_catalog_changed ON knowledge;
DROP TRIGGER IF EXISTS perf_catalog_changed ON custom_rules;
DROP TRIGGER IF EXISTS perf_catalog_changed ON learned_triage_questions;
DROP TRIGGER IF EXISTS perf_catalog_changed ON triage_question_votes;
DROP TRIGGER IF EXISTS perf_catalog_changed ON triage_feedback;
DROP TRIGGER IF EXISTS perf_catalog_changed ON users;
DROP FUNCTION IF EXISTS perf_bump_catalog();
DROP INDEX IF EXISTS knowledge_title_perf_idx;
DO $$ BEGIN IF to_regclass('public.app_runtime_schema') IS NOT NULL THEN DELETE FROM app_runtime_schema WHERE version=4;END IF;END $$;
-- Tabelas de versão/revisão permanecem para rastreabilidade; não contêm dados de atendimento.
COMMIT;
