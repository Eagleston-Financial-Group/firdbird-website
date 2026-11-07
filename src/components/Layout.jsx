const navigation = [
  ['/contractors', 'Construction'], ['/medical-offices', 'Medical'],
  ['/multifamily', 'Multifamily'], ['/business', 'Business Insurance'],
  ['/personal', 'Personal Insurance'],
];

export function Header() {
  return <>
    <a className="skip" href="#main">Skip to content</a>
    <div className="topbar"><div className="wrap"><span>Independent insurance • Mesa, AZ &amp; Carlsbad, CA</span><div><a href="/client-services">Client services</a><a href="tel:+18777479020">877-747-9020</a></div></div></div>
    <header className="header"><div className="wrap nav-row">
      <a className="logo" href="/" aria-label="The Firebird Agency home"><img src="/brand/logo.png" width="300" height="170" alt="The Firebird Agency – Rising Above Risk" /></a>
      <nav className="desktop-nav" aria-label="Main navigation">{navigation.map(([href,label]) => <a key={href} href={href} aria-current={location.pathname===href?'page':undefined}>{label}</a>)}</nav>
      <a className="button nav-quote" href="/quote">Request a quote</a>
      <details className="mobile-nav"><summary>Menu</summary><nav aria-label="Mobile navigation">{[...navigation,['/about','Our agency'],['/services','All coverages'],['/client-services','Client services'],['/quote','Request a quote']].map(([href,label]) => <a key={href} href={href}>{label}</a>)}</nav></details>
    </div></header>
  </>;
}

export function Footer() {
  return <footer><div className="wrap footer-grid">
    <div><img className="footer-logo" src="/brand/logo.png" width="300" height="170" alt="The Firebird Agency" /><p>Independent insurance.<br />Clear advice. Real people.</p><a href="https://www.linkedin.com/company/the-firebird-agency/">Find us on LinkedIn ↗</a></div>
    <div><h2>Insurance</h2>{[['/business','Business'],['/trucking','Trucking'],['/personal','Home & auto'],['/multifamily','Multifamily & associations'],['/medical-offices','Dental & medical'],['/services','All coverages']].map(([href,label])=><a key={href} href={href}>{label}</a>)}</div>
    <div><h2>Your agency</h2>{[['/about','About Firebird'],['/client-services','Client services'],['/carriers','Claims & payments'],['/client-login','Client login'],['/careers','Careers']].map(([href,label])=><a key={href} href={href}>{label}</a>)}</div>
    <div><h2>Let’s talk</h2><a href="tel:+18777479020">877-747-9020</a><a href="mailto:info@thefirebirdagency.com">info@thefirebirdagency.com</a><p>1333 N Greenfield Road, Suite 103<br />Mesa, AZ 85205</p><p>2777 Jefferson Street, Suite 202<br />Carlsbad, CA 92008</p><a href="/contact">Contact &amp; directions</a></div>
  </div><div className="wrap legal"><span>{`© ${new Date().getFullYear()} The Firebird Agency`}</span><a href="/privacy">Privacy &amp; your information</a><p>Coverage descriptions are general. Policy terms, exclusions, underwriting, and state availability apply. A website or email request does not bind, change, or cancel coverage. Wait for confirmation from the agency or insurer.</p></div></footer>;
}
