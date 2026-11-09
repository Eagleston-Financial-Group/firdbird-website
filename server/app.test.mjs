import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from './app.mjs';
import { validateCallback, validateSubmission } from './validation.mjs';
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

test('ad-click attribution is kept with submissions, limited to known keys, and stripped of query strings', async () => {
  let saved;
  await withServer({ save: async input => { saved = input; return { id: 'saved' }; } }, async base => {
    const attribution = { gclid: 'Cj0-test', utm_source: 'google', utm_campaign: 'contractors-az', landingPage: '/contractors?gclid=Cj0-test&email=a@b.test', referrer: 'https://www.google.com/search?q=private', unknown: 'drop me', utm_term: { nested: true } };
    const response = await fetch(`${base}/api/submissions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...fixture, attribution }) });
    assert.equal(response.status, 201);
    assert.deepEqual(saved.attribution, { gclid: 'Cj0-test', utm_source: 'google', utm_campaign: 'contractors-az', landingPage: '/contractors', referrer: 'https://www.google.com/search' });
  });
  assert.equal(validateSubmission({ ...fixture, attribution: 'not json' }).attribution, undefined);
  assert.equal(validateSubmission({ ...fixture, attribution: ['gclid'] }).attribution, undefined);
});

const callback = { name: 'Synthetic Test', phone: '(555) 010-0100', email: 'firebird-qa@example.test', topic: 'Contractor insurance', bestTime: 'Morning', message: 'Automated verification.', consent: true, attribution: { gbraid: 'test-gbraid' } };

test('callback requests are validated and saved with attribution', async () => {
  let saved;
  await withServer({ saveCallback: async input => { saved = input; return { id: 'callback-reference' }; } }, async base => {
    const response = await fetch(`${base}/api/callbacks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(callback) });
    assert.equal(response.status, 201);
    assert.equal((await response.json()).id, 'callback-reference');
    assert.deepEqual(saved, { fields: { name: 'Synthetic Test', phone: '(555) 010-0100', topic: 'Contractor insurance', bestTime: 'Morning', consent: true, email: 'firebird-qa@example.test', message: 'Automated verification.' }, attribution: { gbraid: 'test-gbraid' } });
  });
});

test('callback requests keep a well-formed source page and drop a malformed one', () => {
  const valid = validateCallback({ ...callback, topic: 'Other personal insurance', pagePath: '/insurance/motorcycle' });
  assert.equal(valid.fields.pagePath, '/insurance/motorcycle');
  assert.equal(valid.fields.topic, 'Other personal insurance');
  for (const pagePath of ['https://evil.example/x', '/contact?email=a@b.test', '/<script>', 42]) {
    assert.equal(validateCallback({ ...callback, pagePath }).fields.pagePath, undefined);
  }
});

test('invalid, spam, and cross-origin callback requests never reach storage', async () => {
  await withServer({ saveCallback: async () => assert.fail('Invalid callback reached storage') }, async base => {
    for (const input of [{ ...callback, phone: '123' }, { ...callback, consent: false }, { ...callback, topic: 'Free money' }, { ...callback, email: 'bad' }, { ...callback, name: '' }, { ...callback, _hp: 'bot' }, { ...callback, bestTime: 'Midnight' }]) {
      const response = await fetch(`${base}/api/callbacks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
      assert.equal(response.status, 400);
      assert.equal(typeof (await response.json()).error, 'string');
    }
    const crossOrigin = await fetch(`${base}/api/callbacks`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.example' }, body: JSON.stringify(callback) });
    assert.equal(crossOrigin.status, 403);
    await crossOrigin.json();
  });
});

test('callback requests have their own rate-limit bucket', async () => {
  await withServer({ rateLimit: 1, save: async () => ({ id: 'saved' }), saveCallback: async () => ({ id: 'callback' }) }, async base => {
    const send = path => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(path === '/api/callbacks' ? callback : fixture) });
    assert.equal((await send('/api/callbacks')).status, 201);
    const limited = await send('/api/callbacks');
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
    assert.equal((await send('/api/submissions')).status, 201);
  });
});

test('new drafts and leads are capped per client while existing drafts stay available', async () => {
  let created = 0;
  const draftStore = { createDraft: async () => ({ id: String(++created), token: 'a'.repeat(64) }), createLead: async () => ({ leadToken: 'b'.repeat(64) }), getDraft: async () => ({ id: 'existing' }) };
  await withServer({ createLimit: 2, draftStore }, async base => {
    const body = JSON.stringify({ formType: fixture.formType, pagePath: fixture.pagePath, fields: {} });
    const post = path => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    assert.equal((await post('/api/drafts')).status, 201);
    assert.equal((await post('/api/leads')).status, 201);
    assert.equal((await post('/api/drafts')).status, 429);
    assert.equal((await fetch(`${base}/api/drafts/${'a'.repeat(64)}`)).status, 200);
    assert.equal(created, 1);
  });
});

test('the site returns real 404s, hides upload links from search, and publishes robots and sitemap', async () => {
  const { mkdtemp, mkdir, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const distDir = await mkdtemp(join(tmpdir(), 'firebird-dist-'));
  try {
    await mkdir(join(distDir, 'assets'));
    await mkdir(join(distDir, 'contact'));
    await mkdir(join(distDir, 'contractors', 'plumbing'), { recursive: true });
    await writeFile(join(distDir, '_shell.html'), '<!doctype html><div id="root"></div><!-- shell -->');
    await writeFile(join(distDir, 'index.html'), '<!doctype html><div id="root"><h1>home</h1></div>');
    await writeFile(join(distDir, 'contact', 'index.html'), '<!doctype html><div id="root"><h1>contact</h1></div>');
    await writeFile(join(distDir, 'contractors', 'plumbing', 'index.html'), '<!doctype html><div id="root"><h1>plumbing</h1></div>');
    await writeFile(join(distDir, 'assets', 'index-abc123.js'), 'console.log(1)');
    await writeFile(join(distDir, 'routes.json'), JSON.stringify(['/', '/contact', '/contractors/plumbing']));
    await withServer({ distDir, siteUrl: 'https://example.test/', production: true }, async base => {
      for (const [path, status, marker] of [['/', 200, 'home'], ['/contact', 200, 'contact'], ['/contact/', 200, 'contact'], ['/contractors/plumbing', 200, 'plumbing'], ['/no-such-page', 404, 'shell']]) {
        const response = await fetch(base + path, { redirect: 'manual' });
        assert.equal(response.status, status, path);
        const body = await response.text();
        assert.match(body, /id="root"/);
        assert.ok(body.includes(marker), `${path} should serve the ${marker} page`);
        assert.equal(response.headers.get('x-robots-tag'), status === 404 ? 'noindex' : null);
        assert.match(response.headers.get('strict-transport-security'), /max-age=/);
      }
      const upload = await fetch(`${base}/upload/${'c'.repeat(64)}`);
      assert.equal(upload.status, 200);
      assert.equal(upload.headers.get('x-robots-tag'), 'noindex, nofollow');
      assert.match(await upload.text(), /shell/);
      const robots = await (await fetch(`${base}/robots.txt`)).text();
      assert.match(robots, /Disallow: \/upload\//);
      assert.match(robots, /Sitemap: https:\/\/example\.test\/sitemap\.xml/);
      const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
      assert.match(sitemap, /<loc>https:\/\/example\.test\/contractors\/plumbing<\/loc>/);
      assert.doesNotMatch(sitemap, /upload/);
      const asset = await fetch(`${base}/assets/index-abc123.js`);
      assert.match(asset.headers.get('cache-control'), /immutable/);
      await asset.text();
    });
  } finally { await rm(distDir, { recursive: true, force: true }); }
});
