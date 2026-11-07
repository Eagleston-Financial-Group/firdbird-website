-- Additive: existing answers, attachments, tokens, and submissions are preserved.
ALTER TABLE form_drafts ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0;
ALTER TABLE form_drafts ADD COLUMN IF NOT EXISTS completion_percent smallint NOT NULL DEFAULT 0 CHECK (completion_percent BETWEEN 0 AND 100);
ALTER TABLE form_drafts ADD COLUMN IF NOT EXISTS completed_required_fields smallint NOT NULL DEFAULT 0;
ALTER TABLE form_drafts ADD COLUMN IF NOT EXISTS required_fields smallint NOT NULL DEFAULT 0;
ALTER TABLE form_drafts ADD COLUMN IF NOT EXISTS answered_fields smallint NOT NULL DEFAULT 0;
ALTER TABLE form_drafts ADD COLUMN IF NOT EXISTS total_fields smallint NOT NULL DEFAULT 0;
ALTER TABLE form_drafts ADD COLUMN IF NOT EXISTS progress_version smallint NOT NULL DEFAULT 0;
