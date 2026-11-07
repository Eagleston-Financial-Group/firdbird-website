import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from './app.mjs';
import { validateSubmission } from './validation.mjs';
import { applicationFixture } from './test-fixture.mjs';
import { applicationPaths } from '../src/data/applications.js';

const fixture = applicationFixture();

async function withServer(options, run) {
  const server = createApp(options).listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('a valid form returns the database reference and preserves multiple selections', async () => {
  let saved;
  await withServer({ save: async input => { saved = input; return { id: 'saved-reference', attachmentCount: 0 }; } }, async base => {
    const response = await fetch(`${base}/api/submissions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...fixture, fields: { ...fixture.fields, firstName: ' Test ', coverages: ['Commercial auto', 'Property'] } }) });
    assert.equal(response.status, 201);
    assert.equal((await response.json()).id, 'saved-reference');
    assert.equal(saved.fields.firstName, 'Test');
    assert.deepEqual(saved.fields.coverages, ['Commercial auto', 'Property']);
  });
});

test('invalid email, empty fields, unexpected values, and honeypot never reach storage', async () => {
  await withServer({ save: async () => { assert.fail('Invalid data reached the database'); } }, async base => {
    for (const input of [
      { ...fixture, fields: { email: 'invalid' } },
      { ...fixture, fields: {} },
      { ...fixture, fields: { nested: { secret: true } } },
      { ...fixture, _hp: 'spam' },
    ]) {
      const response = await fetch(`${base}/api/submissions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
      assert.equal(response.status, 400);
      assert.equal(typeof (await response.json()).error, 'string');
    }
  });
});

test('cross-origin submissions are refused', async () => {
  await withServer({ save: async () => assert.fail('Cross-origin request reached storage') }, async base => {
    const response = await fetch(`${base}/api/submissions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://unrelated.example' }, body: JSON.stringify(fixture) });
    assert.equal(response.status, 403);
  });
});

test('multipart documents are saved with their real bytes and spoofed files are rejected', async () => {
  let saved;
  await withServer({ save: async input => { saved = input; return { id: 'document-reference', attachmentCount: input.files.length }; } }, async base => {
    const form = new FormData();
    form.set('formType', fixture.formType);
    form.set('pagePath', '/contractors/plumbing');
    form.set('fields', JSON.stringify(fixture.fields));
    form.append('documents', new Blob(['%PDF-1.7\nSynthetic test document\n%%EOF'], { type: 'application/pdf' }), 'policy.pdf');
    let response = await fetch(`${base}/api/submissions`, { method: 'POST', body: form });
    assert.equal(response.status, 201);
    assert.equal((await response.json()).attachmentCount, 1);
    assert.equal(saved.files[0].buffer.subarray(0, 5).toString(), '%PDF-');
    form.set('documents', new Blob(['<script>spoofed</script>'], { type: 'application/pdf' }), 'policy.pdf');
    response = await fetch(`${base}/api/submissions`, { method: 'POST', body: form });
    assert.equal(response.status, 400);
  });
});

test('combined upload limit is enforced before persistence', () => {
  const files = Array.from({ length: 5 }, () => ({ size: 5 * 1024 * 1024 }));
  assert.throws(() => validateSubmission(fixture, files), /20 MB/);
});

test('final submissions enforce route, consent, required fields, enums, and numeric ranges', () => {
  for (const change of [
    { ...fixture, pagePath: '/quote' },
    { ...fixture, formType: 'unknown' },
    { ...fixture, fields: { ...fixture.fields, firstName: '' } },
    { ...fixture, fields: { ...fixture.fields, consent: false } },
    { ...fixture, fields: { ...fixture.fields, plumbingWork: ['Unknown activity'] } },
    { ...fixture, fields: { ...fixture.fields, residentialPercent: '-10' } },
    { ...fixture, fields: { ...fixture.fields, effectiveDate: '2027-02-31' } },
  ]) assert.throws(() => validateSubmission(change), /required|valid|consent|range/);
  assert.doesNotThrow(() => validateSubmission({ ...fixture, fields: { email: 'partial@', firstName: '' } }, [], { draft: true }));
});

test('all 28 application schemas accept complete synthetic required answers', () => {
  assert.equal(applicationPaths.length, 28);
  for (const path of applicationPaths) assert.doesNotThrow(() => validateSubmission(applicationFixture(path)), path);
});

test('rate limit returns retry information instead of accepting another record', async () => {
  await withServer({ rateLimit: 1, save: async () => ({ id: 'only-one' }) }, async base => {
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fixture) };
    assert.equal((await fetch(`${base}/api/submissions`, options)).status, 201);
    const response = await fetch(`${base}/api/submissions`, options);
    assert.equal(response.status, 429);
    assert.ok(Number(response.headers.get('retry-after')) > 0);
  });
});

test('database errors produce an explicit unsaved response without leaking details', async () => {
  await withServer({ save: async () => { throw new Error('secret database connection details'); } }, async base => {
    const response = await fetch(`${base}/api/submissions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fixture) });
    assert.equal(response.status, 503);
    const result = await response.json();
    assert.match(result.error, /not saved/);
    assert.ok(!JSON.stringify(result).includes('secret'));
  });
});

test('Fly clients have separate submission quotas and each repeated client is limited', async () => {
  let saved = 0;
  await withServer({ trustFlyClientIp: true, rateLimit: 1, save: async () => ({ id: String(++saved) }) }, async base => {
    for (const [ip, status] of [
      ['198.51.100.1', 201], ['2001:db8::2', 201],
      ['198.51.100.1', 429], ['2001:db8::2', 429],
    ]) {
      const response = await fetch(base + '/api/submissions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Fly-Client-IP': ip }, body: JSON.stringify(fixture),
      });
      assert.equal(response.status, status);
      if (status === 429) assert.ok(Number(response.headers.get('retry-after')) > 0);
      await response.json();
    }
    assert.equal(saved, 2);
  });
});

test('missing or malformed Fly client addresses fall back to the connection quota', async () => {
  await withServer({ trustFlyClientIp: true, rateLimit: 1, save: async () => ({ id: 'saved' }) }, async base => {
    for (const [ip, status] of [
      ['198.51.100.1, 198.51.100.2', 201], ['not-an-ip', 429],
      ['198.51.100.1:8080', 429], [undefined, 429], ['198.51.100.3', 201],
    ]) {
      const headers = { 'Content-Type': 'application/json', 'X-Forwarded-For': '203.0.113.' + (status === 201 ? '1' : '2') };
      if (ip !== undefined) headers['Fly-Client-IP'] = ip;
      const response = await fetch(base + '/api/submissions', { method: 'POST', headers, body: JSON.stringify(fixture) });
      assert.equal(response.status, status);
      await response.json();
    }
  });
});

test('local deployments ignore spoofed Fly and forwarded client addresses', async () => {
  await withServer({ trustFlyClientIp: false, rateLimit: 1, save: async () => ({ id: 'saved' }) }, async base => {
    for (const [ip, status] of [['198.51.100.1', 201], ['198.51.100.2', 429]]) {
      const response = await fetch(base + '/api/submissions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Fly-Client-IP': ip, 'X-Forwarded-For': ip }, body: JSON.stringify(fixture),
      });
      assert.equal(response.status, status);
      await response.json();
    }
  });
});

test('Fly draft traffic limits repeated clients without consuming another client quota', async () => {
  let reads = 0;
  await withServer({ trustFlyClientIp: true, draftStore: { getDraft: async () => ({ id: String(++reads) }) } }, async base => {
    for (let request = 0; request < 301; request += 1) {
      const response = await fetch(base + '/api/drafts/synthetic-token', { headers: { 'Fly-Client-IP': '198.51.100.1' } });
      assert.equal(response.status, request < 300 ? 200 : 429);
      await response.json();
    }
    const response = await fetch(base + '/api/drafts/synthetic-token', { headers: { 'Fly-Client-IP': '198.51.100.2' } });
    assert.equal(response.status, 200);
    await response.json();
    assert.equal(reads, 301);
  });
});
