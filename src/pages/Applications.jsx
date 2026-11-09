import { useEffect, useRef, useState } from 'react';
import { DraftSaver } from '../draft-saver.js';
import { draftProgress } from '../data/draft-progress.js';
import { applications, contractors, personalApplications } from '../data/applications.js';
import { getAttribution, trackEvent, trackLead } from '../tracking.js';
import Icon from '../components/Icon.jsx';
import { SuccessCheck } from '../components/CallbackForm.jsx';
import { Breadcrumbs, CallLink, CheckList, IconChip, PageHero, TrustList } from '../components/ui.jsx';

const arrow = <Icon name="arrow-right" size={18} />;
// Smooth scrolling only when the visitor hasn't asked for reduced motion (CSS can't reach scrollIntoView).
const scrollBehavior = () => (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
const applicationIcons = { homeowners: 'home', 'renters-condo': 'renters', 'small-medical': 'medical', apartments: 'multifamily', 'condo-associations': 'building', hoas: 'association' };
const uploadExamples = {
  contractor: 'Current policies, quotes, completed applications, loss runs, spreadsheets, equipment lists, contracts, and insurance requirements all help.',
  personal: 'Current policy declarations pages, renewal notices, vehicle or property details, and any quotes you already have all help.',
  medical: 'Current business and malpractice policies, provider and payroll schedules, equipment lists, and loss runs help. Do not upload patient records.',
  multifamily: 'Current policies, property schedules, loss runs, governing documents, and lender or management requirements all help.',
};


const ACCEPT = '.pdf,.xlsx,.xls,.csv,.doc,.docx,.png,.jpg,.jpeg';
const FILE_EXTENSION = /\.(pdf|xls|xlsx|csv|doc|docx|jpe?g|png)$/i;
const MAX_FILE = 5 * 1024 * 1024;
const MAX_TOTAL = 20 * 1024 * 1024;

async function request(url, options = {}) {
  let response;
  try { response = await fetch(url, options); } catch { throw new Error('We couldn’t reach the server. Check your connection and try again. Your answers are still on this page.'); }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(result.error || 'Your request could not be saved. Please try again.'); error.status = response.status; throw error; }
  return result;
}
const jsonRequest = (url, method, body) => { const text = JSON.stringify(body); return request(url, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: text, keepalive: new TextEncoder().encode(text).length < 60000 }); };
export function fieldIsVisible(field, values) {
  if (!field.when) return true;
  const [key, expected] = field.when.split(':');
  return Array.isArray(values[key]) ? values[key].includes(expected) : values[key] === expected;
}
export function validateFields(fields, values) {
  const errors = {};
  for (const field of fields.filter(item => fieldIsVisible(item, values))) {
    const value = values[field.key];
    if (field.required && (value === undefined || value === '' || (Array.isArray(value) && !value.length) || (typeof value === 'string' && !value.trim()))) {
      errors[field.key] = field.type === 'multiselect' ? 'Choose at least one option.' : 'Please complete this field.';
      continue;
    }
    if (value === undefined || value === '') continue;
    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors[field.key] = 'Enter a valid email address.';
    if (field.type === 'tel' && String(value).replace(/\D/g, '').length < 7) errors[field.key] = 'Enter a valid phone number.';
    if (field.type === 'date') {
      const date = new Date(String(value));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value)) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) errors[field.key] = 'Enter a valid date.';
    }
    if (field.type === 'number' && (!Number.isFinite(Number(value)) || Number(value) < (field.min ?? -Infinity) || Number(value) > (field.max ?? 1e12))) errors[field.key] = `Enter a number${field.min !== undefined ? ` of at least ${field.min}` : ''} and no more than ${field.max ?? 1e12}.`;
    if (field.options && (Array.isArray(value) ? value.some(item => !field.options.includes(item)) : !field.options.includes(value))) errors[field.key] = 'Choose an available option.';
  }
  if (fields.some(field => field.key === 'tripEnd') && values.tripStart && values.tripEnd && values.tripEnd < values.tripStart) errors.tripEnd = 'The trip end date must be on or after the start date.';
  return errors;
}
function validateFiles(files, existing = []) {
  if (files.length + existing.length > 10) return 'You can add up to 10 files.';
  if (files.some(file => !FILE_EXTENSION.test(file.name))) return 'Choose PDF, Excel, CSV, Word, JPG, or PNG files.';
  if (files.some(file => file.size > MAX_FILE)) return 'Each file must be 5 MB or smaller.';
  if (files.reduce((size, file) => size + file.size, 0) + existing.reduce((size, file) => size + Number(file.sizeBytes || 0), 0) > MAX_TOTAL) return 'Your files must total 20 MB or less.';
  return '';
}

function Field({ field, value, error, hidden = false, onChange }) {
  const id = `f-${field.key}`;
  const hintId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy = [field.help && hintId, error && errorId].filter(Boolean).join(' ') || undefined;
  const label = <>{field.label}{field.required && <span className="required"> *</span>}</>;
  const common = { id, name: field.key, disabled: hidden, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': describedBy, required: field.required, value: value ?? '', onChange: event => onChange(field.key, event.target.value) };
  return <div className={`field${['textarea', 'multiselect'].includes(field.type) ? ' wide' : ''}`} data-field={field.key} data-when={field.when} hidden={hidden}>
    {field.type === 'multiselect' ? <fieldset className="checks" aria-describedby={describedBy} aria-invalid={error ? 'true' : undefined}>
      <legend>{label}</legend>
      {field.options.map((option, index) => <label key={option} htmlFor={`${id}-${index}`}><input id={`${id}-${index}`} name={field.key} type="checkbox" value={option} disabled={hidden} checked={Array.isArray(value) && value.includes(option)} onChange={event => onChange(field.key, event.target.checked ? [...(Array.isArray(value) ? value : []), option] : (value || []).filter(item => item !== option))} /> <span>{option}</span></label>)}
    </fieldset> : <><label htmlFor={id}>{label}</label>{field.type === 'select' ? <select {...common}><option value="">Select an answer</option>{field.options.map(option => <option key={option}>{option}</option>)}</select> : field.type === 'textarea' ? <textarea {...common} rows={3} maxLength={6000} /> : <input {...common} type={field.type || 'text'} min={field.min} max={field.type === 'number' ? field.max ?? 1e12 : undefined} step={field.type === 'number' ? 'any' : undefined} maxLength={field.type === 'number' ? undefined : 400} autoComplete={({ firstName: 'given-name', lastName: 'family-name', email: 'email', phone: 'tel', address: 'street-address', zip: 'postal-code', businessName: 'organization' })[field.key]} />}</>}
    {field.help && <small id={hintId}>{field.help}</small>}{error && <p id={errorId} className="form-error" role="alert">{error}</p>}
  </div>;
}

function UploadBox({ attachments, uploadHelp, kind, busy, error, onFiles, onRemove }) {
  const [dragging, setDragging] = useState(false);
  return <div className={`upload-box${dragging ? ' drag-active' : ''}`} id="drop-zone" tabIndex={0} role="group" aria-label="Drag files here or choose documents" onKeyDown={event => { if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget && !busy) { event.preventDefault(); event.currentTarget.querySelector('input[type="file"]')?.click(); } }} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }} onDrop={event => { event.preventDefault(); setDragging(false); if (!busy) onFiles([...event.dataTransfer.files]); }}>
    <span className="upload-icon"><Icon name="cloud-upload" size={28} /></span>
    <label htmlFor="documents"><strong>Add your documents (optional)</strong></label>
    <p>Drag files here or choose the documents you already have. On a phone, you can choose photos or use your camera. You can also skip this step.</p>
    <p className="upload-examples">{uploadHelp || uploadExamples[kind] || uploadExamples.contractor}</p>
    <input id="documents" type="file" multiple accept={ACCEPT} disabled={busy} onChange={event => { onFiles([...event.target.files]); event.target.value = ''; }} aria-describedby="upload-help" />
    <small id="upload-help">PDF, Excel, CSV, Word, JPG, or PNG. Up to 10 files; 5 MB each and 20 MB total. Selected files upload to your private draft. Avoid Social Security numbers, payment details, and driver’s license numbers.</small>
    {busy && <p role="status" className="upload-progress">Uploading your documents…</p>}
    <p id="upload-error" role="alert">{error}</p>
    <ul id="file-list">{attachments.map(file => <li key={file.id}><Icon name="file" size={20} /><span>{file.fileName} <small>{(Number(file.sizeBytes || 0) / 1024).toFixed(0)} KB · Uploaded</small></span>{onRemove && <button type="button" disabled={busy} onClick={() => onRemove(file.id)} aria-label={`Remove ${file.fileName}`}>Remove</button>}</li>)}</ul>
  </div>;
}

function Cards({ items, id }) {
  return <section className="wrap section intake-options" id={id}><div className="card-grid option-grid">{items.map((item, index) => <a className="card option-card" href={item.path} key={item.path} data-reveal style={{ '--reveal-delay': `${(index % 3) * 50}ms` }}><IconChip name={item.icon || applicationIcons[item.slug] || item.slug} /><span className="option-text"><span className="option-title">{item.name}</span><span className="option-description">{item.description}</span></span><span className="card-cta">{item.cta || 'Start your quote'} {arrow}</span></a>)}</div></section>;
}

function ApplicationIndex({ pathname }) {
  const help = <section className="wrap intake-help" data-reveal><p>Not sure which applies? <CallLink /> or <a href="/contact">request a call back</a>.</p></section>;
  if (pathname === '/contractors') return <><PageHero crumbs={[{ label: 'Construction & trades' }]} eyebrow="Construction & trades" title={<>Contractor insurance.<br /><em>Start with your trade.</em></>} lead="Choose your main trade, tell us about your work, and attach any current policies or insurance requirements. We’ll review the information needed for a quote." actions={<CallLink />} /><Cards items={contractors} />{help}<section className="wrap section quote-info" data-reveal><h2>Coverage for contractors and trades</h2><p>We help contractors explore general liability, workers’ compensation, commercial auto, tools and equipment, builders risk, and umbrella coverage. Your operations, contracts, payroll, and job details help us find the right starting point.</p><p>Perform more than one trade? Choose your main trade and describe the rest in your application. Have a complex job? <a href="tel:+18777479020">Call 877-747-9020</a>.</p></section></>;
  if (pathname === '/quote/personal') return <><PageHero crumbs={[{ href: '/quote', label: 'Get a quote' }, { label: 'Personal insurance' }]} eyebrow="Personal insurance" title={<>Personal insurance.<br /><em>Choose your coverage.</em></>} lead="Choose the coverage you need. Share a few details about your home, household, or vehicles, and attach your current policies for a coverage review." actions={<CallLink />} /><Cards items={personalApplications} />{help}</>;
  return <><PageHero crumbs={[{ label: 'Get a quote' }]} eyebrow="Talk with Firebird" title={<>What would you<br /><em>like to protect?</em></>} lead="Choose the type of insurance you need. You can save your progress and return to the application later." actions={<CallLink />} /><Cards id="quote-options" items={[
    { path: '/contractors', name: 'My construction business', description: 'Applications tailored to plumbing, HVAC, electrical, general contractors, and other trades.', cta: 'Choose your trade', icon: 'contractor' },
    { path: '/quote/personal', name: 'My home, vehicles, or other personal coverage', description: 'Home, auto, renters, condo, umbrella, and other personal insurance.', cta: 'Choose your coverage', icon: 'home' },
    { path: '/multifamily', name: 'My property or association', description: 'Condo associations, apartment complexes, and HOAs. Choose your property type.', cta: 'Choose your property', icon: 'multifamily' },
    { path: '/medical-offices', name: 'My dental or medical practice', description: 'Practice-specific applications for dental offices and other small medical practices.', cta: 'Choose your practice', icon: 'medical' },
    { path: '/contact', name: 'Another insurance need', description: 'Trucking and other business insurance needs. Contact us to discuss your coverage.', cta: 'Talk with our team', icon: 'chat' },
  ]} />{help}</>;
}

function QuoteApplication({ application }) {
  const [values, setValues] = useState({});
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [draftToken, setDraftToken] = useState('');
  const [draftStatus, setDraftStatus] = useState('');
  const [saveState, setSaveState] = useState('loading');
  const [lastSaved, setLastSaved] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState(null);
  const [phoneLink, setPhoneLink] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isLocalPreview, setIsLocalPreview] = useState(false);
  const [direction, setDirection] = useState('forward');
  useEffect(() => { setIsLocalPreview(['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)); }, []);
  const heading = useRef(null);
  const panel = useRef(null);
  const latest = useRef(values);
  const tokenRef = useRef('');
  const saver = useRef(null);
  const dirty = useRef(false);

  latest.current = values;
  const formType = `${application.kind}-${application.slug}`;
  const payload = fields => ({ formType, pagePath: application.path, fields: { ...fields, _step: String(step) }, currentStep: step, attribution: getAttribution() });
  const returnLink = draftToken ? `${window.location.origin}${application.path}#draft=${encodeURIComponent(draftToken)}` : '';
  const back = application.kind === 'contractor' ? ['/contractors', 'All construction trades'] : application.kind === 'personal' ? ['/quote/personal', 'All personal applications'] : application.kind === 'medical' ? ['/medical-offices', 'All practice insurance options'] : ['/multifamily', 'All property types'];

  function showSaved(draft, restore = false) {
    tokenRef.current = draft.id;
    setExpiresAt(draft.expiresAt || '');
    setLastSaved(draft.savedAt || '');
    setAttachments(draft.attachments || []);
    if (restore) {
      const restored = { ...draft.fields };
      for (const field of application.groups.flatMap(group => group.fields)) {
        if (field.type === 'select' && typeof restored[field.key] === 'string' && !field.options.includes(restored[field.key])) {
          const updated = restored[field.key].replace(/\s*\u2014\s*/g, ', ');
          if (field.options.includes(updated)) restored[field.key] = updated;
        }
      }
      setValues(restored); latest.current = restored;
      setConsent(false);
      setStep(Math.max(0, Math.min(application.groups.length - 1, draft.currentStep || 0)));
      if (draft.status === 'submitted') setResult({ id: draft.submissionId || draft.id });
    }
  }

  useEffect(() => {
    let active = true;
    const controller = new DraftSaver({
      save: (snapshot, revision) => jsonRequest('/api/application-drafts', 'PUT', { ...payload(snapshot.fields), fields: { ...snapshot.fields, _step: String(snapshot.step) }, currentStep: snapshot.step, revision }),
      onSaved: draft => { if (active) showSaved(draft); },
      onState: (state, error) => {
        if (!active) return;
        setSaveState(state);
        setDraftStatus(error || ({ saving: 'Saving your answers…', saved: 'All changes saved.', unsaved: 'Changes waiting to save.' })[state] || '');
        if (state === 'saved') dirty.current = controller.dirty;
      },
    });
    saver.current = controller;
    const resumeToken = new URLSearchParams(window.location.hash.slice(1)).get('draft');
    jsonRequest('/api/application-drafts/open', 'POST', { pagePath: application.path, ...(resumeToken ? { resumeToken } : {}) }).then(({ draft }) => {
      if (!active) return;
      controller.seed(draft); dirty.current = false;
      if (draft) { showSaved(draft, true); setDraftStatus('Your saved application is ready. Changes save automatically.'); }
      else setDraftStatus('Your answers will save automatically as you type.');
      setSaveState('saved'); setLoading(false);
      if (resumeToken) window.history.replaceState(null, '', application.path);
    }).catch(error => { if (active) { setSaveState('error'); setDraftStatus(error.message); setMessage('We could not open your saved application. Reload to retry.'); } });
    const flush = () => controller.flush().catch(() => {});
    const beforeLeave = event => { if (controller.dirty || controller.pending) { event.preventDefault(); event.returnValue = ''; } };
    const visibility = () => { if (document.visibilityState === 'hidden') flush(); };
    const restoredPage = event => { if (event.persisted) window.location.reload(); };
    window.addEventListener('beforeunload', beforeLeave);
    window.addEventListener('online', flush);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pageshow', restoredPage);
    return () => { active = false; controller.close(); window.removeEventListener('beforeunload', beforeLeave); window.removeEventListener('online', flush); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pageshow', restoredPage); };
  }, [application.path]);

  useEffect(() => {
    if (!dirty.current || loading || result) return;
    saver.current?.change({ fields: { ...values, consent }, step });
  }, [values, step, consent, loading, result]);

  useEffect(() => {
    if (!phoneLink || result) return;
    const poll = setInterval(() => {
      if (document.hidden) return;
      jsonRequest('/api/application-drafts/open', 'POST', { pagePath: application.path }).then(({ draft }) => { if (draft) setAttachments(draft.attachments || []); }).catch(() => {});
    }, 15000);
    return () => clearInterval(poll);
  }, [phoneLink, result, application.path]);

  function update(key, value) {
    dirty.current = true;
    const next = { ...latest.current, [key]: value };
    latest.current = next; setValues(next);
    setErrors(previous => ({ ...previous, [key]: undefined })); setMessage('');
  }

  async function ensureDraft() {
    if (loading || !saver.current) throw new Error('Please wait for the saved application to open.');
    saver.current.change({ fields: { ...latest.current, consent }, step });
    await saver.current.flush();
    if (!tokenRef.current) throw new Error('Enter an answer before saving a return link or adding files.');
    return tokenRef.current;
  }

  async function saveDraft() {
    setSaving(true); setMessage('');
    try {
      await ensureDraft();
      const link = await jsonRequest('/api/application-drafts/link', 'POST', { pagePath: application.path });
      setDraftToken(link.token);
      setDraftStatus('Saved. This browser will remember your draft. Keep the private link to use another device.');
    } catch (error) { setMessage(error.message); } finally { setSaving(false); }
  }

  async function addFiles(files) {
    if (!files.length) return;
    const problem = validateFiles(files, attachments);
    if (problem) { setUploadError(problem); return; }
    setUploading(true); setUploadError('');
    try {
      await ensureDraft();
      await saver.current.exclusive(revision => {
        const body = new FormData();
        body.append('formType', formType); body.append('pagePath', application.path);
        body.append('fields', JSON.stringify({ ...latest.current, consent, _step: String(step) }));
        body.append('currentStep', String(step)); body.append('revision', String(revision));
        if (payload({}).attribution) body.append('attribution', JSON.stringify(payload({}).attribution));
        files.forEach(file => body.append('files', file));
        return request('/api/application-drafts/files', { method: 'POST', body });
      });
      setDraftStatus('Documents uploaded. Your application is saved.');
    } catch (error) { setUploadError(`${error.message} Please choose the files again to retry.`); } finally { setUploading(false); }
  }

  async function removeFile(id) {
    setUploading(true); setUploadError('');
    try {
      const data = await saver.current.exclusive(() => jsonRequest(`/api/application-drafts/files/${encodeURIComponent(id)}`, 'DELETE', { pagePath: application.path }));
      setAttachments(data.attachments || []);
    } catch (error) { setUploadError(error.message); } finally { setUploading(false); }
  }

  async function createPhoneLink() {
    setSaving(true); setMessage('');
    try {
      await ensureDraft();
      const link = await jsonRequest('/api/application-drafts/link', 'POST', { pagePath: application.path });
      const data = await jsonRequest('/api/application-drafts/upload-link', 'POST', { pagePath: application.path });
      setDraftToken(link.token); setPhoneLink(`${window.location.origin}/upload/${encodeURIComponent(data.uploadToken)}`);
    } catch (error) { setMessage(error.message); } finally { setSaving(false); }
  }

  async function forgetBrowser() {
    setSaving(true); setMessage('');
    try {
      await saver.current.flush();
      await jsonRequest('/api/application-drafts/forget', 'POST', { pagePath: application.path });
      dirty.current = false; saver.current.close(); window.location.replace(application.path);
    } catch (error) { setMessage(error.message); setSaving(false); }
  }

  async function copyLink(link, name) {
    try { await navigator.clipboard.writeText(link); setDraftStatus(`${name} copied.`); } catch { setDraftStatus('Select the link and copy it using your browser.'); }
  }

  async function sharePhoneLink() {
    try {
      if (navigator.share) await navigator.share({ title: 'Add documents to your application', url: phoneLink });
      else await copyLink(phoneLink, 'Phone link');
    } catch (error) { if (error.name !== 'AbortError') await copyLink(phoneLink, 'Phone link'); }
  }

  function goToDocuments() {
    goToStep(0);
    requestAnimationFrame(() => panel.current?.querySelector('#drop-zone')?.focus());
  }

  function goToStep(next) {
    dirty.current = true;
    setDirection(next < step ? 'back' : 'forward');
    setStep(next); setErrors({}); setMessage('');
    requestAnimationFrame(() => { heading.current?.focus({ preventScroll: true }); panel.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' }); });
  }

  async function submit(event) {
    event.preventDefault();
    if (submitting || uploading || loading || saving) return;
    const activeStep = panel.current?.querySelector(`.form-step[data-step="${step}"]`);
    const nativeControls = activeStep?.querySelectorAll('input, select, textarea') || [];
    for (const control of nativeControls) {
      if (!control.disabled && !control.checkValidity()) { control.reportValidity(); return; }
    }
    const currentErrors = validateFields(application.groups[step].fields, values);
    if (Object.keys(currentErrors).length) { setErrors(currentErrors); setMessage('Please check the highlighted fields.'); requestAnimationFrame(() => panel.current?.querySelector('[aria-invalid="true"] input, input[aria-invalid="true"], select[aria-invalid="true"], textarea[aria-invalid="true"]')?.focus()); return; }
    if (step < application.groups.length - 1) { goToStep(step + 1); return; }
    for (let index = 0; index < application.groups.length - 1; index++) {
      const issues = validateFields(application.groups[index].fields, values);
      if (Object.keys(issues).length) {
        setDirection('back'); setStep(index); setErrors(issues); setMessage('Please check the highlighted fields before submitting.');
        requestAnimationFrame(() => { const invalid = panel.current?.querySelector('.form-step:not([hidden]) [aria-invalid="true"]'); (invalid?.matches('fieldset') ? invalid.querySelector('input') : invalid)?.focus(); });
        return;
      }
    }
    if (!consent) { setMessage('Please confirm the information and acknowledge the coverage notice.'); return; }
    setSubmitting(true); setMessage('');
    try {
      await ensureDraft();
      const fields = Object.fromEntries(application.groups.flatMap(group => group.fields).filter(field => fieldIsVisible(field, values) && values[field.key] !== undefined).map(field => [field.key, values[field.key]]));
      const body = { ...payload({ ...fields, consent: true, applicationName: application.name }), _hp: honeypot };
      const data = await saver.current.exclusive(revision => jsonRequest('/api/application-drafts/submit', 'POST', { ...body, revision }));
      saver.current.close();
      setResult(data); dirty.current = false;
      jsonRequest('/api/application-drafts/forget', 'POST', { pagePath: application.path }).catch(() => {});
      setPhoneLink('');
      window.history.replaceState(null, '', application.path);
      trackLead({ id: data.id, type: application.name, email: values.email, phone: values.phone });
      requestAnimationFrame(() => { const success = document.getElementById('success'); success?.focus({ preventScroll: true }); panel.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' }); });
    } catch (error) { setMessage(error.message); } finally { setSubmitting(false); }
  }

  const kindLabel = { contractor: 'Contractor insurance', personal: 'Personal insurance', medical: 'Dental & small medical practices', multifamily: 'Multifamily & community associations' }[application.kind] || 'Insurance application';
  const lastStep = application.groups.length - 1;
  const progress = lastStep > 0 ? step / lastStep : 0;
  const shown = value => (value === undefined || value === null || value === '' ? 'Not provided' : value);
  return <><section className="application-hero" data-track-area="hero" data-cta-sentinel><div className="wrap">
      <Breadcrumbs items={[{ href: back[0], label: back[1] }, { label: application.name }]} />
      <span className="eyebrow">{kindLabel}</span>
      <h1>{application.name}<br /><em>Let’s get your quote started.</em></h1>
      <p className="lead">Tell us what you need to protect. We’ll review your application, clarify any questions, and work with insurance companies to explore your options.</p>
    </div></section>
    <div className="application-layout wrap"><aside className="application-aside">
      <div className="aside-card"><h2>Start your application</h2><p>{application.description}</p><CheckList items={[`Questions tailored to your ${application.kind === 'contractor' ? 'trade' : 'coverage'}.`, 'Upload policies, schedules, or requirements.', 'Review everything before sending.']} /></div>
      <div className="aside-note"><strong>Have a question?</strong><p>We can help you get started.</p><CallLink /></div>
      <TrustList className="aside-trust" />
      <small>This is an initial quote application. Additional carrier forms or information may be needed. Coverage is subject to underwriting, policy terms, and availability.</small>
    </aside>
      <section className="application-panel" aria-label="Quote application" ref={panel} data-direction={direction}>
        {result ? <section id="success" role="status" tabIndex={-1}><SuccessCheck /><span className="eyebrow">Application received</span><h2>Thank you. We have your information.</h2><p>Your application and attachments have been saved for The Firebird Agency to review. We’ll use the contact information you provided if we need anything else.</p><p className="success-reference"><strong>Your reference</strong><code id="reference">{result.id}</code></p><p>This confirmation does not bind or change insurance coverage. If you need coverage urgently, call <a href="tel:+18777479020">877-747-9020</a>.</p><a className="button" href="/quote">Start another application {arrow}</a></section> : <form id="intake-form" onSubmit={submit} onBlurCapture={() => saver.current?.flush().catch(() => {})} noValidate aria-busy={loading || submitting}>
          {!loading && <ol className="form-progress" aria-label="Application progress" style={{ '--progress': progress }}>{application.groups.map((group, index) => { const state = index < step ? 'complete' : index === step ? 'current' : 'upcoming'; return <li key={group.title} data-step-label={index} data-state={state} aria-current={index === step ? 'step' : undefined}><span className="form-progress-dot" aria-hidden="true">{state === 'complete' ? <Icon name="check" size={16} strokeWidth={2.5} /> : index + 1}</span><span className="form-progress-label">{group.title}{state === 'complete' && <span className="sr-only"> (completed)</span>}</span></li>; })}</ol>}
          <div className="lead-notice"><strong>Your application saves automatically.</strong><p>Answers and selected documents are saved before submission so you can continue later. Return to this application in the same browser within 30 days of your last save. On a shared device, choose “Forget on this device” when you finish. <a href="/privacy" target="_blank" rel="noopener">Privacy notice</a></p><div className="draft-progress"><label htmlFor="draft-completion">Draft progress: {draftProgress(application.path, values).percentage}%</label><progress id="draft-completion" max="100" value={draftProgress(application.path, values).percentage} /><small>Based on required answers. A completed submission is 100%.</small></div></div>
          <div className="draft-tools"><div className="draft-buttons"><button id="save-return" className="button secondary small" type="button" onClick={saveDraft} disabled={saving || uploading || loading || submitting}>{saving ? 'Saving…' : 'Save & return later'}</button><button id="phone-upload" className="button secondary small" type="button" onClick={createPhoneLink} disabled={saving || uploading || loading || submitting}>Add files from my phone</button></div>
            <p id="draft-status" role="status" aria-live="polite">{draftStatus}</p><small>{lastSaved && <>Last saved: <time dateTime={lastSaved}>{new Date(lastSaved).toLocaleString()}</time></>}</small>{['error', 'conflict'].includes(saveState) && <button type="button" onClick={() => saveState === 'conflict' || loading ? window.location.reload() : saver.current?.flush().catch(() => {})}>{saveState === 'conflict' || loading ? 'Load latest saved draft' : 'Retry saving'}</button>}<button type="button" disabled={loading || saving || uploading || submitting} onClick={forgetBrowser}>Forget on this device</button>
            <div id="private-links" hidden={!returnLink}><label htmlFor="return-link">Your private return link</label><input id="return-link" value={returnLink} readOnly onFocus={event => event.target.select()} /><button id="copy-return" type="button" onClick={() => copyLink(returnLink, 'Return link')}>Copy return link</button><p>Keep this link private: anyone with it can view and edit your saved application. The draft remains available for 30 days after its last save.</p>
              <div id="phone-links" hidden={!phoneLink}><label htmlFor="phone-link">Phone upload link</label><input id="phone-link" value={phoneLink} readOnly onFocus={event => event.target.select()} /><button id="copy-phone" type="button" onClick={() => copyLink(phoneLink, 'Phone link')}>Copy phone link</button><button id="share-phone" type="button" onClick={sharePhoneLink}>Share phone link</button><p>Open this link on your phone to add photos or documents to this application. It does not show your application answers. Share it only with someone you trust.</p>{isLocalPreview && <small>This preview runs on your computer. A phone needs a reachable site address; localhost links work only on this computer.</small>}</div>
            </div>
          </div>
          {loading ? <p role="status" className="loading-note">Opening your private draft…</p> : <><p className="form-note">Fields marked <span className="required">*</span> are required. Estimates are welcome.</p>{application.kind === 'medical' && <p className="form-note">Please provide practice information only. Do not enter patient names, medical records, or other patient-identifying details.</p>}
            <div className="trap" aria-hidden="true"><label>Leave this blank<input name="websiteConfirm" tabIndex={-1} autoComplete="off" value={honeypot} onChange={event => setHoneypot(event.target.value)} /></label></div>
            {application.groups.map((group, index) => <section className="form-step" data-step={index} hidden={index !== step} key={group.title}><h2 tabIndex={-1} ref={index === step ? heading : undefined}>{group.title}</h2><p className="form-step-intro">{group.description}</p>
              {group.fields.length > 0 && <div className="field-grid">{group.fields.map(field => <Field key={field.key} field={field} value={values[field.key]} error={errors[field.key]} hidden={!fieldIsVisible(field, values)} onChange={update} />)}</div>}
              {index === 0 && <UploadBox attachments={attachments} uploadHelp={application.uploadHelp} kind={application.kind} busy={uploading} error={uploadError} onFiles={addFiles} onRemove={removeFile} />}
              {index === lastStep && <><div className="review-heading"><h3>Review your answers</h3><p>Use Back to change an answer. Check your answers and the files saved from either device before submitting. Your answers save as you type.</p></div><div id="review">{step === index && application.groups.slice(0, -1).map((reviewGroup, groupIndex) => <details className="review-group" key={reviewGroup.title} open={groupIndex === 0}><summary>{reviewGroup.title}</summary><dl>{reviewGroup.fields.filter(field => fieldIsVisible(field, values)).map(field => <div key={field.key}><dt>{field.label}</dt><dd>{Array.isArray(values[field.key]) ? values[field.key].join(', ') || 'Not provided' : shown(values[field.key])}</dd></div>)}</dl></details>)}</div><div className="review-documents"><h3>Supporting documents</h3><ul id="review-files">{attachments.map(file => <li key={file.id}><Icon name="file" size={18} />{file.fileName}</li>)}</ul><button id="edit-documents" type="button" className="button secondary small" onClick={goToDocuments}>Add or change documents</button></div><label className="consent"><input id="consent" type="checkbox" required checked={consent} onChange={event => { dirty.current = true; setConsent(event.target.checked); }} /><span>I authorize The Firebird Agency to review this information and contact me about my insurance request. I understand this is a request for a quote and does not bind coverage. <span className="required">*</span></span></label><p className="form-note">Information is saved for agency review. See our <a href="/privacy" target="_blank" rel="noopener">privacy notice</a>. Answers save automatically. Use Save &amp; return later for a private link to continue on another device. Selected files are saved to your draft before submission.</p></>}
            </section>)}</>}
          <p id="form-error" className="form-error" role="alert" tabIndex={-1}>{message}</p>
          {!loading && <div className="form-actions"><button id="back" type="button" className="button secondary" hidden={step === 0} disabled={submitting} onClick={() => goToStep(step - 1)}><Icon name="arrow-left" size={18} /> Back</button><span id="step-count">Step {step + 1} of {application.groups.length}</span><button id="next" type="submit" className="button" hidden={step === lastStep} disabled={submitting || uploading || saving}>Continue {arrow}</button><button id="submit" type="submit" className="button" hidden={step !== lastStep} disabled={submitting || uploading || saving}>{submitting ? 'Submitting…' : 'Submit application'}</button></div>}
        </form>}
      </section></div></>;
}

function PhoneUpload({ token }) {
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(0);
  useEffect(() => { request(`/api/draft-uploads/${encodeURIComponent(token)}`).then(data => setAvailable(Boolean(data.open))).catch(error => setError(error.message)); }, [token]);
  async function upload(files) {
    const problem = validateFiles(files);
    if (problem) { setError(problem); return; }
    if (!files.length) return;
    setBusy(true); setError('');
    try {
      const body = new FormData(); files.forEach(file => body.append('files', file));
      const data = await request(`/api/draft-uploads/${encodeURIComponent(token)}`, { method: 'POST', body });
      setCount(data.attachmentCount || files.length);
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  return <><section className="application-hero"><div className="wrap"><span className="eyebrow">Your private application</span><h1>Add your documents.</h1><p className="lead">Choose documents or photos from this device. They will be added to your application’s private draft.</p></div></section><section className="wrap section phone-upload"><div className="application-panel">{available ? <><UploadBox attachments={[]} busy={busy} error={error} onFiles={upload} /><p className="form-note">This upload-only link does not provide access to your answers or existing documents.</p>{count > 0 && <div className="phone-upload-done" role="status"><SuccessCheck /><p>Upload complete. {count} document{count === 1 ? '' : 's'} saved. You can return to your application on the other device.</p></div>}</> : <p role={error ? 'alert' : 'status'}>{error || 'Checking your upload link…'}</p>}</div></section></>;
}

export const applicationIndexMetadata = {
  '/quote': { documentTitle: 'Start your insurance quote | Firebird Agency', metadataDescription: 'Choose an insurance application for your construction business, property or association, dental or medical practice, or personal coverage.' },
  '/quote/personal': { documentTitle: 'Personal insurance quote applications | Firebird Agency', metadataDescription: 'Start a tailored home, auto, renters, condo, landlord, umbrella, boat, motorcycle, flood, or Mexico auto insurance application.' },
  '/contractors': { documentTitle: 'Construction & trade insurance applications | Firebird Agency', metadataDescription: 'Choose your construction trade for a tailored insurance quote application. Plumbing, HVAC, electrical, general contractors, excavation, and more.' },
};
export function isApplicationPath(pathname) { return Boolean(applications[pathname]) || Object.hasOwn(applicationIndexMetadata, pathname) || /^\/upload\/[^/]+$/.test(pathname); }
export default function ApplicationPage({ pathname }) {
  useEffect(() => {
    const application = applications[pathname];
    const metadata = application || applicationIndexMetadata[pathname];
    document.title = metadata?.documentTitle || (application ? `${application.name} insurance application | Firebird Agency` : 'Upload your documents | Firebird Agency');
    if (metadata?.metadataDescription) document.querySelector('meta[name="description"]')?.setAttribute('content', metadata.metadataDescription);
  }, [pathname]);
  if (pathname.startsWith('/upload/')) return <PhoneUpload key={pathname} token={pathname.slice('/upload/'.length)} />;
  if (applications[pathname]) return <QuoteApplication key={pathname} application={applications[pathname]} />;
  return <ApplicationIndex pathname={pathname} />;
}
