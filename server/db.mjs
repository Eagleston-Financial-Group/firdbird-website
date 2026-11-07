import pg from 'pg';
import { randomUUID, createHash } from 'node:crypto';
import { ValidationError } from './validation.mjs';

export function databaseClient(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error('DATABASE_URL is not configured.');
  const url = new URL(connectionString);
  // Keep certificate verification enabled, including with connection strings that
  // historically interpreted sslmode=require as encryption without verification.
  url.searchParams.set('sslmode', 'verify-full');
  return new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 15000, query_timeout: 20000 });
}

export async function storeSubmission({ formType, pagePath, fields, files, draftToken, leadToken, expectedRevision }) {
  const client = databaseClient();
  const id = randomUUID();
  await client.connect();
  try {
    await client.query('BEGIN');
    let draft;
    if (draftToken) {
      const result = await client.query('SELECT id, form_type, page_path, status, submission_id, revision FROM form_drafts WHERE token_hash = $1 AND expires_at > now() FOR UPDATE', [createHash('sha256').update(draftToken).digest('hex')]);
      draft = result.rows[0];
      if (!draft) throw new ValidationError('This saved draft has expired or is unavailable.');
      if (draft.form_type !== formType || draft.page_path !== pagePath) throw new ValidationError('This draft belongs to a different application.');
      if (draft.status === 'submitted') {
        await client.query('COMMIT');
        const count = await client.query('SELECT count(*)::int AS count FROM submission_attachments WHERE submission_id = $1', [draft.submission_id]);
        return { id: draft.submission_id, attachmentCount: count.rows[0].count };
      }
      if (expectedRevision !== undefined && expectedRevision !== draft.revision) { const error = new ValidationError('Another tab changed this application. Load the latest saved draft before submitting.'); error.statusCode = 409; throw error; }
      const usage = await client.query('SELECT count(*)::int AS count, coalesce(sum(size_bytes), 0)::int AS bytes FROM draft_attachments WHERE draft_id = $1', [draft.id]);
      if (usage.rows[0].count + files.length > 10 || usage.rows[0].bytes + files.reduce((sum, file) => sum + file.size, 0) > 20 * 1024 * 1024) throw new ValidationError('The draft and new attachments exceed the 10-file or 20 MB total limit.');
    }
    await client.query(
      'INSERT INTO form_submissions (id, form_type, page_path, fields) VALUES ($1, $2, $3, $4::jsonb)',
      [id, formType, pagePath, JSON.stringify(fields)],
    );
    for (const file of files) {
      await client.query(
        `INSERT INTO submission_attachments
          (id, submission_id, field_name, file_name, content_type, size_bytes, content)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [randomUUID(), id, file.fieldname, file.originalname, file.mimetype, file.size, file.buffer],
      );
    }
    if (draft) {
      await client.query('INSERT INTO submission_attachments (id, submission_id, field_name, file_name, content_type, size_bytes, content) SELECT id, $1, field_name, file_name, content_type, size_bytes, content FROM draft_attachments WHERE draft_id = $2', [id, draft.id]);
      await client.query("UPDATE form_drafts SET status = 'submitted', completion_percent=100, revision=revision+1, submission_id = $1, fields = $2::jsonb, updated_at = now() WHERE id = $3", [id, JSON.stringify(fields), draft.id]);
    }
    if (leadToken) {
      await client.query("UPDATE incomplete_leads SET status = 'submitted', submission_id = $1, updated_at = now() WHERE token_hash = $2 AND form_type = $3 AND page_path = $4 AND expires_at > now()", [id, createHash('sha256').update(leadToken).digest('hex'), formType, pagePath]);
    }
    await client.query('COMMIT');
    const count = await client.query('SELECT count(*)::int AS count FROM submission_attachments WHERE submission_id = $1', [id]);
    return { id, attachmentCount: count.rows[0].count };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}
