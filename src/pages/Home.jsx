const industries = [
  ['/contractors','Construction','Coverage for your crews, vehicles, equipment, and the work you take on.','Explore contractors & trades'],
  ['/medical-offices','Medical & dental practices','Coverage reviews for dental practices and small medical offices, from malpractice to equipment and employees.','Explore dental & medical offices'],
  ['/multifamily','Multifamily & associations','Insurance for rental properties, community associations, and their boards.','Explore apartments, condos & hoas'],
];
const more = [
  ['/business','Your business','General liability, workers’ comp, property, and business vehicles. A strong focus on contractors and trade businesses.','Explore your business'],
  ['/trucking','Your trucking operation','Insurance for owner-operators, fleets, trucks, trailers, and the freight you carry.','Explore your trucking operation'],
  ['/personal','Your home & vehicles','Home, auto, umbrella, and other personal coverage, explained in everyday language.','Explore your home & vehicles'],
];
const steps = [
  ['Tell us about yourself.','Share what you do, what you need covered, and when you need it. We’ll ask for the details that matter.'],
  ['Compare your options.','We approach insurance companies that fit your needs and explain the coverage, cost, and important exclusions.'],
  ['Choose with confidence.','You decide which option works for you. We help put it in place and assist with changes, documents, and renewals.'],
];
const faqs = [
  ['What does an independent insurance agency do?','We work with multiple insurance companies. That lets us look for options that fit your needs and explain the differences, rather than offering only one company’s policies.'],
  ['What do I need to request a quote?','Start with your name, contact details, what you need covered, and your renewal date or desired start date. If you have insurance already, your current policy helps us compare options.'],
  ['Can you help with business and personal insurance?','Yes. We help with business, trucking, home, auto, and other personal insurance. Tell us about both so we can coordinate your review.'],
  ['Already a client and need a certificate?','Visit Client services for certificate requests, policy changes, and claims or billing contacts. Include the insured name, recipient details, any requirements, and your deadline.'],
];
function Cards({items}) {
  return <div className="cards">{items.map(([href,title,text,link],i)=><a key={href} className="card" href={href}><span className="card-number">{String(i+1).padStart(2,'0')}</span><h3>{title}</h3><p>{text}</p><span className="text-link">{link} <span aria-hidden="true">↗</span></span></a>)}</div>;
}
export default function Home() {
  return <>
    <section className="hero"><div className="hero-copy"><span className="eyebrow">THE FIREBIRD AGENCY · INDEPENDENT INSURANCE</span><h1>Insurance made clear.<br /><em>Business. Home. Life on the road.</em></h1><p>We help businesses, contractors, truckers, and families compare insurance options—then explain what’s covered, what isn’t, and what it costs.</p><div className="actions"><a className="button" href="/quote">Request a quote <span aria-hidden="true">↗</span></a><a className="call" href="tel:+18777479020">Call 877-747-9020</a></div><p className="hero-note">Tell us what you need. We’ll guide you from there.</p></div><div className="hero-photo"><img src="/images/arizona-desert.webp" alt="Saguaro cacti and rugged Arizona desert mountains in warm evening light" width="1536" height="1024" fetchPriority="high" /><div className="photo-caption"><span>MESA, ARIZONA · CARLSBAD, CALIFORNIA</span><strong>Southwest Roots.<br />Nationwide Reach.</strong></div></div></section>
    <div className="trust wrap"><span>Independent agency</span><span>Multiple insurance companies</span><span>Help beyond the quote</span></div>
    <section className="section wrap"><span className="eyebrow">OUR THREE CORE INDUSTRIES</span><h2>Construction. Medical. Multifamily.</h2><Cards items={industries} /></section>
    <section className="section wrap"><span className="eyebrow">BUILT AROUND THE WAY YOU WORK</span><h2>You run your business.<br />We help you sort out the insurance.</h2><div className="split"><p className="lead">For contractors, the details matter: your crews, trucks, tools, subcontractors, and the insurance requirements in your next contract.</p><div><p>We help you understand which policies fit your work and what your customers are asking for. When you need a certificate, a policy change, or help with your renewal, you have an agency to call.</p><a className="text-link" href="/contractors">Explore contractor insurance ↗</a></div></div></section>
    <section className="section wrap"><span className="eyebrow">MORE WAYS WE CAN HELP</span><h2>Business insurance. Home &amp; auto. And more.</h2><Cards items={more} /></section>
    <div className="tint"><section className="section wrap"><span className="eyebrow">HOW WORKING WITH US WORKS</span><h2>Three steps. One team to help.</h2><div className="steps">{steps.map(([title,text],i)=><article key={title}><span>{String(i+1).padStart(2,'0')}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section></div>
    <section className="section wrap"><h2>A few answers before you start.</h2><div className="faq">{faqs.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
    <section className="section wrap"><span className="eyebrow">YOUR FIREBIRD TEAM</span><h2>People you can call.<br />Advice you can understand.</h2><p className="lead">Meet Van Goodman, Collin Short, Travis Sibley, and John Eagleston—the people behind your Firebird insurance conversation.</p><a className="text-link" href="/about">Meet our team ↗</a></section>
    <section className="cta wrap"><div><span className="eyebrow">LET’S GET STARTED</span><h2>Tell us what you need.<br />We’ll help with the next step.</h2><p>New coverage or a second look at your renewal—start with a conversation.</p></div><div className="cta-actions"><a className="button light" href="/quote">Request a quote <span aria-hidden="true">↗</span></a><a href="tel:+18777479020">Or call 877-747-9020</a></div></section>
    <section className="section wrap"><span className="eyebrow">CONSTRUCTION &amp; TRADE INSURANCE</span><h2>An application built for your trade.</h2><p>Plumbing, HVAC, electrical, general contracting, excavation, utilities, and more. Tell us about your work and upload your current insurance documents.</p><a className="button" href="/contractors">Choose your trade ↗</a></section>
  </>;
}
