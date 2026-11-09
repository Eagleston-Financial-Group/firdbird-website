// Shared building blocks for the Firebird design system. Styles live in src/styles/components.css.
import { useState } from 'react';
import Icon from './Icon.jsx';
import CallbackForm from './CallbackForm.jsx';
import { AGENCY, trustPoints } from '../data/agency.js';
import { contactTopics } from '../data/marketing.js';
import { QUICK_QUOTE_ID, applicationLabelFor } from '../data/landing.js';
import { reviews } from '../data/reviews.js';

export function CallLink({ className = '', label = `Call ${AGENCY.phone}`, ...props }) {
  return <a className={`call-link ${className}`.trim()} href={AGENCY.phoneHref} {...props}><Icon name="phone" size={18} /><span>{label}</span></a>;
}

// Text link with a trailing arrow that nudges on hover.
export function ArrowLink({ href, children, className = '', ...props }) {
  return <a className={`text-link ${className}`.trim()} href={href} {...props}><span>{children}</span><Icon name="arrow-right" size={18} /></a>;
}

// Breadcrumb trail; the last item is the current page.
export function Breadcrumbs({ items }) {
  return <nav className="crumb" aria-label="Breadcrumb"><ol>
    <li><a href="/">Home</a></li>
    {items.map((item, index) => <li key={item.label}>{item.href && index < items.length - 1 ? <a href={item.href}>{item.label}</a> : <span aria-current="page">{item.label}</span>}</li>)}
  </ol></nav>;
}

export function TrustList({ items = trustPoints, className = '' }) {
  return <ul className={`trust-list ${className}`.trim()}>{items.map(item => <li key={item}>{item}</li>)}</ul>;
}

export function CheckList({ items, className = '' }) {
  return <ul className={`check-list ${className}`.trim()}>{items.map(item => <li key={typeof item === 'string' ? item : item.key}>{item}</li>)}</ul>;
}

export function IconChip({ name, className = '' }) {
  return <span className={`icon-chip ${className}`.trim()}><Icon name={name} /></span>;
}

export function SectionHead({ eyebrow, title, lead, center = false, id, className = '' }) {
  return <div className={`section-head${center ? ' center' : ''} ${className}`.trim()} data-reveal>
    {eyebrow && <span className="eyebrow">{eyebrow}</span>}
    <h2 id={id}>{title}</h2>
    {lead && <p className="lead">{lead}</p>}
  </div>;
}

// Large page heading area. `aside` (for example a QuoteCard) sits beside the copy on wide screens
// and below it on phones. data-cta-sentinel lets the phone action bar appear once this scrolls away.
export function PageHero({ crumbs, eyebrow, title, lead, actions, trust = true, aside, className = '', children }) {
  return <section className={`page-hero ${aside ? 'has-aside' : ''} ${className}`.replace(/\s+/g, ' ').trim()} data-track-area="hero" data-cta-sentinel>
    <div className="wrap page-hero-inner">
      <div className="page-hero-copy">
        {crumbs && <Breadcrumbs items={crumbs} />}
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {lead && <p className="lead">{lead}</p>}
        {actions && <div className="hero-actions">{actions}</div>}
        {trust && <TrustList items={trust === true ? trustPoints : trust} />}
        {children}
      </div>
      {aside && <div className="page-hero-aside">{aside}</div>}
    </div>
  </section>;
}

// The short quote request card (id="quick-quote"). Header and phone-bar "Get a quote" links jump here.
export function QuoteCard({ topic, title, intro, landing, className = '' }) {
  const initial = contactTopics.includes(topic ?? landing?.topic) ? (topic ?? landing.topic) : contactTopics[0];
  const [current, setCurrent] = useState(initial);
  const applicationPath = landing?.applicationPath;
  return <div className={`quote-card ${className}`.trim()} id={QUICK_QUOTE_ID} tabIndex={-1} data-track-area="quote-card">
    <CallbackForm variant="compact" topic={current} onTopicChange={setCurrent} heading={title} intro={intro} />
    <div className="quote-card-footer">
      {applicationPath && <ArrowLink href={applicationPath}>{applicationLabelFor(landing)}</ArrowLink>}
      <p>Prefer to talk? <a className="nowrap" href={AGENCY.phoneHref}>Call {AGENCY.phone}</a></p>
    </div>
  </div>;
}

// Count-up statistic for verified numbers only. Renders the final value without JavaScript or
// with reduced motion; src/motion.js animates [data-count-to] when it scrolls into view.
export function Stat({ value, suffix = '', label }) {
  return <div className="stat" data-reveal>
    <strong className="stat-value"><span aria-hidden="true"><span data-count-to={value}>{value}</span>{suffix}</span><span className="sr-only">{`${value}${suffix}`}</span></strong>
    <span className="stat-label">{label}</span>
  </div>;
}

export function StatGrid({ items, className = '' }) {
  return <div className={`stats ${className}`.trim()}>{items.map(item => <Stat key={item.label} {...item} />)}</div>;
}

// Testimonials appear only when src/data/reviews.js has genuine reviews. Manual controls, no autoplay.
export function Testimonials({ title = 'What clients say' }) {
  const [index, setIndex] = useState(0);
  if (!reviews.length) return null;
  const review = reviews[index];
  const go = step => setIndex(previous => (previous + step + reviews.length) % reviews.length);
  return <section className="section wrap testimonials" aria-labelledby="testimonials-heading">
    <SectionHead eyebrow="CLIENT REVIEWS" title={title} id="testimonials-heading" />
    <figure className="testimonial" key={index} aria-live="polite">
      <blockquote><p>{review.quote}</p></blockquote>
      <figcaption><strong>{review.name}</strong>{review.context && <span>{review.context}</span>}{review.source && <span className="small">{review.source}{review.date ? `, ${review.date}` : ''}</span>}</figcaption>
    </figure>
    {reviews.length > 1 && <div className="testimonial-controls">
      <button type="button" className="button secondary small" onClick={() => go(-1)} aria-label="Previous review"><Icon name="arrow-left" size={18} /></button>
      <span className="small" aria-hidden="true">{index + 1} / {reviews.length}</span>
      <button type="button" className="button secondary small" onClick={() => go(1)} aria-label="Next review"><Icon name="arrow-right" size={18} /></button>
    </div>}
  </section>;
}
