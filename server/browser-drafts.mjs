import { createHash, randomBytes } from 'node:crypto';
import express from 'express';
import { applications } from '../src/data/applications.js';
import { validateSubmission, validateToken, ValidationError } from './validation.mjs';

export const cookieName = (path, production) => `${production ? '__Host-' : ''}fb_draft_${createHash('sha256').update(path).digest('hex').slice(0, 16)}`;
export function readDraftCookie(req, path, production) {
  const name = cookieName(path, production);
  const matches = (req.headers.cookie || '').split(';').map(part => part.trim()).filter(part => part.startsWith(`${name}=`));
  if (matches.length !== 1) return null;
  const token = matches[0].slice(name.length + 1);
  return /^[a-f0-9]{64}$/.test(token) ? token : null;
}
export function installBrowserDrafts(app, { draftStore, save, production, origins, limited, upload }) {
  const setCookie = (res, path, token, expires) => res.cookie(cookieName(path, production), token, {
    httpOnly: true, secure: production, sameSite: 'lax', path: '/',
    expires: expires ? new Date(expires) : new Date(Date.now() + 30 * 86400000),
  });
  const clearCookie = (res, path) => res.clearCookie(cookieName(path, production), { httpOnly: true, secure: production, sameSite: 'lax', path: '/' });
  const route = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
  const pathOf = req => {
    const path = req.body?.pagePath || req.query.pagePath;
    if (typeof path !== 'string' || !Object.hasOwn(applications, path)) throw new ValidationError('Choose a valid application.');
    return path;
  };
  const tokenOf = (req, path) => {
    const token = readDraftCookie(req, path, production);
    if (!token) { const error = new ValidationError('Your browser could not remember this draft. Allow cookies for this site and reload.'); error.statusCode = 401; throw error; }
    return token;
  };
  const checked = (req, path, draft = true) => {
    const input = validateSubmission({ ...req.body, pagePath: path, draftToken: undefined, leadToken: undefined }, req.files || [], { draft });
    const allowed = new Set(applications[path].groups.flatMap(group => group.fields).map(field => field.key).concat(['_step', 'consent', 'applicationName']));
    if (Object.keys(input.fields).some(key => !allowed.has(key))) throw new ValidationError('One of the application fields is not recognized.');
    return input;
  };
  app.use('/api/application-drafts', (req, res, next) => {
    res.set({ 'Cache-Control': 'private, no-store', Vary: 'Cookie', 'X-Robots-Tag': 'noindex, nofollow' });
    const origin = req.get('origin');
    if (req.get('sec-fetch-site') === 'cross-site' || (origin && !origins.has(origin)) || (req.method !== 'GET' && !origin)) return res.status(403).json({ error: 'Open the application on this website to save it.' });
    if (limited(req, res, 'browser-draft:', 1800, 'Too many save requests. Please wait a moment and retry.')) return;
    if (req.method === 'POST' && req.path === '/open' && limited(req, res, 'browser-open:', 120, 'Please wait before opening another application.')) return;
    next();
  });
  app.use('/api/application-drafts', express.json({ limit: '110kb' }));
  const json = (req, res, next) => {
    if (!req.is('application/json')) return res.status(415).json({ error: 'Send application data as JSON.' });
    next();
  };
  // Parsing is supplied by Express at installation to keep all request limits consistent.
  app.post('/api/application-drafts/open', json, route(async (req, res) => {
    const path = pathOf(req);
    let token = readDraftCookie(req, path, production);
    if (req.body.resumeToken) token = validateToken(req.body.resumeToken);
    let draft = token ? await draftStore.findDraft(token) : null;
    if (draft && draft.pagePath !== path) throw new ValidationError('This saved link belongs to another application.');
    if (req.body.resumeToken && !draft) throw new ValidationError('This saved link has expired or is unavailable.');
    if (!draft && req.body.resumeToken === undefined && token && await draftStore.hasDraft(token)) token = null;
    token ||= randomBytes(32).toString('hex');
    setCookie(res, path, token, draft?.expiresAt);
    res.json({ draft });
  }));
  app.put('/api/application-drafts', json, route(async (req, res) => {
    const path = pathOf(req), token = tokenOf(req, path), input = checked(req, path);
    const revision = req.body.revision;
    if (revision !== null && (!Number.isInteger(revision) || revision < 0)) throw new ValidationError('Reload the saved application before editing.');
    const existing = await draftStore.findDraft(token);
    if (!existing) {
      if (revision !== null || await draftStore.hasDraft(token)) return res.status(409).json({ error: 'This draft is unavailable. Reload to start or restore an application.' });
      if (!Object.entries(input.fields).some(([key, value]) => key !== '_step' && key !== 'consent' && (Array.isArray(value) ? value.length : String(value).trim()))) return res.json({ draft: null });
      if (limited(req, res, 'browser-create:', 30, 'Too many new drafts. Please wait or call the agency.')) return;
      await draftStore.createDraft({ ...input, reservedToken: token });
    } else {
      if (existing.pagePath !== path) throw new ValidationError('This draft belongs to another application.');
      await draftStore.updateDraft(token, { ...input, expectedRevision: revision });
    }
    const draft = await draftStore.getDraft(token);
    setCookie(res, path, token, draft.expiresAt);
    res.json({ draft });
  }));
  app.post('/api/application-drafts/link', json, route(async (req, res) => {
    const path = pathOf(req), token = tokenOf(req, path), draft = await draftStore.getDraft(token);
    if (draft.pagePath !== path) throw new ValidationError('This draft belongs to another application.');
    res.json({ token, expiresAt: draft.expiresAt });
  }));
  app.post('/api/application-drafts/upload-link', json, route(async (req, res) => {
    const path = pathOf(req), token = tokenOf(req, path), draft = await draftStore.getDraft(token);
    if (draft.pagePath !== path) throw new ValidationError('This draft belongs to another application.');
    res.json(await draftStore.issueUploadLink(token));
  }));
  app.post('/api/application-drafts/files', upload, route(async (req, res) => {
    const path = pathOf(req), token = tokenOf(req, path), input = checked(req, path);
    const revision = Number(req.body.revision);
    if (!Number.isInteger(revision) || revision < 0) throw new ValidationError('Reload the saved application before adding files.');
    await draftStore.updateDraft(token, { ...input, expectedRevision: revision });
    res.json({ draft: await draftStore.getDraft(token) });
  }));
  app.delete('/api/application-drafts/files/:attachmentId', json, route(async (req, res) => {
    const path = pathOf(req), token = tokenOf(req, path), draft = await draftStore.getDraft(token);
    if (draft.pagePath !== path) throw new ValidationError('This draft belongs to another application.');
    res.json(await draftStore.removeDraftAttachment(token, req.params.attachmentId));
  }));
  app.post('/api/application-drafts/submit', json, route(async (req, res) => {
    const path = pathOf(req), token = tokenOf(req, path), input = checked(req, path, false);
    if (!Number.isInteger(req.body.revision) || req.body.revision < 0) throw new ValidationError('Reload the saved application before submitting.');
    const result = await save({ ...input, draftToken: token, expectedRevision: req.body.revision });
    res.status(201).json({ ok: true, ...result });
  }));
  app.post('/api/application-drafts/forget', json, route(async (req, res) => {
    clearCookie(res, pathOf(req));
    res.json({ ok: true });
  }));
}
