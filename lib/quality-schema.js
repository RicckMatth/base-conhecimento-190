export const QUALITY_SCHEMA=`
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
`;
export async function migrateQuality(pool){const c=await pool.connect();try{await c.query('BEGIN');await c.query("SELECT pg_advisory_xact_lock(hashtext('quality-migration-v1'))");for(const statement of QUALITY_SCHEMA.split(';').map(s=>s.trim()).filter(Boolean))await c.query(statement);const applied=await c.query('SELECT version FROM quality_migrations WHERE version=1');if(!applied.rows.length){
await c.query(`INSERT INTO quality_proposals(id,nature_code,topic,logic_version,origin,status,original_question,question,legacy_question_id)
 SELECT md5('quality-legacy:'||q.id::text)::uuid,q.nature_code,q.topic,'legacy-import','legacy','legacy',q.question,q.question,q.id FROM learned_triage_questions q ON CONFLICT DO NOTHING`);
await c.query(`INSERT INTO quality_votes(feedback_id,proposal_id) SELECT v.feedback_id,md5('quality-legacy:'||v.question_id::text)::uuid FROM triage_question_votes v ON CONFLICT DO NOTHING`);
await c.query(`INSERT INTO quality_publications(nature_code,topic,question,proposal_id,active)
 SELECT q.nature_code,q.topic,q.question,md5('quality-legacy:'||q.id::text)::uuid,EXISTS(SELECT 1 FROM triage_question_votes v JOIN triage_feedback f ON f.id=v.feedback_id JOIN users u ON u.id=f.user_id WHERE v.question_id=q.id AND f.vote='like' AND u.active=true) FROM learned_triage_questions q ON CONFLICT DO NOTHING`);
await c.query('INSERT INTO quality_migrations(version) VALUES(1)');}await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
