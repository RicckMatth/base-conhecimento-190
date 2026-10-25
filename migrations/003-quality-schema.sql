-- Schema de referência. Executar via migrateQuality para incluir migração dos legados e controle transacional.

CREATE TABLE IF NOT EXISTS quality_migrations(version integer PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS quality_proposals(
 id uuid PRIMARY KEY,nature_code text NOT NULL,topic text NOT NULL,logic_version text NOT NULL,
 legacy_question_id uuid,
 origin text NOT NULL CHECK(origin IN ('gemini','legacy')),status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','revision','merged','legacy')),
 original_question text NOT NULL,question text NOT NULL,reference_text text NOT NULL DEFAULT '',editorial_note text NOT NULL DEFAULT '',
 revision integer NOT NULL DEFAULT 1,merged_into uuid REFERENCES quality_proposals(id),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(nature_code,topic,logic_version));
CREATE TABLE IF NOT EXISTS quality_feedback_events(id uuid PRIMARY KEY,feedback_id uuid NOT NULL REFERENCES triage_feedback(id) ON DELETE CASCADE,vote text NOT NULL CHECK(vote IN ('like','dislike')),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS quality_votes(feedback_id uuid REFERENCES triage_feedback(id) ON DELETE CASCADE,proposal_id uuid REFERENCES quality_proposals(id),PRIMARY KEY(feedback_id,proposal_id));
CREATE TABLE IF NOT EXISTS quality_decisions(id uuid PRIMARY KEY,proposal_id uuid NOT NULL REFERENCES quality_proposals(id),actor_id uuid REFERENCES users(id),action text NOT NULL,before_value jsonb,after_value jsonb,reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS quality_publications(nature_code text NOT NULL,topic text NOT NULL,question text NOT NULL,proposal_id uuid NOT NULL REFERENCES quality_proposals(id),active boolean NOT NULL DEFAULT true,published_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(nature_code,topic));
CREATE INDEX IF NOT EXISTS quality_proposals_filters ON quality_proposals(status,nature_code,created_at DESC);
CREATE INDEX IF NOT EXISTS quality_votes_proposal ON quality_votes(proposal_id);
CREATE INDEX IF NOT EXISTS quality_decisions_history ON quality_decisions(proposal_id,created_at DESC);
