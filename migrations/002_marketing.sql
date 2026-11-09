-- Ad-click and campaign context for leads, drafts, and submissions (first touch).
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS attribution jsonb CHECK (attribution IS NULL OR jsonb_typeof(attribution) = 'object');
ALTER TABLE form_drafts ADD COLUMN IF NOT EXISTS attribution jsonb CHECK (attribution IS NULL OR jsonb_typeof(attribution) = 'object');
ALTER TABLE incomplete_leads ADD COLUMN IF NOT EXISTS attribution jsonb CHECK (attribution IS NULL OR jsonb_typeof(attribution) = 'object');

-- Short "call me back" requests from the contact page.
CREATE TABLE IF NOT EXISTS callback_requests (
  id uuid PRIMARY KEY,
  fields jsonb NOT NULL CHECK (jsonb_typeof(fields) = 'object'),
  attribution jsonb CHECK (attribution IS NULL OR jsonb_typeof(attribution) = 'object'),
  status varchar(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'test')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS callback_requests_created_at_idx ON callback_requests (created_at DESC);
