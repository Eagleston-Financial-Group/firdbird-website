CREATE TABLE IF NOT EXISTS form_submissions (
  id uuid PRIMARY KEY,
  form_type varchar(80) NOT NULL,
  page_path varchar(300) NOT NULL,
  fields jsonb NOT NULL CHECK (jsonb_typeof(fields) = 'object'),
  status varchar(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'test')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS form_submissions_created_at_idx ON form_submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS form_submissions_type_idx ON form_submissions (form_type, created_at DESC);

CREATE TABLE IF NOT EXISTS submission_attachments (
  id uuid PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
  field_name varchar(100) NOT NULL,
  file_name varchar(200) NOT NULL,
  content_type varchar(80) NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 5242880),
  content bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (octet_length(content) = size_bytes)
);

CREATE INDEX IF NOT EXISTS submission_attachments_submission_idx ON submission_attachments (submission_id);

CREATE TABLE IF NOT EXISTS form_drafts (
  id uuid PRIMARY KEY,
  token_hash char(64) NOT NULL UNIQUE,
  upload_token_hash char(64) NOT NULL UNIQUE,
  form_type varchar(80) NOT NULL,
  page_path varchar(300) NOT NULL,
  fields jsonb NOT NULL CHECK (jsonb_typeof(fields) = 'object'),
  status varchar(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submission_id uuid REFERENCES form_submissions(id),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS form_drafts_expiry_idx ON form_drafts (expires_at);

ALTER TABLE form_drafts ADD COLUMN IF NOT EXISTS current_step smallint NOT NULL DEFAULT 0 CHECK (current_step BETWEEN 0 AND 3);

CREATE TABLE IF NOT EXISTS draft_attachments (
  id uuid PRIMARY KEY,
  draft_id uuid NOT NULL REFERENCES form_drafts(id) ON DELETE CASCADE,
  field_name varchar(100) NOT NULL,
  file_name varchar(200) NOT NULL,
  content_type varchar(80) NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 5242880),
  content bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (octet_length(content) = size_bytes)
);

CREATE INDEX IF NOT EXISTS draft_attachments_draft_idx ON draft_attachments (draft_id);

CREATE TABLE IF NOT EXISTS incomplete_leads (
  id uuid PRIMARY KEY,
  token_hash char(64) NOT NULL UNIQUE,
  form_type varchar(80) NOT NULL,
  page_path varchar(300) NOT NULL,
  fields jsonb NOT NULL CHECK (jsonb_typeof(fields) = 'object'),
  status varchar(20) NOT NULL DEFAULT 'incomplete' CHECK (status IN ('incomplete', 'submitted')),
  submission_id uuid REFERENCES form_submissions(id),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS incomplete_leads_expiry_idx ON incomplete_leads (expires_at);
