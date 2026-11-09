import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { CallLink } from './ui.jsx';
import { AGENCY } from '../data/agency.js';
import { LICENSES } from '../site.js';

const navigation = [
  ['/business', 'Business insurance'], ['/personal', 'Personal insurance'], ['/#industries', 'Industries'],
  ['/client-services', 'Client services'], ['/about', 'Our agency'],
];
const menuGroups = [
  ['Insurance', [['/contractors', 'Construction & trades'], ['/medical-offices', 'Dental & medical practices'], ['/multifamily', 'Apartments, condos & HOAs'], ['/business', 'Business insurance'], ['/trucking', 'Trucking'], ['/personal', 'Home, auto & personal']]],
  ['Your agency', [['/about', 'About Firebird'], ['/services', 'All coverages'], ['/client-services', 'Client services'], ['/contact', 'Contact us']]],
];
const footerInsurance = [['/business', 'Business insurance'], ['/contractors', 'Construction & trades'], ['/trucking', 'Trucking'], ['/personal', 'Home & auto'], ['/multifamily', 'Apartments, condos & HOAs'], ['/medical-offices', 'Dental & medical'], ['/services', 'All coverages']];
const footerAgency = [['/about', 'About Firebird'], ['/client-services', 'Client services'], ['/carriers', 'Claims & payments'], ['/client-login', 'Client login'], ['/careers', 'Careers']];

export function Header({ pathname = '/', quoteHref = '/quote', isApplication = false }) {
  const [scrolled, setScrolled] = useState(false);
  const menu = useRef(null);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const onKey = event => {
      if (!menu.current?.open) return;
      if (event.key === 'Escape') {
        menu.current.open = false;
        document.documentElement.classList.remove('menu-open');
        menu.current.querySelector('summary')?.focus();
      }
      if (event.key === 'Tab') {
        const controls = [...menu.current.querySelectorAll('summary, a[href], button')].filter(el => el.getClientRects().length);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const dismiss = event => {
      if (menu.current?.open && !menu.current.contains(event.target)) {
        menu.current.open = false;
        document.documentElement.classList.remove('menu-open');
      }
    };
    const resize = () => {
      if (window.innerWidth > 1080 && menu.current?.open) {
        menu.current.open = false;
        document.documentElement.classList.remove('menu-open');
      }
    };
    document.addEventListener('click', dismiss);
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', dismiss);
      window.removeEventListener('resize', resize);
      document.documentElement.classList.remove('menu-open');
    };
  }, []);
  const closeMenu = () => { if (menu.current) menu.current.open = false; };
  const callLabel = <><span className="call-full">{AGENCY.phone}</span><span className="call-short">Call</span></>;
  return <>
    <a className="skip" href="#main">Skip to content</a>
    <div className="topbar" data-track-area="topbar"><div className="wrap topbar-inner">
      <span>Independent insurance agency · Mesa, AZ &amp; Carlsbad, CA</span>
      <nav aria-label="Quick links"><a href="/client-services">Client services</a><a href="/contact">Contact</a><a href={AGENCY.phoneHref}>{AGENCY.phone}</a></nav>
    </div></div>
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}`} data-track-area="header">
      <div className="wrap header-inner">
        <a className="logo" href="/" aria-label="The Firebird Agency home"><img src="/brand/logo.png" width="300" height="170" alt="The Firebird Agency – Rising Above Risk" /></a>
        <nav className="desktop-nav" aria-label="Main navigation">
          {navigation.map(([href, label]) => {
            const inIndustry = href === '/#industries' && ['/contractors', '/medical-offices', '/multifamily', '/trucking'].some(path => pathname === path || pathname.startsWith(`${path}/`));
            return <a key={href} href={href} aria-current={pathname === href ? 'page' : undefined} className={inIndustry || pathname.startsWith(`${href}/`) ? 'in-section' : undefined}>{label}</a>;
          })}
        </nav>
        <div className="header-actions">
          <CallLink className={`header-call${isApplication ? ' is-primary' : ''}`} label={callLabel} aria-label={`Call ${AGENCY.phone}`} />
          {!isApplication && <a className="button header-quote" href={quoteHref}>Get a quote</a>}
          <details className="mobile-nav" ref={menu} onToggle={event => document.documentElement.classList.toggle('menu-open', event.currentTarget.open)}>
            <summary aria-label="Menu"><Icon name="menu" className="icon menu-open-icon" /><Icon name="close" className="icon menu-close-icon" /></summary>
            <div className="mobile-panel">
              {menuGroups.map(([title, links]) => <nav key={title} aria-label={title}>
                <h2>{title}</h2>
                {links.map(([href, label]) => <a key={href} href={href} onClick={closeMenu} aria-current={pathname === href ? 'page' : undefined}><span>{label}</span><Icon name="chevron-right" size={18} /></a>)}
              </nav>)}
              <div className="mobile-panel-actions">
                <a className="button block large" href={isApplication ? '/quote' : quoteHref} onClick={closeMenu}>Get a quote <Icon name="arrow-right" size={18} /></a>
                <CallLink />
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  </>;
}

export function Footer() {
  return <footer className="site-footer" data-track-area="footer">
    <div className="wrap footer-grid">
      <div className="footer-brand">
        <a className="footer-logo" href="/" aria-label="The Firebird Agency home"><img src="/brand/logo.png" width="300" height="170" alt="The Firebird Agency" loading="lazy" /></a>
        <p>Independent insurance.<br />Business insurance. Personal service.</p>
        <a href="https://www.linkedin.com/company/the-firebird-agency/">Find us on LinkedIn <Icon name="external" size={15} /></a>
      </div>
      <nav aria-labelledby="footer-insurance"><h2 id="footer-insurance">Insurance</h2><ul>{footerInsurance.map(([href, label]) => <li key={href}><a href={href}>{label}</a></li>)}</ul></nav>
      <nav aria-labelledby="footer-agency"><h2 id="footer-agency">Your agency</h2><ul>{footerAgency.map(([href, label]) => <li key={href}><a href={href}>{label}</a></li>)}</ul></nav>
      <div className="footer-contact">
        <h2>Let’s talk</h2>
        <a className="footer-phone" href={AGENCY.phoneHref}><Icon name="phone" size={18} />{AGENCY.phone}</a>
        <a href={AGENCY.emailHref}><Icon name="mail" size={18} />{AGENCY.email}</a>
        {AGENCY.offices.map(office => <address key={office.city}><strong>{office.city}, {office.state}</strong><span>{office.street}</span><span>{office.locality}</span><a href={office.maps}>Get directions <Icon name="external" size={14} /></a></address>)}
      </div>
    </div>
    <div className="wrap legal">
      <span suppressHydrationWarning>{`© ${new Date().getFullYear()} The Firebird Agency`}</span>
      <a href="/privacy">Privacy &amp; your information</a>
      <a href="/privacy#choices">Your privacy choices</a>
      <a href="/contact">Contact &amp; directions</a>
      {LICENSES.length > 0 && <span className="licenses">{LICENSES.map(license => `${license.label} #${license.number}`).join(' · ')}</span>}
      <p>The Firebird Agency is an independent insurance agency and is not an insurance company. Coverage descriptions are general. Policy terms, exclusions, underwriting, and state availability apply. A website or email request does not bind, change, or cancel coverage. Wait for confirmation from the agency or insurer.</p>
    </div>
  </footer>;
}

// Phone action bar: slides in once the page's hero call-to-action scrolls away (src/motion.js adds
// .is-shown), and steps aside while a form field has focus so it never covers the keyboard.
export function MobileActions({ isApplication = false, quoteHref = '/quote' }) {
  return <nav className={`mobile-actions${isApplication ? ' call-only' : ''}`} aria-label="Quick actions" data-track-area="mobile-bar">
    <a className="mobile-call" href={AGENCY.phoneHref}><Icon name="phone" size={20} /><span>{isApplication ? `Call ${AGENCY.phone}` : 'Call us'}</span></a>
    {!isApplication && <a className="mobile-quote" href={quoteHref}>Get a quote <Icon name="arrow-right" size={18} /></a>}
  </nav>;
}
