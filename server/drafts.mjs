import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { databaseClient } from './db.mjs';
import { ValidationError, validateToken, validateFile } from './validation.mjs';
import { draftProgress } from '../src/data/draft-progress.js';

export class DraftConflictError extends ValidationError {
  constructor() { super('Another tab changed this application. Load the latest saved draft before continuing.'); this.statusCode = 409; }
}

const hash = token => createHash('sha256').update(validateToken(token)).digest('hex');
const newToken = () => randomBytes(32).toString('hex');
const expired = () => new ValidationError('This saved link has expired or is unavailable. Start a new application.');

async function transaction(action) {
  const client = databaseClient();
  await client.connect();
  try {
    await client.query('BEGIN');
    const result = await action(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { await client.end(); }
}

async function attachments(client, id) {
  const result = await client.query('SELECT id, file_name AS "fileName", content_type AS "contentType", size_bytes AS "sizeBytes", field_name AS "fieldName" FROM draft_attachments WHERE draft_id = $1 ORDER BY created_at, id', [id]);
  return result.rows;
}

async function insertFiles(client, draftId, files) {
  const usage = await client.query('SELECT count(*)::int AS count, coalesce(sum(size_bytes), 0)::int AS bytes FROM draft_attachments WHERE draft_id = $1', [draftId]);
  if (usage.rows[0].count + files.length > 10 || usage.rows[0].bytes + files.reduce((sum, file) => sum + file.size, 0) > 20 * 1024 * 1024) throw new ValidationError('Upload at most 10 files, with a combined size of 20 MB or less.');
  for (const file of files) {
    validateFile(file);
    await client.query('INSERT INTO draft_attachments (id, draft_id, field_name, file_name, content_type, size_bytes, content) VALUES ($1, $2, $3, $4, $5, $6, $7)', [randomUUID(), draftId, file.fieldname, file.originalname, file.mimetype, file.size, file.buffer]);
  }
}

export async function createDraft({ formType, pagePath, fields, files = [], currentStep, reservedToken }) {
  const id = randomUUID();
  const token = reservedToken ? validateToken(reservedToken) : newToken();
  const uploadToken = newToken();
  return transaction(async client => {
    const p = draftProgress(pagePath, fields);
    const result = await client.query('INSERT INTO form_drafts (id, token_hash, upload_token_hash, form_type, page_path, fields, current_step, completion_percent, completed_required_fields, required_fields, answered_fields, total_fields, progress_version) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (token_hash) DO NOTHING RETURNING expires_at AS "expiresAt"', [id, hash(token), hash(uploadToken), formType, pagePath, JSON.stringify(fields), currentStep ?? 0, p.percentage, p.completedRequired, p.requiredTotal, p.answeredFields, p.totalFields, p.definitionVersion]);
    if (!result.rows[0]) throw new DraftConflictError();
    await insertFiles(client, id, files);
    return { id, token, uploadToken, expiresAt: result.rows[0].expiresAt };
  });
}

export async function findDraft(token) {
  return transaction(async client => {
    const result = await client.query('SELECT id, form_type AS "formType", page_path AS "pagePath", fields, status, submission_id AS "submissionId", current_step AS "currentStep", expires_at AS "expiresAt", updated_at AS "savedAt", revision FROM form_drafts WHERE token_hash = $1 AND expires_at > now()', [hash(token)]);
    const draft = result.rows[0];
    if (!draft) return null;
    return { ...draft, progress: draftProgress(draft.pagePath, draft.fields, draft.status === 'submitted'), attachments: await attachments(client, draft.id) };
  });
}

export async function getDraft(token) {
  const draft = await findDraft(token);
  if (!draft) throw expired();
  return draft;
}
export async function hasDraft(token) {
  return transaction(async client => Boolean((await client.query('SELECT 1 FROM form_drafts WHERE token_hash=$1', [hash(token)])).rowCount));
}

export async function updateDraft(token, { formType, pagePath, fields, files = [], currentStep, expectedRevision }) {
  return transaction(async client => {
    const result = await client.query("SELECT id, form_type, page_path, revision, expires_at AS \"expiresAt\" FROM form_drafts WHERE token_hash = $1 AND expires_at > now() AND status = 'draft' FOR UPDATE", [hash(token)]);
    const draft = result.rows[0];
    if (!draft) throw expired();
    if (draft.form_type !== formType || draft.page_path !== pagePath) throw new ValidationError('This draft belongs to a different application.');
    if (expectedRevision !== undefined && expectedRevision !== draft.revision) throw new DraftConflictError();
    await insertFiles(client, draft.id, files);
    const p = draftProgress(pagePath, fields);
    const saved = await client.query("UPDATE form_drafts SET fields=$1::jsonb, current_step=coalesce($2,current_step), revision=revision+1, updated_at=now(), expires_at=now()+interval '30 days', completion_percent=$4, completed_required_fields=$5, required_fields=$6, answered_fields=$7, total_fields=$8, progress_version=$9 WHERE id=$3 RETURNING expires_at AS \"expiresAt\", revision, updated_at AS \"savedAt\"", [JSON.stringify(fields), currentStep, draft.id, p.percentage, p.completedRequired, p.requiredTotal, p.answeredFields, p.totalFields, p.definitionVersion]);
    return { id: draft.id, ...saved.rows[0], progress: p, attachments: await attachments(client, draft.id) };
  });
}

export async function issueUploadLink(token) {
  const uploadToken = newToken();
  return transaction(async client => {
    const result = await client.query("UPDATE form_drafts SET upload_token_hash = $1 WHERE token_hash = $2 AND expires_at > now() AND status = 'draft' RETURNING expires_at AS \"expiresAt\"", [hash(uploadToken), hash(token)]);
    if (!result.rows[0]) throw expired();
    return { uploadToken, expiresAt: result.rows[0].expiresAt };
  });
}

export async function getUploadLink(token) {
  return transaction(async client => {
    const result = await client.query("SELECT expires_at AS \"expiresAt\" FROM form_drafts WHERE upload_token_hash = $1 AND expires_at > now() AND status = 'draft'", [hash(token)]);
    if (!result.rows[0]) throw expired();
    return { open: true, expiresAt: result.rows[0].expiresAt };
  });
}

export async function uploadToDraft(token, files) {
  if (!files.length) throw new ValidationError('Choose at least one file to upload.');
  return transaction(async client => {
    const result = await client.query("SELECT id FROM form_drafts WHERE upload_token_hash = $1 AND expires_at > now() AND status = 'draft' FOR UPDATE", [hash(token)]);
    if (!result.rows[0]) throw expired();
    await insertFiles(client, result.rows[0].id, files);
    return { ok: true, attachmentCount: files.length };
  });
}

export async function removeDraftAttachment(token, attachmentId) {
  if (!/^[0-9a-f-]{36}$/i.test(attachmentId)) throw new ValidationError('Invalid attachment.');
  return transaction(async client => {
    const result = await client.query("SELECT id FROM form_drafts WHERE token_hash = $1 AND expires_at > now() AND status = 'draft' FOR UPDATE", [hash(token)]);
    if (!result.rows[0]) throw expired();
    await client.query('DELETE FROM draft_attachments WHERE id = $1 AND draft_id = $2', [attachmentId, result.rows[0].id]);
    return { ok: true, attachments: await attachments(client, result.rows[0].id) };
  });
}

const leadFields = new Set(['firstName', 'lastName', 'name', 'email', 'phone', 'businessName', 'company', 'trade', 'contactPreference', '_step']);
function contactOnly(fields) {
  return Object.fromEntries(Object.entries(fields).filter(([key]) => leadFields.has(key)));
}

export async function createLead({ formType, pagePath, fields }) {
  const leadToken = newToken();
  return transaction(async client => {
    const result = await client.query('INSERT INTO incomplete_leads (id, token_hash, form_type, page_path, fields) VALUES ($1, $2, $3, $4, $5::jsonb) RETURNING expires_at AS "expiresAt"', [randomUUID(), hash(leadToken), formType, pagePath, JSON.stringify(contactOnly(fields))]);
    return { leadToken, expiresAt: result.rows[0].expiresAt };
  });
}

export async function updateLead(token, { formType, pagePath, fields }) {
  return transaction(async client => {
    const result = await client.query("UPDATE incomplete_leads SET fields = $1::jsonb, updated_at = now() WHERE token_hash = $2 AND form_type = $3 AND page_path = $4 AND expires_at > now() AND status = 'incomplete' RETURNING expires_at AS \"expiresAt\"", [JSON.stringify(contactOnly(fields)), hash(token), formType, pagePath]);
    if (!result.rows[0]) throw expired();
    return { ok: true, expiresAt: result.rows[0].expiresAt };
  });
}
