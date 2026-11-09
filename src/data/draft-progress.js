import { applications } from './applications.js';

export const PROGRESS_VERSION = 1;
export function visibleField(field, values) {
  if (!field.when) return true;
  const [key, expected] = field.when.split(':');
  return Array.isArray(values[key]) ? values[key].includes(expected) : values[key] === expected;
}
function complete(field, value) {
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) return false;
  if (field.type === 'multiselect') return Array.isArray(value) && value.length > 0 && value.every(item => field.options.includes(item));
  if (Array.isArray(value)) return false;
  if (!['string', 'number'].includes(typeof value) || String(value).length > (field.type === 'textarea' ? 6000 : 400)) return false;
  if (field.options && !field.options.includes(value)) return false;
  if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false;
  if (field.type === 'tel' && String(value).replace(/\D/g, '').length < 7) return false;
  if (field.type === 'number' && (!Number.isFinite(Number(value)) || Number(value) < (field.min ?? -Infinity) || Number(value) > (field.max ?? 1e12))) return false;
  if (field.type === 'date') {
    const date = new Date(String(value));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  }
  return true;
}
export function draftProgress(pagePath, values = {}, submitted = false) {
  const fields = (applications[pagePath]?.groups.flatMap(group => group.fields) || []).filter(field => visibleField(field, values));
  const required = fields.filter(field => field.required);
  const completed = required.filter(field => complete(field, values[field.key])).length;
  return {
    percentage: submitted ? 100 : Math.min(99, Math.round(completed / Math.max(required.length, 1) * 100)),
    completedRequired: completed, requiredTotal: required.length,
    answeredFields: fields.filter(field => complete(field, values[field.key])).length,
    totalFields: fields.length, definitionVersion: PROGRESS_VERSION,
  };
}
