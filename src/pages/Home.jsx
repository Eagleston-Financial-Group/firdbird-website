import Icon from '../components/Icon.jsx';
import { ArrowLink, CallLink, CheckList, IconChip, QuoteCard, SectionHead, StatGrid, Testimonials, TrustList } from '../components/ui.jsx';
import { agencyStats } from '../data/agency.js';
import { featuredTeam } from '../data/team.js';

const products = [
  ['/contractors', 'contractor', 'Construction & trades', 'Coverage for your crews, vehicles, equipment, and the work you take on.'],
  ['/medical-offices', 'medical', 'Dental & medical practices', 'Coverage reviews for dental practices and small medical offices, from malpractice to equipment and employees.'],
  ['/multifamily', 'multifamily', 'Apartments, condos & HOAs', 'Insurance for rental properties, community associations, and their boards.'],
  ['/business', 'business', 'Business insurance', 'General liability, workers’ comp, property, and business vehicles.'],
  ['/trucking', 'trucking', 'Trucking', 'Insurance for owner-operators, fleets, trucks, trailers, and the freight you carry.'],
  ['/personal', 'home', 'Home & auto', 'Home, auto, umbrella, and other personal coverage, explained in everyday language.'],
];
const reasons = [
  ['layers', 'A choice of insurance companies', 'We compare policies from different insurers and walk you through the coverage, deductibles, and price.'],
  ['chat', 'Advice you can use', 'Ask us about exclusions, limits, or a requirement in your contract. We’ll help you understand what it means for you.'],
  ['contractor', 'Experience in your industry', 'We work with contractors, medical practices, and property owners, including associations and their boards.'],
  ['support', 'Support after you buy', 'When you need a certificate, a policy change, or help with your renewal, you have an agency to call.'],
];
const steps = [
  ['Start with a conversation.', 'Tell us what you need to insure and when your coverage should start. If you have a policy, we can review it with you.'],
  ['Review your options.', 'We request quotes from suitable insurers and explain the differences in coverage and cost.'],
  ['Choose your coverage.', 'Once you choose a policy, we help with the paperwork. You can call us for certificates, changes, and renewals.'],
];
const faqs = [
  ['What does an independent insurance agency do?', 'We work with multiple insurance companies. That lets us look for options that fit your needs and explain the differences, rather than offering only one company’s policies.'],
  ['What do I need to request a quote?', 'Start with your name, contact details, what you need covered, and your renewal date or desired start date. If you have insurance already, your current policy helps us compare options.'],
  ['Can you help with business and personal insurance?', 'Yes. We help with business, trucking, home, auto, and other personal insurance. Tell us about both so we can coordinate your review.'],
  ['Already a client and need a certificate?', 'Visit Client services for certificate requests, policy changes, and claims or billing contacts. Include the insured name, recipient details, any requirements, and your deadline.'],
];
// A selection from the agency's partner-carrier list on thefirebirdagency.com.
const carriers = ['Travelers', 'CNA', 'Chubb', 'The Hartford', 'Liberty Mutual', 'Progressive', 'Safeco', 'Hanover', 'Markel', 'Philadelphia', 'Hiscox', 'Employers', 'Kinsale', 'Coalition', 'MedPro', 'The Doctors Company'];
const selfService = [
  ['/client-services', 'file', 'Certificates & policy changes'],
  ['/carriers', 'support', 'Claims & payments'],
  ['/client-login', 'person', 'Client login'],
];

export default function Home() {
  return <>
    <section className="home-hero" data-track-area="hero" data-cta-sentinel>
      <div className="wrap home-hero-inner">
        <div className="home-hero-copy">
          <span className="eyebrow">Independent insurance agency</span>
          <h1>Insurance for your business,<br /><em>home and everyday life.</em></h1>
          <p className="lead">Independent insurance advice for your business, property, and family. We compare policies from several insurers and explain the coverage, costs, and details that matter.</p>
          <div className="hero-actions"><a className="button large" href="#quick-quote">Get a quote <Icon name="arrow-right" size={18} /></a><CallLink /></div>
          <TrustList />
          <a className="hero-service-link" href="/client-services">Already a client? Request policy service <Icon name="arrow-right" size={16} /></a>
        </div>
        <figure className="home-hero-media" aria-hidden="true">
          <img src="/images/arizona-desert-1280.webp" srcSet="/images/arizona-desert-640.webp 640w, /images/arizona-desert-960.webp 960w, /images/arizona-desert-1280.webp 1280w, /images/arizona-desert-1536.webp 1536w" sizes="100vw" alt="" width="1536" height="1024" fetchPriority="high" decoding="async" />
        </figure>
      </div>
    </section>

    <nav className="wrap home-audiences" aria-label="Find your insurance or client service" data-track-area="audience-paths">
      {[
        ['/business', 'business', 'For your business', 'Coverage for your company, employees, and property.'],
        ['/personal', 'home', 'For your home & family', 'Home, auto, and other personal insurance.'],
        ['/client-services', 'support', 'For existing clients', 'Certificates, policy changes, claims, and billing.'],
      ].map(([href, icon, title, text]) => <a href={href} key={href}><Icon name={icon} size={22} /><span><strong>{title}</strong><small>{text}</small></span><Icon name="arrow-right" size={18} /></a>)}
    </nav>

    <section className="section wrap home-products" id="industries" aria-labelledby="products-heading">
      <SectionHead eyebrow="Industry expertise" title="Coverage for your industry" id="products-heading" lead="Insurance needs change with the work you do. Start with the coverage for your trade, practice, or property." />
      <div className="card-grid">
        {products.slice(0, 3).map(([href, icon, title, text], index) => <a key={href} className="card product-card" href={href} data-reveal style={{ '--reveal-delay': `${(index % 3) * 60}ms` }}>
          <IconChip name={icon} />
          <h3>{title}</h3>
          <p>{text}</p>
          <span className="card-cta">Explore coverage <Icon name="arrow-right" size={18} /></span>
        </a>)}
      </div>
      <div className="home-more-coverage"><h3>More ways we can help</h3><div>{products.slice(3).map(([href, icon, title]) => <a href={href} key={href}><Icon name={icon} size={20} /><span>{title}</span><Icon name="arrow-right" size={17} /></a>)}</div><ArrowLink href="/services">Browse all coverage options</ArrowLink></div>
    </section>

    <div className="band"><section className="section wrap home-why" aria-labelledby="why-heading">
      <div className="home-why-intro">
        <SectionHead eyebrow="Why Firebird" title="An agent to call. Options to compare." id="why-heading" lead="We help you understand your insurance, choose your coverage, and manage changes as your needs evolve." />
        <StatGrid items={agencyStats} className="home-stats" />
        <ArrowLink href="/about">Get to know Firebird</ArrowLink>
      </div>
      <div className="feature-grid">
        {reasons.map(([icon, title, text], index) => <div className="feature" key={title} data-reveal style={{ '--reveal-delay': `${index * 60}ms` }}><IconChip name={icon} /><h3>{title}</h3><p>{text}</p></div>)}
      </div>
    </section></div>

    <section className="section wrap home-how" aria-labelledby="how-heading">
      <SectionHead eyebrow="How it works" title="Here’s what happens next." id="how-heading" />
      <div className="steps" data-reveal>{steps.map(([title, text], index) => <article key={title}><span>{String(index + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
    </section>

    <section className="section wrap home-trust" aria-labelledby="trust-heading">
      <div className="home-trust-grid">
        <div data-reveal>
          <span className="eyebrow">Insurance companies we work with</span>
          <h2 id="trust-heading">A choice of insurers.<br /><em>Advice from your agent.</em></h2>
          <p>As an independent agency, we can request quotes from national and specialty insurers that fit your business, property, or household. Our offices are in Mesa, Arizona and Carlsbad, California, and we are licensed to help clients across the country.</p>
          <ul className="carrier-wall" aria-label="A selection of insurers we work with">{carriers.map(name => <li key={name}>{name}</li>)}<li className="carrier-more">and more specialty markets</li></ul>
          <p className="small">A selection of the insurance companies and specialty markets we work with. Names are shown to identify insurers and do not imply endorsement. Availability varies by coverage, risk, and state.</p>
        </div>
        <div className="home-team" data-reveal>
          <span className="eyebrow">Your Firebird team</span>
          <h3>Meet your Firebird team.</h3>
          <ul className="home-team-faces">{featuredTeam.map(member => <li key={member.name}><img src={member.photo} width={member.size} height={member.size} loading="lazy" decoding="async" alt={`${member.name}, The Firebird Agency`} /><span>{member.name}</span></li>)}</ul>
          <ArrowLink href="/about">Meet our team</ArrowLink>
        </div>
      </div>
    </section>

    <Testimonials />

    <section className="section wrap home-faq" aria-labelledby="faq-heading">
      <div className="home-faq-intro">
        <SectionHead eyebrow="Questions" title="A few things to know before we talk." id="faq-heading" lead="Find out how we work and what helps us prepare your quote." />
        <ArrowLink href="/contact">Have another question? Contact us</ArrowLink>
      </div>
      <div className="faq" data-reveal>{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
    </section>

    <section className="wrap home-clients" aria-labelledby="clients-heading" data-reveal>
      <div><span className="eyebrow">Client services</span><h2 id="clients-heading">Help with the policy you already have</h2><p>Find the right contact for a certificate, policy update, claim, or payment.</p></div>
      <ul>{selfService.map(([href, icon, label]) => <li key={href}><a href={href}><Icon name={icon} size={20} /><span>{label}</span><Icon name="arrow-right" size={18} /></a></li>)}</ul>
    </section>

    <section className="home-quote band-dark" aria-labelledby="quote-heading">
      <div className="wrap home-quote-inner">
        <div className="home-quote-copy" data-reveal>
          <span className="eyebrow">Talk with Firebird</span>
          <h2 id="quote-heading">Let’s talk about your coverage.</h2>
          <p>Buying insurance or reviewing a renewal? Tell us what’s coming up.</p>
          <CheckList items={['Tell us about your business, property, or vehicles.', 'We’ll review the details needed for a quote.', 'Compare coverage and cost with an agent.']} />
          <CallLink className="on-dark" />
        </div>
        <QuoteCard title="Get a quote" intro="Share your contact details and the type of insurance you need. This is a request to discuss coverage, not an instant quote." />
      </div>
    </section>
  </>;
}
