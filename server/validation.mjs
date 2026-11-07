import { applications } from '../src/data/applications.js';

export class ValidationError extends Error {}

function isVisible(field, fields) {
  if (!field.when) return true;
  const [key, expected] = field.when.split(':');
  return Array.isArray(fields[key]) ? fields[key].includes(expected) : fields[key] === expected;
}

function validateApplicationFields(application, fields) {
  for (const field of application.groups.flatMap(group => group.fields)) {
    if (!isVisible(field, fields)) continue;
    const value = fields[field.key];
    const blank = value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length);
    if (blank) {
      if (field.required) throw new ValidationError(`${field.label} is required.`);
      continue;
    }
    if (field.type === 'multiselect') {
      if (!Array.isArray(value) || value.some(item => !field.options.includes(item))) throw new ValidationError(`Choose valid options for ${field.label.toLowerCase()}.`);
      continue;
    }
    if (Array.isArray(value)) throw new ValidationError(`${field.label} requires a single value.`);
    if (typeof value !== 'string' && typeof value !== 'number') throw new ValidationError(`${field.label} has an invalid value.`);
    if (String(value).length > (field.type === 'textarea' ? 6000 : 400)) throw new ValidationError(`${field.label} is too long.`);
    if (field.type === 'select' && !field.options.includes(value)) throw new ValidationError(`Choose a valid option for ${field.label.toLowerCase()}.`);
    if (field.type === 'number') {
      const number = Number(value);
      if (!Number.isFinite(number) || (field.min !== undefined && number < field.min) || number > (field.max ?? 1e12)) throw new ValidationError(`${field.label} must be within the allowed range.`);
    }
    if (field.type === 'date') {
      const date = new Date(String(value));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value)) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new ValidationError(`Enter a valid date for ${field.label.toLowerCase()}.`);
    }
    if (field.type === 'tel' && String(value).replace(/\D/g, '').length < 7) throw new ValidationError('Enter a valid phone number.');
  }
  if (![true, 'true', 'on'].includes(fields.consent)) throw new ValidationError('Please acknowledge the application consent before submitting.');
}

export function validateSubmission(body, files = [], { draft = false } = {}) {
  const formType = String(body.formType ?? '').trim();
  const pagePath = String(body.pagePath ?? '').trim();
  if (!/^[a-z][a-z0-9_-]{1,79}$/.test(formType)) throw new ValidationError('Choose a valid form type.');
  if (!/^\/(?!\/)[^\s?#]{0,299}$/.test(pagePath)) throw new ValidationError('A valid page path is required.');
  const application = applications[pagePath];
  if (!application || formType !== `${application.kind}-${application.slug}`) throw new ValidationError('This application type or page is not valid.');
  let fields = body.fields;
  if (typeof fields === 'string') {
    try { fields = JSON.parse(fields); } catch { throw new ValidationError('The form data could not be read. Please reload and try again.'); }
  }
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) throw new ValidationError('Form fields are required.');
  if (String(body._hp ?? fields._hp ?? '').trim()) throw new ValidationError('The form could not be accepted.');
  const entries = Object.entries(fields).filter(([key]) => key !== '_hp');
  if ((!draft && !entries.length) || entries.length > 150) throw new ValidationError('Please complete the form before submitting.');
  const cleanFields = Object.create(null);
  for (const [key, value] of entries) {
    if (!key || key.length > 100 || ['__proto__', 'prototype', 'constructor'].includes(key)) throw new ValidationError('One of the form fields is invalid.');
    const values = Array.isArray(value) ? value : [value];
    if (values.length > 50) throw new ValidationError('Too many values were supplied for a field.');
    if (values.some(item => !['string', 'number', 'boolean'].includes(typeof item) || String(item).length > 10000)) {
      throw new ValidationError('A form field is too long or has an invalid value.');
    }
    cleanFields[key] = Array.isArray(value) ? values.map(item => typeof item === 'string' && !draft ? item.trim() : item) : (typeof value === 'string' && !draft ? value.trim() : value);
    if (!draft && /email/i.test(key)) {
      for (const email of values) {
        if (String(email).trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) throw new ValidationError('Enter a valid email address.');
      }
    }
  }
  if (Buffer.byteLength(JSON.stringify(cleanFields)) > 100000) throw new ValidationError('The form contains too much information.');
  if (!draft && !Object.values(cleanFields).some(value => Array.isArray(value) ? value.length : String(value).trim())) throw new ValidationError('Please complete the form before submitting.');
  if (!draft) validateApplicationFields(application, cleanFields);
  if (files.length > 10 || files.reduce((sum, file) => sum + file.size, 0) > 20 * 1024 * 1024) throw new ValidationError('Upload at most 10 files, with a combined size of 20 MB or less.');
  for (const file of files) validateFile(file);
  const draftToken = body.draftToken ? validateToken(body.draftToken) : undefined;
  const leadToken = body.leadToken ? validateToken(body.leadToken) : undefined;
  const currentStep = body.currentStep === undefined ? undefined : Number(body.currentStep);
  if (currentStep !== undefined && (!Number.isInteger(currentStep) || currentStep < 0 || currentStep > 3)) throw new ValidationError('Invalid application step.');
  return { formType, pagePath, fields: cleanFields, files, draftToken, leadToken, currentStep };
}

export function validateToken(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new ValidationError('This saved link is invalid.');
  return token;
}

export function validateFile(file) {
  if (!file.size || file.size > 5 * 1024 * 1024) throw new ValidationError('Each attachment must be between 1 byte and 5 MB.');
  const bytes = file.buffer;
  const signature = bytes.subarray(0, 12);
  const types = {
    'application/pdf': () => bytes.subarray(0, 5).toString() === '%PDF-',
    'image/png': () => bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    'image/jpeg': () => signature[0] === 255 && signature[1] === 216 && signature[2] === 255,
    'image/webp': () => signature.subarray(0, 4).toString() === 'RIFF' && signature.subarray(8, 12).toString() === 'WEBP',
    'application/msword': () => /\.doc$/i.test(file.originalname) && signature.subarray(0, 8).equals(Buffer.from([208, 207, 17, 224, 161, 177, 26, 225])),
    'application/vnd.ms-excel': () => (/\.xls$/i.test(file.originalname) && signature.subarray(0, 8).equals(Buffer.from([208, 207, 17, 224, 161, 177, 26, 225]))) || (/\.csv$/i.test(file.originalname) && !bytes.includes(0)),
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': () => /\.docx$/i.test(file.originalname) && signature.subarray(0, 4).equals(Buffer.from([80, 75, 3, 4])),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': () => /\.xlsx$/i.test(file.originalname) && signature.subarray(0, 4).equals(Buffer.from([80, 75, 3, 4])),
    'text/csv': () => /\.csv$/i.test(file.originalname) && !bytes.includes(0),
    'application/csv': () => /\.csv$/i.test(file.originalname) && !bytes.includes(0),
  };
  if (!types[file.mimetype]?.()) throw new ValidationError('Upload a valid PDF, Word, Excel, CSV, JPG, PNG, or WebP document.');
  file.originalname = String(file.originalname).replace(/^.*[\\/]/, '').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 200) || 'attachment';
  file.fieldname = String(file.fieldname).slice(0, 100);
}
