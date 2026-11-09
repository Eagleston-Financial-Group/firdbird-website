import { useId, useRef, useState } from 'react';
import { callbackLimits, callbackTimes, contactTopics } from '../data/marketing.js';
import { getAttribution, trackEvent, trackLead } from '../tracking.js';

const copy = {
  full: { heading: 'Request a call back', intro: 'Leave your number and a good time to reach you. For immediate help, call 877-747-9020.', submit: 'Call me back', topicLabel: 'What can we help with?' },
  compact: { heading: 'Get a quote', intro: 'Tell us what you need covered and how to reach you. We’ll review the details with you.', submit: 'Request a quote', topicLabel: 'Coverage needed' },
};

export function SuccessCheck() {
  return <svg className="success-check" viewBox="0 0 52 52" width="52" height="52" aria-hidden="true" focusable="false">
    <circle className="success-check-circle" cx="26" cy="26" r="24" fill="none" />
    <path className="success-check-mark" fill="none" d="M15 27.5 22.5 35 37.5 18.5" />
  </svg>;
}

// Short quote / call-back request. "compact" is the landing-page quote card; "full" adds the best
// time to call and a message for the contact page. Both post to /api/callbacks.
export default function CallbackForm({ topic, onTopicChange, variant = 'full', heading, intro, submitLabel }) {
  const formId = useId();
  const fieldId = name => `${formId}-${name}`;
  const text = copy[variant] || copy.full;
  const compact = variant === 'compact';
  const [values, setValues] = useState({ name: '', phone: '', email: '', bestTime: callbackTimes[0], message: '' });
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(null);
  const started = useRef(false);
  const success = useRef(null);
  const errorRef = useRef(null);

  function update(key, value) {
    if (!started.current) { started.current = true; trackEvent('callback_form_start', { form_variant: variant }); }
    setValues(previous => ({ ...previous, [key]: value }));
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    if (sending) return;
    const form = event.currentTarget;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (values.phone.replace(/\D/g, '').length < 10) { setError('Enter a 10-digit phone number so we can call you back.'); requestAnimationFrame(() => errorRef.current?.focus()); return; }
    setSending(true); setError('');
    try {
      const body = { ...values, topic, consent, _hp: honeypot, pagePath: window.location.pathname, attribution: getAttribution() };
      const response = await fetch('/api/callbacks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Your request was not sent. Please call 877-747-9020.');
      trackLead({ id: result.id, type: `callback: ${topic}`, email: values.email, phone: values.phone });
      setDone(result);
      requestAnimationFrame(() => success.current?.focus());
    } catch (problem) {
      setError(problem instanceof TypeError ? 'We couldn’t reach the server. Check your connection or call 877-747-9020.' : problem.message);
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally { setSending(false); }
  }

  if (done) {
    return <div className="callback-done" role="status" tabIndex={-1} ref={success}>
      <SuccessCheck />
      <h3>Thank you, {values.name.trim().split(/\s+/)[0]}. Your request is saved.</h3>
      <p>Your contact details have been saved with this request. If you need help today, call <a className="nowrap" href="tel:+18777479020">877-747-9020</a>.</p>
      <p className="small">Reference: <code>{done.id}</code></p>
    </div>;
  }

  return <form className={`callback-form${compact ? ' compact' : ''}`} onSubmit={submit} aria-labelledby={fieldId('callback-heading')} data-track-area="callback-form">
    <h3 id={fieldId('callback-heading')}>{heading || text.heading}</h3>
    <p className="form-intro">{intro || text.intro}</p>
    <div className="form-row">
      <div className="form-field">
        <label htmlFor={fieldId('cb-name')}>Your name</label>
        <input id={fieldId('cb-name')} name="name" autoComplete="name" required minLength={2} maxLength={callbackLimits.name} value={values.name} onChange={event => update('name', event.target.value)} />
      </div>
      <div className="form-field">
        <label htmlFor={fieldId('cb-phone')}>Phone</label>
        <input id={fieldId('cb-phone')} name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={callbackLimits.phone} value={values.phone} onChange={event => update('phone', event.target.value)} />
      </div>
    </div>
    <div className="form-field">
      <label htmlFor={fieldId('cb-email')}>Email <span className="optional">(optional)</span></label>
      <input id={fieldId('cb-email')} name="email" type="email" autoComplete="email" maxLength={callbackLimits.email} value={values.email} onChange={event => update('email', event.target.value)} />
    </div>
    <div className="form-field">
      <label htmlFor={fieldId('topic')}>{text.topicLabel}</label>
      <select id={fieldId('topic')} value={topic} onChange={event => { onTopicChange(event.target.value); setError(''); }}>{contactTopics.map(value => <option key={value}>{value}</option>)}</select>
    </div>
    {!compact && <>
      <div className="form-field">
        <label htmlFor={fieldId('cb-time')}>Best time to call</label>
        <select id={fieldId('cb-time')} value={values.bestTime} onChange={event => update('bestTime', event.target.value)}>{callbackTimes.map(value => <option key={value}>{value}</option>)}</select>
      </div>
      <div className="form-field">
        <label htmlFor={fieldId('cb-message')}>Anything we should know? <span className="optional">(optional)</span></label>
        <textarea id={fieldId('cb-message')} rows={3} maxLength={callbackLimits.message} value={values.message} onChange={event => update('message', event.target.value)} placeholder="Renewal date, type of business, vehicles…" />
      </div>
    </>}
    <div className="hp" aria-hidden="true"><label htmlFor={fieldId('cb-website')}>Website</label><input id={fieldId('cb-website')} tabIndex={-1} autoComplete="off" value={honeypot} onChange={event => setHoneypot(event.target.value)} /></div>
    <label className="consent"><input type="checkbox" required checked={consent} onChange={event => { setConsent(event.target.checked); setError(''); }} /> <span>The Firebird Agency may contact me by phone or email about this request. Consent is not a condition of purchase.</span></label>
    {!compact && <p className="small">Please don’t include Social Security, payment, or driver’s license numbers. See our <a href="/privacy">privacy notice</a>.</p>}
    {error && <p className="form-status error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
    <button className="button block" type="submit" disabled={sending} aria-busy={sending || undefined}>{sending ? 'Sending…' : (submitLabel || text.submit)}</button>
    {compact && <p className="form-fineprint">No obligation. We’ll never ask for payment details here. <a href="/privacy">Privacy</a></p>}
  </form>;
}
