import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from './app.mjs';
import { databaseClient } from './db.mjs';
import { applicationFixture } from './test-fixture.mjs';

test('real isolated database: cookie restore, partial fields, revisions, attachments, submission, and isolation', { skip: process.env.RUN_DRAFT_DB_TESTS !== '1' }, async () => {
  assert.ok(process.env.DRAFT_TEST_HOST && new URL(process.env.DATABASE_URL).hostname === process.env.DRAFT_TEST_HOST, 'Integration tests require an explicitly configured isolated database endpoint');
  const server = createApp().listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`; let cookie = ''; const ids = [], submissions = [];
  const call = async (path, method = 'POST', body = {}, overrideCookie = cookie, overrideOrigin = 'http://localhost:3001') => {
    const response = await fetch(base + '/api/application-drafts' + path, { method, headers: { 'Content-Type': 'application/json', Origin: overrideOrigin, Cookie: overrideCookie }, body: JSON.stringify(body) });
    if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
    return { status: response.status, data: await response.json() };
  };
  const pagePath = '/contractors/hvac', formType = 'contractor-hvac';
  try {
    let r = await call('/open', 'POST', { pagePath }); assert.equal(r.data.draft, null); const browserCookie = cookie;
    r = await call('', 'PUT', { pagePath, formType, revision: null, currentStep: 1, fields: { firstName: 'Synthetic Draft QA', email: 'part@', annualSales: '12' } });
    assert.equal(r.status, 200); ids.push(r.data.draft.id); assert.equal(r.data.draft.revision, 0); assert.equal(r.data.draft.fields.email, 'part@');
    assert.ok(r.data.draft.progress.percentage > 0); assert.ok(!JSON.stringify(r.data).includes(browserCookie.split('=')[1]));
    r = await call('/open', 'POST', { pagePath }); assert.equal(r.data.draft.id, ids[0]); assert.equal(r.data.draft.currentStep, 1);
    r = await call('', 'PUT', { pagePath, formType, revision: 0, currentStep: 1, fields: { firstName: 'Synthetic Draft QA', email: 'updated@example.test', annualSales: '0' } });
    assert.equal(r.data.draft.revision, 1);
    r = await call('', 'PUT', { pagePath, formType, revision: 0, fields: { firstName: 'Stale tab' } }); assert.equal(r.status, 409);
    r = await call('/open', 'POST', { pagePath }); assert.equal(r.data.draft.fields.firstName, 'Synthetic Draft QA'); assert.equal(r.data.draft.fields.annualSales, '0');
    r = await call('/open', 'POST', { pagePath }, ''); assert.equal(r.data.draft, null);
    r = await call('', 'PUT', { pagePath, formType, revision: 1, fields: { firstName: 'Unknown' } }, browserCookie, 'https://evil.example'); assert.equal(r.status, 403);
    cookie = browserCookie;
    const upload = new FormData();
    upload.set('formType', formType); upload.set('pagePath', pagePath); upload.set('revision', '1'); upload.set('currentStep', '1');
    upload.set('fields', JSON.stringify({ firstName: 'Synthetic Draft QA', email: 'updated@example.test', annualSales: '0' }));
    upload.append('documents', new Blob(['%PDF-1.7\nSynthetic draft test\n%%EOF'], { type: 'application/pdf' }), 'synthetic-policy.pdf');
    const uploaded = await fetch(base + '/api/application-drafts/files', { method: 'POST', headers: { Origin: 'http://localhost:3001', Cookie: cookie }, body: upload });
    assert.equal(uploaded.status, 200); const uploadResult = await uploaded.json();
    assert.equal(uploadResult.draft.attachments.length, 1); assert.equal(uploadResult.draft.revision, 2);
    r = await call('/link', 'POST', { pagePath }); const resumeToken = r.data.token;
    r = await call('/open', 'POST', { pagePath, resumeToken }, ''); assert.equal(r.data.draft.id, ids[0]);
    r = await call('/open', 'POST', { pagePath: '/contractors/plumbing', resumeToken }, ''); assert.equal(r.status, 400);
    cookie = browserCookie;
    const fixture = applicationFixture(pagePath); fixture.fields.firstName = 'Synthetic Draft QA';
    r = await call('', 'PUT', { ...fixture, revision: 2, currentStep: 3 }); assert.equal(r.data.draft.progress.percentage, 99);
    r = await call('/submit', 'POST', { ...fixture, revision: 2 }); assert.equal(r.status, 409);
    r = await call('/submit', 'POST', { ...fixture, revision: 3 }); assert.equal(r.status, 201); submissions.push(r.data.id);
    r = await call('/submit', 'POST', { ...fixture, revision: 3 }); assert.equal(r.data.id, submissions[0]);
    const db = databaseClient(); await db.connect();
    try { const stored = (await db.query('SELECT status,completion_percent,revision FROM form_drafts WHERE id=$1', [ids[0]])).rows[0]; assert.equal(stored.status, 'submitted'); assert.equal(stored.completion_percent, 100); } finally { await db.end(); }
  } finally {
    await new Promise(resolve => server.close(resolve));
    const db = databaseClient(); await db.connect();
    try { for (const id of ids) await db.query('DELETE FROM form_drafts WHERE id=$1 AND fields->>\'firstName\'=$2', [id, 'Synthetic Draft QA']); for (const id of submissions) await db.query('DELETE FROM form_submissions WHERE id=$1 AND fields->>\'firstName\'=$2', [id, 'Synthetic Draft QA']); } finally { await db.end(); }
  }
});
