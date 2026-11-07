import express from 'express';
import multer from 'multer';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { isIP } from 'node:net';
import { storeSubmission } from './db.mjs';
import { validateSubmission, ValidationError } from './validation.mjs';
import * as defaultDraftStore from './drafts.mjs';
import { installBrowserDrafts } from './browser-drafts.mjs';

const allowedTypes = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/csv', 'application/csv', 'application/vnd.ms-excel', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);

export function createApp({ save = storeSubmission, draftStore = defaultDraftStore, rateLimit = 10, trustFlyClientIp = Boolean(process.env.FLY_APP_NAME), allowedOrigins = process.env.ALLOWED_ORIGINS } = {}) {
  const app = express();
  app.disable('x-powered-by');
  const origins = new Set((allowedOrigins || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3001,http://127.0.0.1:3001').split(',').map(origin => origin.trim()).filter(Boolean));
  const requests = new Map();
  const windowMs = 15 * 60 * 1000;
  const clientIp = req => {
    const flyIp = req.get('Fly-Client-IP');
    // Fly Proxy supplies this header; direct local requests must not be able to choose their quota.
    return trustFlyClientIp && typeof flyIp === 'string' && isIP(flyIp) ? flyIp : req.ip;
  };
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 10, fields: 10, fieldSize: 110000, parts: 20 },
    fileFilter: (_req, file, callback) => {
      callback(allowedTypes.has(file.mimetype) ? null : new ValidationError('Upload a PDF, Word, Excel, CSV, JPG, PNG, or WebP document.'), allowedTypes.has(file.mimetype));
    },
  }).any();

  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN' });
    if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
    next();
  });
  app.get('/api/health', (_req, res) => res.json({ ok: true, databaseConfigured: Boolean(process.env.DATABASE_URL) }));
  const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
  app.use(['/api/drafts', '/api/draft-uploads', '/api/leads'], (req, res, next) => {
    const origin = req.get('origin');
    if (origin && !origins.has(origin)) return res.status(403).json({ error: 'This origin is not allowed to save the form.' });
    const now = Date.now();
    for (const [key, value] of requests) if (value.resetAt <= now) requests.delete(key);
    const key = `draft:${clientIp(req)}`;
    let record = requests.get(key);
    if (!record || record.resetAt <= now) record = { count: 0, resetAt: now + windowMs };
    record.count += 1;
    requests.set(key, record);
    if (record.count > 300) {
      res.set('Retry-After', String(Math.ceil((record.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'Too many save requests. Please wait before trying again.' });
    }
    next();
  }, express.json({ limit: '110kb' }), (req, res, next) => {
    if (req.is('multipart/form-data')) return upload(req, res, next);
    next();
  });
  app.post('/api/drafts', asyncRoute(async (req, res) => res.status(201).json(await draftStore.createDraft(validateSubmission(req.body || {}, req.files || [], { draft: true })))));
  app.get('/api/drafts/:token', asyncRoute(async (req, res) => res.json(await draftStore.getDraft(req.params.token))));
  app.patch('/api/drafts/:token', asyncRoute(async (req, res) => res.json(await draftStore.updateDraft(req.params.token, validateSubmission(req.body || {}, req.files || [], { draft: true })))));
  app.post('/api/drafts/:token/upload-link', asyncRoute(async (req, res) => res.json(await draftStore.issueUploadLink(req.params.token))));
  app.delete('/api/drafts/:token/attachments/:attachmentId', asyncRoute(async (req, res) => res.json(await draftStore.removeDraftAttachment(req.params.token, req.params.attachmentId))));
  app.get('/api/draft-uploads/:token', asyncRoute(async (req, res) => res.json(await draftStore.getUploadLink(req.params.token))));
  app.post('/api/draft-uploads/:token', asyncRoute(async (req, res) => res.status(201).json(await draftStore.uploadToDraft(req.params.token, req.files || []))));
  app.post('/api/leads', asyncRoute(async (req, res) => res.status(201).json(await draftStore.createLead(validateSubmission(req.body || {}, [], { draft: true })))));
  app.patch('/api/leads/:token', asyncRoute(async (req, res) => res.json(await draftStore.updateLead(req.params.token, validateSubmission(req.body || {}, [], { draft: true })))));
  app.post('/api/submissions', (req, res, next) => {
    const origin = req.get('origin');
    if (origin && !origins.has(origin)) return res.status(403).json({ error: 'This origin is not allowed to submit the form.' });
    const now = Date.now();
    for (const [key, value] of requests) if (value.resetAt <= now) requests.delete(key);
    const key = clientIp(req);
    const record = requests.get(key) || { count: 0, resetAt: now + windowMs };
    record.count += 1;
    requests.set(key, record);
    if (record.count > rateLimit) {
      res.set('Retry-After', String(Math.ceil((record.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'Too many requests. Please try again in 15 minutes or call the agency.' });
    }
    next();
  }, express.json({ limit: '110kb' }), (req, res, next) => {
    if (req.is('multipart/form-data')) return upload(req, res, next);
    if (req.is('application/json')) return next();
    return res.status(415).json({ error: 'Send the form as JSON or multipart form data.' });
  }, async (req, res, next) => {
    try {
      const submission = validateSubmission(req.body || {}, req.files || []);
      const result = await save(submission);
      res.status(201).json({ ok: true, ...result, message: 'Your request has been saved. Keep the reference number for your records.' });
    } catch (error) { next(error); }
  });
  const limitedBrowser = (req, res, bucket, max, error) => {
    const now = Date.now(), key = `${bucket}${clientIp(req)}`;
    for (const [entry, record] of requests) if (record.resetAt <= now) requests.delete(entry);
    const record = requests.get(key) || { count: 0, resetAt: now + windowMs };
    record.count += 1; requests.set(key, record);
    if (record.count <= max) return false;
    res.set('Retry-After', String(Math.ceil((record.resetAt - now) / 1000)));
    res.status(429).json({ error }); return true;
  };
  installBrowserDrafts(app, { draftStore, save, production: process.env.NODE_ENV === 'production', origins, limited: limitedBrowser, upload });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
  const dist = resolve('dist');
  if (existsSync(resolve(dist, 'index.html'))) {
    app.use(express.static(dist));
    app.get(/.*/, (_req, res) => res.sendFile(resolve(dist, 'index.html')));
  }
  app.use((error, _req, res, _next) => {
    if (error instanceof ValidationError) return res.status([401, 409].includes(error.statusCode) ? error.statusCode : 400).json({ error: error.message });
    if (error instanceof multer.MulterError) return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Each attachment must be 5 MB or smaller.' : 'Upload at most 10 files and keep the form within the allowed size.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'The form is too large.' });
    if (error instanceof SyntaxError && error.status === 400) return res.status(400).json({ error: 'The form data could not be read.' });
    // Do not log request bodies, connection strings, or database errors containing personal data.
    console.error('Submission storage failed:', error.code || error.name || 'UnknownError');
    res.status(503).json({ error: 'Your request was not saved. Please try again or call 877-747-9020.' });
  });
  return app;
}
