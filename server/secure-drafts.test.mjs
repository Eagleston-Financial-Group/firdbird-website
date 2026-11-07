import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from './app.mjs';
import { draftProgress } from '../src/data/draft-progress.js';
import { applicationPaths } from '../src/data/applications.js';
import { applicationFixture } from './test-fixture.mjs';
import { DraftSaver } from '../src/draft-saver.js';

test('all application schemas have server-calculated draft and submitted progress', () => {
  for (const path of applicationPaths) {
    const complete = applicationFixture(path);
    assert.equal(draftProgress(path, {}).percentage, 0, path);
    assert.equal(draftProgress(path, complete.fields).percentage, 99, path);
    assert.equal(draftProgress(path, complete.fields, true).percentage, 100, path);
    assert.ok(draftProgress(path, complete.fields).requiredTotal > 0);
  }
  const f = applicationFixture();
  const whole = draftProgress(f.pagePath, f.fields);
  assert.ok(draftProgress(f.pagePath, { ...f.fields, email: 'partial@' }).completedRequired < whole.completedRequired);
});

test('autosaving serializes edits made during a slow save using the latest revision', async () => {
  let release; const gate = new Promise(resolve => { release = resolve; }); const calls = [];
  const saver = new DraftSaver({ delay: 10000, maxWait: 10000, onState() {}, onSaved() {}, save: async (snapshot, revision) => {
    calls.push({ snapshot, revision }); if (calls.length === 1) await gate;
    return { draft: { revision: (revision ?? -1) + 1 } };
  } });
  saver.change({ fields: { firstName: 'First' } }); const saving = saver.flush();
  await new Promise(resolve => setImmediate(resolve));
  saver.change({ fields: { firstName: 'Latest' } }); release(); await saving;
  assert.deepEqual(calls.map(call => call.revision), [null, 0]);
  assert.equal(calls[1].snapshot.fields.firstName, 'Latest'); assert.equal(saver.dirty, false); saver.close();
});

test('a conflict pauses autosaving instead of overwriting another tab', async () => {
  let writes = 0; const saver = new DraftSaver({ delay: 10000, maxWait: 10000, onState() {}, onSaved() {}, save: async () => { writes++; const e = new Error('conflict'); e.status = 409; throw e; } });
  saver.change({ fields: { firstName: 'A' } }); await assert.rejects(saver.flush());
  saver.change({ fields: { firstName: 'B' } }); await assert.rejects(saver.flush());
  assert.equal(writes, 1); assert.equal(saver.dirty, true); saver.close();
});

test('failed saves remain dirty and can be retried without losing partial answers', async () => {
  let fail = true; const saver = new DraftSaver({ delay: 10000, maxWait: 10000, retryDelay: 10000, onState() {}, onSaved() {}, save: async snapshot => {
    if (fail) throw new Error('offline'); assert.equal(snapshot.fields.email, 'partial@'); return { draft: { revision: 0 } };
  } });
  saver.change({ fields: { email: 'partial@' } }); await assert.rejects(saver.flush()); assert.equal(saver.dirty, true);
  fail = false; await saver.flush(); assert.equal(saver.dirty, false); saver.close();
});

test('cookie draft endpoints reject cross-site or originless writes and hide tokens in normal responses', async () => {
  const server = createApp({ draftStore: { findDraft: async () => null, hasDraft: async () => false } }).listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const origin of [undefined, 'https://unrelated.example']) {
      const r = await fetch(base + '/api/application-drafts/open', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify({ pagePath: '/contractors/hvac' }) });
      assert.equal(r.status, 403);
    }
    const r = await fetch(base + '/api/application-drafts/open', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3001' }, body: JSON.stringify({ pagePath: '/contractors/hvac' }) });
    assert.equal(r.status, 200); const cookie = r.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Lax/); assert.match(cookie, /Path=\//); assert.match(cookie, /Expires=/);
    assert.deepEqual(await r.json(), { draft: null });
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('production draft cookies are Secure, HttpOnly, host-only, and application-specific', async () => {
  const previous = process.env.NODE_ENV; process.env.NODE_ENV = 'production';
  let app;
  try { app = createApp({ draftStore: { findDraft: async () => null, hasDraft: async () => false } }); }
  finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  try {
    const names = [];
    for (const pagePath of ['/contractors/hvac', '/contractors/plumbing']) {
      const r = await fetch(`http://127.0.0.1:${server.address().port}/api/application-drafts/open`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3001' }, body: JSON.stringify({ pagePath }) });
      const cookie = r.headers.get('set-cookie'); assert.match(cookie, /^__Host-/); assert.match(cookie, /; Secure/); assert.match(cookie, /; HttpOnly/); assert.ok(!cookie.includes('Domain=')); names.push(cookie.split('=')[0]);
    }
    assert.notEqual(names[0], names[1]);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
