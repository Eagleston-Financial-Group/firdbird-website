import 'dotenv/config';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { createApp } from './app.mjs';
import { databaseClient } from './db.mjs';
import { applicationFixture } from './test-fixture.mjs';

const server = createApp().listen(0, '127.0.0.1');
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;
const client = databaseClient();
const draftIds = [];
let leadToken, submissionId;
const checks = [];
const digest = value => createHash('sha256').update(value).digest('hex');

async function json(path, method = 'GET', body) {
  const response = await fetch(base + path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json() };
}

async function upload(path, name = 'synthetic.csv') {
  const data = new FormData();
  data.append('documents', new Blob(['column\nsynthetic test'], { type: 'text/csv' }), name);
  const response = await fetch(base + path, { method: 'POST', body: data });
  return { status: response.status, body: await response.json() };
}

try {
  await client.connect();
  const fixture = applicationFixture();
  const partial = { ...fixture, fields: { firstName: 'Synthetic', email: 'partial@', additionalNotes: 'Must not be stored as a lead' } };
  const lead = await json('/api/leads', 'POST', partial);
  assert.equal(lead.status, 201);
  leadToken = lead.body.leadToken;
  const leadRow = await client.query('SELECT fields FROM incomplete_leads WHERE token_hash = $1', [digest(leadToken)]);
  assert.deepEqual(Object.keys(leadRow.rows[0].fields).sort(), ['email', 'firstName']);
  assert.equal((await json(`/api/leads/${leadToken}`, 'PATCH', fixture)).status, 200);
  checks.push('Contact-only incomplete lead capture');

  const created = await json('/api/drafts', 'POST', { ...partial, currentStep: 1 });
  assert.equal(created.status, 201);
  const draft = created.body;
  draftIds.push(draft.id);
  assert.match(draft.token, /^[a-f0-9]{64}$/);
  const hashes = await client.query('SELECT token_hash, upload_token_hash FROM form_drafts WHERE id = $1', [draft.id]);
  assert.equal(hashes.rows[0].token_hash, digest(draft.token));
  assert.notEqual(hashes.rows[0].token_hash, draft.token);
  assert.notEqual(hashes.rows[0].upload_token_hash, draft.uploadToken);
  assert.equal((await json(`/api/drafts/${draft.token}`)).body.currentStep, 1);
  assert.equal((await json(`/api/drafts/${draft.token}`, 'PATCH', { ...fixture, currentStep: 3 })).status, 200);
  const resumed = await json(`/api/drafts/${draft.token}`);
  assert.equal(resumed.body.currentStep, 3);
  assert.deepEqual(resumed.body.fields, fixture.fields);
  checks.push('Private draft persistence, hashed return tokens, and resumed progress');

  const uploadLink = await json(`/api/drafts/${draft.token}/upload-link`, 'POST');
  assert.equal(uploadLink.status, 200);
  const uploadToken = uploadLink.body.uploadToken;
  assert.equal((await json(`/api/draft-uploads/${draft.uploadToken}`)).status, 400);
  const uploadInfo = await json(`/api/draft-uploads/${uploadToken}`);
  assert.deepEqual(Object.keys(uploadInfo.body).sort(), ['expiresAt', 'open']);
  assert.equal((await json(`/api/drafts/${uploadToken}`)).status, 400);
  assert.equal((await upload(`/api/draft-uploads/${uploadToken}`)).status, 201);
  let attachments = (await json(`/api/drafts/${draft.token}`)).body.attachments;
  assert.equal(attachments.length, 1);
  assert.equal((await json(`/api/drafts/${draft.token}/attachments/${attachments[0].id}`, 'DELETE')).status, 200);
  assert.equal((await json(`/api/drafts/${draft.token}`)).body.attachments.length, 0);
  assert.equal((await upload(`/api/draft-uploads/${uploadToken}`)).status, 201);
  checks.push('Scoped upload links, private field isolation, attachment upload and removal');

  const submitted = await json('/api/submissions', 'POST', { ...fixture, draftToken: draft.token, leadToken });
  assert.equal(submitted.status, 201);
  submissionId = submitted.body.id;
  assert.equal(submitted.body.attachmentCount, 1);
  const stored = await client.query('SELECT a.content, l.status FROM submission_attachments a JOIN incomplete_leads l ON l.submission_id = a.submission_id WHERE a.submission_id = $1', [submissionId]);
  assert.equal(stored.rows[0].content.toString(), 'column\nsynthetic test');
  assert.equal(stored.rows[0].status, 'submitted');
  const repeated = await json('/api/submissions', 'POST', { ...fixture, draftToken: draft.token, leadToken });
  assert.equal(repeated.body.id, submissionId);
  assert.equal((await json(`/api/drafts/${draft.token}`, 'PATCH', fixture)).status, 400);
  assert.equal((await upload(`/api/draft-uploads/${uploadToken}`)).status, 400);
  checks.push('Atomic final submission, copied attachments, repeat-submit protection, and locked submitted drafts');

  const expiring = await json('/api/drafts', 'POST', partial);
  assert.equal(expiring.status, 201);
  draftIds.push(expiring.body.id);
  await client.query("UPDATE form_drafts SET expires_at = now() - interval '1 second' WHERE id = $1", [expiring.body.id]);
  assert.equal((await json(`/api/drafts/${expiring.body.token}`)).status, 400);
  assert.equal((await json(`/api/draft-uploads/${expiring.body.uploadToken}`)).status, 400);
  checks.push('Expired return and upload links denied');
  console.log(JSON.stringify({ ok: true, checks }));
} catch (error) {
  console.error('Draft integration check failed:', error.code || error.message);
  process.exitCode = 1;
} finally {
  try {
    // Only identifiers created by this invocation are eligible for cleanup.
    if (leadToken) await client.query('DELETE FROM incomplete_leads WHERE token_hash = $1', [digest(leadToken)]);
    if (draftIds.length) await client.query('DELETE FROM form_drafts WHERE id = ANY($1::uuid[])', [draftIds]);
    if (submissionId) await client.query('DELETE FROM form_submissions WHERE id = $1', [submissionId]);
    console.log('Synthetic draft, lead, submission, and attachment records cleaned up.');
  } finally {
    await client.end().catch(() => {});
    await new Promise(resolve => server.close(resolve));
  }
}
