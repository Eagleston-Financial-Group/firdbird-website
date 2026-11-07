import 'dotenv/config';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from './app.mjs';
import { databaseClient } from './db.mjs';
import { applicationFixture } from './test-fixture.mjs';

// This creates and removes one synthetic record. It never contacts the agency.
const server = createApp().listen(0, '127.0.0.1');
await once(server, 'listening');
const client = databaseClient();
let submissionId;
try {
  const form = new FormData();
  const fixture = applicationFixture();
  form.set('formType', fixture.formType);
  form.set('pagePath', fixture.pagePath);
  form.set('fields', JSON.stringify(fixture.fields));
  const content = '%PDF-1.7\nSynthetic Firebird attachment verification\n%%EOF';
  form.append('documents', new Blob([content], { type: 'application/pdf' }), 'synthetic-test.pdf');
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/submissions`, { method: 'POST', body: form });
  const result = await response.json();
  assert.equal(response.status, 201, result.error || 'Submission failed');
  submissionId = result.id;
  await client.connect();
  const check = await client.query('SELECT s.form_type, a.content FROM form_submissions s JOIN submission_attachments a ON a.submission_id = s.id WHERE s.id = $1', [result.id]);
  assert.equal(check.rows.length, 1);
  assert.equal(check.rows[0].form_type, fixture.formType);
  assert.equal(check.rows[0].content.toString(), content);
  console.log(JSON.stringify({ ok: true, checks: ['HTTP form submission', 'Database row persistence', 'Attachment byte integrity'] }));
} catch (error) {
  console.error('Integration check failed:', error.code || error.message);
  process.exitCode = 1;
} finally {
  if (submissionId) {
    await client.query('DELETE FROM form_submissions WHERE id = $1', [submissionId]);
    console.log('Synthetic submission and attachment removed.');
  }
  await client.end().catch(() => {});
  await new Promise(resolve => server.close(resolve));
}
