import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { databaseClient } from './db.mjs';
import { draftProgress, PROGRESS_VERSION } from '../src/data/draft-progress.js';

const connectionString = process.env.DATABASE_URL_UNPOOLED;
if (!connectionString) throw new Error('Set DATABASE_URL_UNPOOLED to the direct database connection before migrating.');
if (new URL(connectionString).hostname.includes('-pooler.')) throw new Error('Migrations require the direct, non-pooled database connection.');
const client = databaseClient(connectionString);
try {
  await client.connect();
  await client.query('BEGIN');
  const directory = new URL('../migrations/', import.meta.url);
  for (const file of (await readdir(directory)).filter(name => /^\d{3}_[\w-]+\.sql$/.test(name)).sort()) {
    await client.query(await readFile(new URL(file, directory), 'utf8'));
  }
  // Backfill progress without logging or changing existing application answers.
  const drafts = await client.query('SELECT id, page_path, fields, status FROM form_drafts WHERE progress_version < $1', [PROGRESS_VERSION]);
  for (const draft of drafts.rows) {
    const p = draftProgress(draft.page_path, draft.fields, draft.status === 'submitted');
    await client.query('UPDATE form_drafts SET completion_percent=$2, completed_required_fields=$3, required_fields=$4, answered_fields=$5, total_fields=$6, progress_version=$7 WHERE id=$1', [draft.id, p.percentage, p.completedRequired, p.requiredTotal, p.answeredFields, p.totalFields, p.definitionVersion]);
  }
  await client.query('COMMIT');
  console.log('Submission and attachment schema is ready.');
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('Migration failed:', error.code || error.name);
  process.exitCode = 1;
} finally { await client.end(); }
