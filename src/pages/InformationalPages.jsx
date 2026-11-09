import { useEffect, useState } from 'react';
import CallbackForm from '../components/CallbackForm.jsx';
import Icon from '../components/Icon.jsx';
import { ArrowLink, CallLink, IconChip, PageHero, QuoteCard } from '../components/ui.jsx';
import { useRoute } from '../components/RouteContext.js';
import { AGENCY } from '../data/agency.js';
import { landingFor, quoteHrefFor } from '../data/landing.js';
import { contactTopics } from '../data/marketing.js';
import { team } from '../data/team.js';
import { adsOptedOut, globalPrivacyControl, setAdsOptOut } from '../tracking.js';

const PHONE = AGENCY.phoneHref;
const EMAIL = AGENCY.emailHref;
const SERVICE = AGENCY.serviceEmailHref;
const arrow = <Icon name="arrow-right" size={18} />;
// Product names inside sentences ("options for general liability insurance"); keeps proper nouns and acronyms.
const inSentence = product => /^(Mexico|HOA)\b/.test(product) ? product : product.charAt(0).toLowerCase() + product.slice(1);

// Page header. On ad landing pages (src/data/landing.js) it carries that product's quote card,
// a "Get a quote" jump for phones, click-to-call, and the verified trust points.
function Intro({ label, title, children, parent, current, actions }) {
  const landing = landingFor(useRoute());
  const crumbs = [...(parent ? [parent] : []), { label: current || label }];
  const heroActions = actions ?? (landing ? <><a className="button large hero-quote-jump" href="#quick-quote">Get a quote {arrow}</a><CallLink /></> : null);
  const aside = landing ? <QuoteCard landing={landing} title="Get a quote" intro={`Leave your details to discuss ${inSentence(landing.product)} with an agent.`} /> : null;
  return <PageHero crumbs={crumbs} eyebrow={label} title={title} lead={children} actions={heroActions} trust={Boolean(landing)} aside={aside} />;
}
function Section({ title, eyebrow = '', omitEyebrow = false, children, className = '', ...props }) {
  return <section className={`section wrap ${className}`.trim()} {...props}><div className="section-head" data-reveal>{!omitEyebrow && eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>{children}</section>;
}
function CTA() {
  const quoteHref = quoteHrefFor(useRoute());
  return <section className="cta wrap" data-reveal><div><span className="eyebrow">Talk with Firebird</span><h2>Let’s talk about your coverage.</h2><p>Buying insurance or reviewing a renewal? Tell us what’s coming up.</p></div><div className="cta-actions"><a className="button light large" href={quoteHref}>Get a quote {arrow}</a><CallLink /></div></section>;
}
function Steps() {
  return <div className="steps" data-reveal>{[
    ['Start with a conversation.', 'Tell us what you need to insure and when your coverage should start. If you have a policy, we can review it with you.'],
    ['Review your options.', 'We request quotes from suitable insurers and explain the differences in coverage and cost.'],
    ['Choose your coverage.', 'Once you choose a policy, we help with the paperwork. You can call us for certificates, changes, and renewals.'],
  ].map(([title, body], i) => <article key={title}><span>0{i + 1}</span><h3>{title}</h3><p>{body}</p></article>)}</div>;
}
function Cards({ items, cta = 'Explore coverage' }) {
  return <div className="card-grid">{items.map(({ href, title, description, icon }, i) => <a className="card" href={href} key={href} data-reveal style={{ '--reveal-delay': `${(i % 3) * 60}ms` }}><IconChip name={icon || landingFor(href)?.icon || 'shield'} /><h3>{title}</h3><p>{description}</p><span className="card-cta">{cta} {arrow}</span></a>)}</div>;
}
function Details({ items, className = 'detail-grid' }) {
  return <div className={className}>{items.map(([title, body, icon], i) => <article key={title} data-reveal style={{ '--reveal-delay': `${i * 60}ms` }}>{icon && <IconChip name={icon} className="sm" />}<h3>{title}</h3><p>{body}</p></article>)}</div>;
}

// Coverage guides for conversations with an agent.
const coverageData = [
  ['business-liability', 'General liability insurance', 'Help protect your business against claims that your work injured someone or damaged their property.', 'Customer injuries, damage to someone else’s property, and certain advertising-related claims.', 'Employee injuries, your own property, professional mistakes, and vehicle accidents need separate coverage discussions.', 'Your work, annual sales, subcontractor costs, customer contracts, and prior claims.'],
  ['commercial-property', 'Commercial property insurance', 'Coverage for business buildings, equipment, inventory, and the cost of a covered disruption.', 'Owned buildings, business belongings, tenant improvements, and business income options.', 'Flood, earthquake, equipment away from your location, and machinery breakdown may need separate coverage.', 'Location, building details, replacement values, inventory, and how long it could take to resume business.'],
  ['professional-liability', 'Professional liability & malpractice', 'Coverage options for claims that your professional advice or services caused harm.', 'Errors, omissions, alleged negligence, and profession-specific malpractice exposures.', 'Reporting deadlines, retroactive dates, and exclusions deserve a close look. A general liability policy is not a substitute.', 'Your services, professional credentials, revenue, current coverage, and claims history.'],
  ['community-associations', 'HOA & condo association insurance', 'Help your association protect shared property and address board and community liability.', 'Association buildings and common areas, general liability, directors and officers, and crime coverage options.', 'The governing documents and maintenance responsibilities help determine what the association needs to insure.', 'Governing documents, property values, unit count, amenities, current policies, and claims history.'],
  ['employment-practices', 'Employment practices liability', 'Coverage options for allegations involving how your business treats employees and job applicants.', 'Claims such as discrimination, harassment, retaliation, or wrongful termination.', 'This is different from workers’ compensation. Wage-and-hour claims and other exclusions need a separate review.', 'Employee count, hiring practices, handbook, locations, and previous employment claims.'],
  ['cyber-data-breach', 'Cyber & data breach insurance', 'Help your business prepare for the costs of a cyberattack, data breach, or systems disruption.', 'Incident response, recovery, privacy liability, and selected business interruption or fraud coverage.', 'Security requirements and exclusions vary. Confirm what protection applies to ransomware, funds transfer, and dependent systems.', 'Your systems, data, security controls, backups, and reliance on outside technology providers.'],
  ['crime', 'Business crime insurance', 'Coverage options for employee theft and other financial losses caused by crime.', 'Employee dishonesty, forgery, and selected money, securities, or funds-transfer exposures.', 'Social engineering and payment fraud may need specific coverage and can carry separate limits.', 'Who handles funds, payment verification practices, financial controls, and desired limits.'],
  ['workers-compensation', 'Workers’ compensation insurance', 'Coverage for employees who suffer covered work-related injuries or illnesses.', 'Medical treatment and a portion of lost wages for covered workplace injuries, plus employers liability.', 'Accurate employee duties, payroll, and operating states matter. Estimated payroll may be adjusted at audit.', 'Payroll by job duty, employee locations, ownership details, current policy, and loss history.'],
  ['commercial-auto', 'Commercial auto insurance', 'Insurance for the vehicles and drivers your business depends on.', 'Liability from covered business vehicle accidents and optional damage coverage for insured vehicles.', 'Employee-owned and rented vehicles require a review of hired and non-owned auto coverage. Tools and cargo may need separate policies.', 'Vehicle identification numbers, drivers, vehicle use, garaging locations, and current coverage.'],
  ['business-umbrella', 'Commercial umbrella & excess insurance', 'Additional liability limits above the policies specified in your insurance program.', 'Larger covered liability claims that exceed the underlying policy’s limits.', 'An umbrella does not automatically cover every policy or exclusion. Review the underlying schedule and required limits.', 'Current liability policies, requested limits, customer requirements, and your operations.'],
  ['home-auto', 'Home & auto insurance', 'Compare options for your home, belongings, vehicles, and personal liability.', 'Homeowners and auto coverage, deductibles, and available package options.', 'Replacement cost, roof settlement, flood exposure, and business use of vehicles deserve attention.', 'Property details, vehicle and driver information, current policies, and renewal dates.'],
  ['personal-umbrella', 'Personal umbrella insurance', 'Extra liability protection for the assets and future you are working toward.', 'Additional limits for covered claims above qualifying home, auto, or other personal policies.', 'Underlying coverage requirements and exclusions apply. Business and professional exposures need separate review.', 'Your current liability limits, vehicles, drivers, properties, and other personal exposures.'],
  ['flood', 'Flood insurance', 'Review separate flood coverage for a home or commercial property.', 'Covered flood damage to buildings and contents, subject to the selected policy.', 'Standard property insurance generally does not cover flood. Waiting periods, limits, and contents coverage vary.', 'Property address, building use, elevation information if available, and building and contents values.'],
  ['motorcycle', 'Motorcycle insurance', 'Options for your motorcycle, liability, and the way you ride.', 'Liability and selected protection for the bike, accessories, and other available coverages.', 'Custom equipment, use, passengers, and uninsured-motorist options should be reviewed.', 'Motorcycle details, riders, usage, accessories, and current coverage.'],
  ['boat-watercraft', 'Boat & watercraft insurance', 'Coverage options for your boat, equipment, and liability on the water.', 'Selected protection for the watercraft and liability arising from covered use.', 'Navigation limits, storage, towing, and passenger use can affect the available coverage.', 'Boat and motor details, values, operating waters, storage location, and boating experience.'],
  ['mexico-auto', 'Mexico auto insurance', 'Arrange coverage suited to driving your vehicle in Mexico.', 'Mexico-specific auto coverage options for your trip and vehicle.', 'Do not assume a U.S. auto policy meets your needs in Mexico. Review liability, physical damage, territory, and dates.', 'Travel dates, destination, vehicle information, drivers, and current U.S. policy details.'],
].map(([slug, title, description, helps, review, ready], index) => ({ slug, href: `/insurance/${slug}`, title, description, helps, review, ready, group: index < 10 ? 'Business' : 'Personal' }));
const businessCoverages = coverageData.filter(item => item.group === 'Business');
const personalCoverages = coverageData.filter(item => item.group === 'Personal');

function CoverageGuide({ coverage }) {
  const group = coverage.group.toLowerCase();
  const parent = { href: `/${group}`, label: `${coverage.group} insurance` };
  return <><Intro label={`${coverage.group} insurance`} parent={parent} current={coverage.title} title={coverage.title}>{coverage.description}</Intro>
    <Section eyebrow="Coverage guide" title="What to discuss with your agent"><Details items={[['Coverage to consider', coverage.helps, 'shield'], ['Policy details to review', coverage.review, 'search'], ['What to have ready', coverage.ready, 'list']]} /></Section>
    <Section title="Let’s review your coverage." className="coverage-options"><p className="readable" data-reveal>We’ll review what you need to insure, request quotes from suitable insurers, and explain the coverage and cost. If you already have insurance, send us your current policy so we can compare it with the available options.</p><ArrowLink href={parent.href}>{`See related ${group} coverages`}</ArrowLink></Section>
    <CTA /></>;
}
function BusinessPage() {
  return <><Intro label="Business insurance" title={<>Business insurance<br /><em>for the work you do.</em></>}>Coverage for your employees, property, vehicles, and business liability. We’ll review your operations and help you compare suitable policies.</Intro>
    <Section eyebrow="Contractors & trade businesses" title="Contractor insurance that starts with your work."><div id="contractors" className="split"><div data-reveal><p>From plumbing, HVAC, and electrical work to excavation, paving, and general contracting, your operations shape your coverage. Tell us what you build, who you work for, and how you use subcontractors.</p><div className="inline-actions"><a className="button" href="/contractors">Choose your trade {arrow}</a><ArrowLink href="/contact?topic=Contractor%20insurance">Review my contractor coverage</ArrowLink></div></div><div className="panel" data-reveal><h3>Bring your next contract.</h3><p>We can help review insurance requirements, including additional insured requests, waivers, and higher liability limits. We’ll explain when a policy change may be needed.</p><p>Also ask about tools, mobile equipment, and projects under construction.</p></div></div></Section>
    <Section title="Find the coverage you need."><Cards items={businessCoverages} /></Section>
    <Section title="More businesses we help."><Cards cta="Explore" items={[
      { href: '/medical-offices', title: 'Dental & medical offices', description: 'Coverage reviews for dental practices and small medical offices, from malpractice to equipment and employees.' },
      { href: '/multifamily', title: 'Apartments, condos & HOAs', description: 'Insurance for rental properties, community associations, and their boards.' },
    ]} /></Section>
    <div className="band"><Section title="Here’s how we help."><Steps /></Section></div>
    <CTA /></>;
}
function PersonalPage() {
  return <><Intro label="Personal insurance" title={<>Home, auto &amp; personal insurance<br /><em>Coverage for home and the road.</em></>}>We help you compare home, auto, and other personal insurance, with clear explanations of your limits, deductibles, and options.</Intro>
    <Section title="Coverage for everyday life."><Cards items={personalCoverages} /></Section>
    <Section title="What to have ready"><p className="lead" data-reveal>Have your current policies, renewal dates, property details, and vehicle information ready. Buying your first policy? We’ll explain what we need.</p><ArrowLink href="/quote/personal">Choose a personal insurance application</ArrowLink></Section>
    <CTA /></>;
}
function ServicesPage() {
  const [filter, setFilter] = useState('all');
  return <><Intro label="All insurance services" title={<>Explore your<br /><em>insurance options.</em></>} actions={<><a className="button large" href="/quote">Get a quote {arrow}</a><CallLink /></>}>Start with what you want to protect. Each guide explains what to discuss with your agent and what information helps us quote.</Intro>
    <div className="wrap filters" role="group" aria-label="Filter coverage">{['all', 'Business', 'Personal'].map(value => <button type="button" className={`filter${filter === value ? ' active' : ''}`} aria-pressed={filter === value} data-filter={value} onClick={() => setFilter(value)} key={value}>{value === 'all' ? 'All coverages' : `${value} insurance`}</button>)}</div>
    <div className="wrap service-list">{['Business', 'Personal'].map(group => <div data-group={group} key={group} hidden={filter !== 'all' && filter !== group}><h2>{group} insurance</h2><Cards items={coverageData.filter(item => item.group === group)} /></div>)}</div>
    <CTA /></>;
}
const truckingTypes = [
  ['owner-operators', 'Owner-operators', 'Review your authority, lease agreement, truck, and trailer.'],
  ['fleets', 'Fleets', 'Coordinate drivers, equipment, routes, and customer requirements.'],
  ['new-authority', 'New authority', 'Start with your driving experience, equipment, and operating plan.'],
  ['cargo', 'Motor truck cargo', 'Review the freight you carry, load values, and exclusions.'],
].map(([slug, title, description]) => ({ slug, href: `/trucking/${slug}`, title, description }));
function TruckingPage() {
  const icons = { 'owner-operators': 'person', fleets: 'trucking', 'new-authority': 'badge', cargo: 'layers' };
  return <><Intro label="Trucking insurance" title={<>Trucking insurance<br /><em>for your truck and your business.</em></>}>We help owner-operators and fleets review liability, vehicle damage, cargo, and other coverage for their operations.</Intro>
    <Section title="Start with your operation."><Cards cta="Explore" items={truckingTypes.map(type => ({ ...type, icon: icons[type.slug] }))} /></Section>
    <div className="band"><Section title="Have these details ready."><Details items={[
      ['Your business', 'Legal name, authority details, garaging address, and requested effective date.', 'briefcase'],
      ['Your trucks & drivers', 'Vehicle schedules, values, drivers, and driving experience.', 'trucking'],
      ['Your routes & freight', 'Commodities, load values, radius, mileage, contracts, current policies, and loss runs.', 'map-pin'],
    ]} /></Section></div>
    <Section title="Common trucking questions."><div className="faq" data-reveal>{[
      ['Is trucking insurance just commercial auto?', 'Auto liability is one part. Cargo, trailer arrangements, physical damage, workers’ compensation, and filings may also need attention.'],
      ['Can a new business get a quote?', 'We can review the operation and approach suitable markets. Available options depend on experience, equipment, freight, and underwriting.'],
      ['Does a certificate change my coverage?', 'No. A certificate summarizes certain policy information. The actual policy and endorsements determine coverage.'],
    ].map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></Section>
    <CTA /></>;
}
function TruckingDetail({ operation }) {
  const product = landingFor(operation.href)?.product ?? `${operation.title} insurance`;
  return <><Intro label="Trucking insurance" parent={{ href: '/trucking', label: 'Trucking insurance' }} current={operation.title} title={product}>{operation.description}</Intro>
    <Section title="What we will review."><p className="lead" data-reveal>Your insurance needs depend on who owns the equipment, who holds the operating authority, what you haul, and what your contracts require.</p><Details items={[
      ['Liability & equipment', 'Review auto liability, truck and trailer values, deductibles, and any lease obligations.', 'shield'],
      ['Cargo & operations', 'Discuss load values, commodities, routes, exclusions, and trailer arrangements.', 'trucking'],
      ['Next steps', 'Send your business information, equipment and driver schedules, current coverage, and loss history.', 'list'],
    ]} /><p className="section-more"><ArrowLink href="/trucking">All trucking insurance</ArrowLink></p></Section>
    <CTA /></>;
}

const specialtyData = {
  '/multifamily/apartments': {
    name:'Apartment complexes', eyebrow:'MULTIFAMILY & COMMUNITY ASSOCIATIONS', title:<>Protect your buildings.<br /><em>Keep your rental business moving.</em></>, description:'We help apartment owners and managers review property coverage, rental-income protection, liability, and the everyday risks of running a rental community.', href:'/quote/multifamily/apartments', action:'Start an apartment application',
    details:[['Buildings & equipment','Review replacement values, roofs, plumbing and electrical updates, equipment, deductibles, and rebuilding requirements.'],['Rental income & extra costs','Discuss how a covered property loss could affect rent and operating expenses, and the time needed to repair or rebuild.'],['Residents, visitors & operations','Review premises liability, pools and amenities, maintenance staff, vendors, workers’ compensation, and umbrella limits.']],
    infoTitle:'A property schedule saves time.', info:'Have several buildings or locations? Upload a spreadsheet with addresses, unit counts, construction, year built, square footage, roof updates, and insured values. Add notes about vacancies, renovations, and commercial space so we can understand the whole operation.', ready:'Current policies, a property schedule, building and unit counts, occupancy, annual rental-income totals, replacement values, loss runs, roof and system updates, and lender requirements. Tenant names and personal records are not needed.',
  },
  '/multifamily/condo-associations': {
    name:'Condo associations', eyebrow:'MULTIFAMILY & COMMUNITY ASSOCIATIONS', title:<>Condo association insurance.<br /><em>Review your master policy.</em></>, description:'We help condo boards and property managers review the association’s master policy, shared buildings, board liability, and protection for association funds.', href:'/quote/multifamily/condo-associations', action:'Start a condo association application',
    details:[['The master property policy','Review building values, shared structures, covered unit interiors, deductibles, and rebuilding costs. We start with what the association is responsible for insuring.'],['Liability for shared spaces','Discuss common areas, amenities, maintenance, contractors, and additional liability limits.'],['Board decisions & association funds','Review directors and officers coverage for board decisions, crime coverage for theft of funds, and cyber exposures.']],
    infoTitle:'Where does the master policy stop?', info:'Condo governing documents help define which building components, fixtures, and improvements the association insures and which are the unit owner’s responsibility. We review those provisions with you, including deductible responsibilities, so the quote starts with the right information.', ready:'Current master policies, a building schedule, replacement values, loss runs, governing documents, roof and system updates, budgets, and any lender insurance requirements.',
  },
  '/multifamily/hoas': {
    name:'Homeowners associations', eyebrow:'MULTIFAMILY & COMMUNITY ASSOCIATIONS', title:<>HOA insurance.<br /><em>Coverage for your association.</em></>, description:'We help HOA boards and community managers review insurance for common property, amenities, board decisions, and association funds.', href:'/quote/multifamily/hoas', action:'Start an HOA application',
    details:[['Common property & amenities','Review clubhouses, pools, gates, walls, private roads, landscaping assets, and other property the association owns or maintains.'],['Community liability','Discuss injuries in shared spaces, outside vendors, public use of facilities, events, and additional liability limits.'],['Boards, employees & funds','Review directors and officers coverage, theft of association funds, cyber risks, and workers’ compensation when the association has employees.']],
    infoTitle:'Start with what your HOA is responsible for.', info:'Some HOAs insure only common property; others have responsibilities for residential roofs, exteriors, or buildings. We review your governing documents and property schedule so the application reflects your community’s actual responsibilities.', ready:'Current policies, CC&Rs and bylaws, a common-property schedule with values, loss runs, budgets, reserve studies, inspection reports, and management or vendor insurance requirements.',
  },
  '/medical-offices/dental-practices': {
    name:'Dental practice insurance', eyebrow:'DENTAL PRACTICE INSURANCE', title:<>Dental practice insurance.<br /><em>Review your coverage.</em></>, description:'We help dental practices review professional liability, property, employee coverage, and other insurance for the practice.', href:'/quote/medical/dental', action:'Start your dental application', dental:true,
    details:[['Your procedures & providers','Tell us about general and specialty dentistry, implants, oral surgery, sedation, provider credentials, and any off-site services.'],['Your office & treatment equipment','Review chairs, imaging systems, sterilization equipment, laboratory or milling equipment, leased assets, and tenant improvements.'],['Your staff & business systems','Discuss payroll and staff duties, patient-information systems, cyber exposures, business income, and lease insurance requirements.']],
    infoTitle:'Professional coverage deserves its own review.', info:'A business property policy and malpractice coverage address different risks. We review both with you, including how individual providers and the practice are insured. If a policy is claims-made, share the retroactive date and tell us about any practice or coverage changes so we can discuss the relevant reporting questions.', ready:'Current business and malpractice policies, provider and payroll schedules, equipment values, loss runs, lease requirements, and prior applications. Do not include patient records, treatment images, or patient-identifying information.',
  },
};
const specialtyAccent = {
  '/multifamily/apartments': 'Keep your rental business moving.',
  '/multifamily/condo-associations': 'Clear insurance responsibilities.',
  '/multifamily/hoas': 'Shared responsibility, explained.',
  '/medical-offices/dental-practices': 'For the practice behind every smile.',
};
function SpecialtyPage({ data }) {
  const pathname = useRoute();
  const parent = data.dental ? { href: '/medical-offices', label: 'Dental & medical offices' } : { href: '/multifamily', label: 'Multifamily & associations' };
  const icons = data.dental ? ['dental', 'medical-office', 'people'] : ['building', 'shield', 'people'];
  return <><Intro label={data.dental ? 'Dental & medical practices' : 'Multifamily & community associations'} parent={parent} current={data.name} title={<>{landingFor(pathname)?.product ?? data.name}<br /><em>{specialtyAccent[pathname]}</em></>}>{data.description}</Intro>
    <Section title={data.dental ? 'Coverage for your practice' : 'What we’ll review with you.'}><Details className="specialty-grid" items={data.details.map(([title, body], index) => [title, body, icons[index]])} /></Section>
    <section className="wrap section specialty-info"><div className="panel" data-reveal><h2>{data.infoTitle}</h2><p>{data.info}</p></div></section>
    <section className="specialty-prepare wrap" data-reveal><div><span className="eyebrow">What helps us quote</span><h2>Bring what you have.<br />We’ll help with the rest.</h2><p>{data.ready}</p><p>Upload supporting documents in the application. Estimates are fine, and we can follow up on missing details.</p></div><div className="specialty-steps"><h3>How it works</h3><ol><li>Share your property or practice details.</li><li>We review the information and clarify what’s needed.</li><li>We explain coverage options and costs so you can decide.</li></ol><a className="button" href={data.href}>Start your application {arrow}</a><p className="form-note">An application does not bind coverage. Availability and coverage depend on underwriting and policy terms.</p></div></section></>;
}
function MedicalPage() {
  return <><Intro label="Dental & small medical practices" title={<>Dental &amp; medical office insurance<br /><em>We help protect your practice.</em></>}>We help dental practices and small medical offices review the professional care they provide and the business they run, including malpractice and equipment to staff and information systems.</Intro>
    <Section title="Choose your practice."><div className="card-grid cols-2">
      <a className="card" href="/medical-offices/dental-practices" data-reveal><IconChip name="dental" /><h3>A focus on dental practices</h3><p>General dentistry, specialty practices, and growing offices. Tell us about your procedures, providers, sedation, chairs, and equipment.</p><span className="card-cta">Explore dental coverage {arrow}</span></a>
      <a className="card" href="/quote/medical/small-medical" data-reveal style={{ '--reveal-delay': '60ms' }}><IconChip name="medical" /><h3>Other small medical offices</h3><p>A separate application for independent medical practices, with questions about specialty, procedures, providers, and office operations.</p><span className="card-cta">Start a medical application {arrow}</span></a>
    </div></Section>
    <Section title="Look at the whole practice."><Details className="specialty-grid" items={[
      ['Professional liability / malpractice', 'Review provider and practice coverage, services performed, policy type, limits, and any prior-acts or reporting questions.', 'professional'],
      ['Office property & equipment', 'Review your buildout, imaging and treatment equipment, contents, equipment breakdown, and income affected by a covered loss.', 'medical-office'],
      ['People & information', 'Discuss general liability, workers’ compensation, employment practices, and cyber coverage for your business systems and data exposures.', 'people'],
    ]} /></Section>
    <section className="wrap section specialty-info"><div className="panel" data-reveal><h2>Changing providers, owners, or policies?</h2><p>Tell us about planned changes and share your existing malpractice policy, retroactive date if applicable, and loss history. We’ll identify prior-acts and reporting questions to address before you make a coverage change.</p><p>These applications collect practice and insurance information. Please do not submit patient records or patient-identifying details.</p></div></section>
    <CTA /></>;
}
function MultifamilyPage() {
  return <><Intro label="Multifamily & community associations" title={<>Apartment, condo &amp; HOA insurance<br /><em>Look after the community.</em></>} actions={<><a className="button large hero-quote-jump" href="#quick-quote">Get a quote {arrow}</a><CallLink /><ArrowLink href="#property-types">Choose your property type</ArrowLink></>}>Insurance for apartment owners, condo boards, HOAs, and the people who manage them. Choose your property type for a coverage overview and a tailored quote application.</Intro>
    <Section title="Choose your property type." id="property-types"><div className="card-grid">{[
      ['condo-associations', 'Condo associations', 'Master policies, shared buildings, unit-owner responsibilities, board decisions, and association funds.', 'building'],
      ['apartments', 'Apartment complexes', 'Buildings, rental income, premises liability, maintenance, and property operations.', 'multifamily'],
      ['hoas', 'Homeowners associations', 'Common areas, amenities, community liability, board decisions, and association funds.', 'association'],
    ].map(([slug, title, description, icon], index) => <a className="card" href={`/multifamily/${slug}`} key={slug} data-reveal style={{ '--reveal-delay': `${index * 60}ms` }}><IconChip name={icon} /><h3>{title}</h3><p>{description}</p><span className="card-cta">Explore coverage &amp; apply {arrow}</span></a>)}</div></Section>
    <section className="wrap section specialty-info"><div className="panel" data-reveal><h2>The buildings are only part of the picture.</h2><p>We look at how the property is used, who maintains it, what your documents require, and what a claim could interrupt. That helps us ask insurance companies for options that fit your property and responsibilities.</p><p>Already have a property schedule, current policies, or insurance requirements? Each application includes document uploads so you can send what you already have.</p></div></section>
    <CTA /></>;
}

function AboutPage() {
  return <><Intro label="About Firebird" title={<>The Firebird Agency.<br /><em>Your independent insurance team.</em></>} actions={<><a className="button large" href="/quote">Get a quote {arrow}</a><CallLink /></>}>We are an independent insurance agency with offices in Mesa, Arizona and Carlsbad, California. We help businesses and families understand their choices and manage their coverage.</Intro>
    <Section title="Insurance advice for your needs"><div className="split"><p className="lead" data-reveal>You should understand what your insurance covers and know who to call when you need help.</p><div data-reveal><p>We take the time to understand your business or household before recommending coverage. As an independent agency, we can compare policies from several insurance companies and explain the differences.</p><p>Our relationship continues with certificates, policy changes, and renewal reviews. We value honest advice, attentive service, and lasting client relationships.</p><ArrowLink href="/careers">Careers at Firebird</ArrowLink></div></div></Section>
    <div className="band"><Section eyebrow="About us" title="Meet your Firebird team."><ul className="team-grid">{team.map((member, index) => <li className="person" key={member.name} data-reveal style={{ '--reveal-delay': `${(index % 5) * 50}ms` }}><img src={member.photo} width={member.size} height={member.size} loading="lazy" decoding="async" alt={`${member.name}, The Firebird Agency`} /><div className="person-info"><h3>{member.name}</h3>{member.bio && <p>{member.bio}</p>}<a className="text-link" href={`${EMAIL}?subject=${encodeURIComponent(`Connect with ${member.name}`)}`}>Get in touch <Icon name="mail" size={16} /></a></div></li>)}</ul></Section></div>
    <Section title="How we work with you."><Steps /></Section>
    <CTA /></>;
}
function ClientServicesPage() {
  return <><Intro label="Client services" title={<>Already a client?<br /><em>Let’s take care of it.</em></>} actions={<CallLink />}>Find the next step for certificates, policy changes, billing, or claims.</Intro>
    <Section title="What do you need help with?"><div className="detail-grid">
      <article data-reveal><IconChip name="file-check" className="sm" /><h3>Certificate of insurance</h3><p>Include your insured name, certificate holder name and address, job details, any insurance requirements, and your deadline.</p><ArrowLink href={`${SERVICE}?subject=Certificate%20request`}>Email a certificate request</ArrowLink></article>
      <article data-reveal style={{ '--reveal-delay': '60ms' }}><IconChip name="file" className="sm" /><h3>Policy changes</h3><p>Tell us your insured name, the change you need, requested effective date, and how to reach you.</p><ArrowLink href={`${SERVICE}?subject=Policy%20change%20request`}>Email the service team</ArrowLink></article>
      <article data-reveal style={{ '--reveal-delay': '120ms' }}><IconChip name="support" className="sm" /><h3>Claims &amp; payments</h3><p>Use your insurer’s claims or billing service. Check your policy for reporting instructions and deadlines.</p><ArrowLink href="/carriers">Find your carrier</ArrowLink></article>
    </div><p className="notice" data-reveal>Requests do not change coverage until confirmed by the agency or insurer. For a loss, report promptly using the instructions in your policy.</p><ArrowLink href="/client-login">Looking for the client portal?</ArrowLink></Section></>;
}
function CarriersPage() {
  return <><Intro label="Claims & payments" title={<>Get to the right<br /><em>insurance company.</em></>} actions={<CallLink />}>Your policy identifies the insurer responsible for your coverage. Use its instructions when reporting a claim or making a payment.</Intro>
    <Section title="Find your carrier."><div className="split"><div data-reveal><p className="lead">Use Firebird’s carrier directory for claims phone numbers and payment links.</p><a className="button" href="https://www.thefirebirdagency.com/contact-your-carrier.html">Open the carrier directory <Icon name="external" size={18} /></a><p className="small">Opens the agency’s maintained carrier directory.</p></div><div className="panel" data-reveal><h3>Not sure who to contact?</h3><p>Have your insured name and policy number ready. Our service team can help you find the right contact.</p><CallLink /><p><a href={SERVICE}>Email the service team</a></p></div></div></Section></>;
}
function ClientLoginPage() {
  return <><Intro label="Client portal" title={<>Need access to<br /><em>your policy documents?</em></>}>Contact our service team for current portal access instructions or help finding a document.</Intro>
    <Section title="We can help you get connected."><p className="lead" data-reveal>Call 877-747-9020 or email the service team with your insured name and contact information.</p><div className="inline-actions"><a className="button" href={`${SERVICE}?subject=Client%20portal%20access`}>Ask for portal access <Icon name="mail" size={18} /></a><CallLink /><ArrowLink href="/client-services">Other client services</ArrowLink></div></Section></>;
}
function CareersPage() {
  return <><Intro label="Careers" title={<>Careers at<br /><em>The Firebird Agency.</em></>}>We value integrity, curiosity, follow-through, and long-term client relationships. Contact us to ask about current opportunities.</Intro>
    <Section title="Roles at Firebird"><Details items={[
      ['Producers', 'Build business or personal insurance relationships and help clients identify coverage needs.', 'handshake'],
      ['Account managers', 'Coordinate ongoing relationships, coverage service, and renewals.', 'people'],
      ['Client service', 'Help clients with documents, policy updates, and everyday questions.', 'support'],
    ]} /><p className="section-more" data-reveal>Ask us about current openings, licensing, and application requirements.</p><a className="button" href={`${EMAIL}?subject=Career%20inquiry`}>Email about careers <Icon name="mail" size={18} /></a></Section></>;
}
function ContactPage() {
  const [topic, setTopic] = useState(contactTopics[0]);
  // Read ?topic= after hydration so the prerendered page and the browser start out identical.
  useEffect(() => {
    const supplied = new URLSearchParams(window.location.search).get('topic');
    if (contactTopics.includes(supplied)) setTopic(supplied);
  }, []);
  const emailBody = `Name: \nPhone: \nBusiness name (if applicable): \nCoverage needed: ${topic}\nRenewal or desired start date: \n\nPlease let me know the next steps.`;
  return <><Intro label="Contact us" title={<>Contact<br /><em>The Firebird Agency.</em></>} actions={<CallLink />}>Tell us what you need covered and when you need it. We’ll help you identify the next steps and the information needed for a quote.</Intro>
    <section className="wrap section contact-grid">
      <div className="contact-card" id="quick-quote" tabIndex={-1} data-track-area="quote-card"><span className="eyebrow">Start a conversation</span><h2>Call, request a call back, or email our team.</h2><a className="big-phone" href={PHONE}><Icon name="phone" size={26} />{AGENCY.phone}</a><CallbackForm topic={topic} onTopicChange={setTopic} /><p className="small email-option">Prefer email? <a id="quote-email" href={`${EMAIL}?subject=${encodeURIComponent(`${topic} quote request`)}&body=${encodeURIComponent(emailBody)}`}>Open an email request about {topic.toLowerCase()}</a> or write to <a href={EMAIL}>{AGENCY.email}</a>.</p></div>
      <div className="contact-next"><span className="eyebrow">What happens next</span><h2>How we can help</h2><ol className="contact-steps"><li>Tell us about your business, property, or vehicles.</li><li>We’ll review the details needed for a quote.</li><li>Compare coverage and cost with an agent.</li></ol><div className="panel"><h3>What to include</h3><p>Your name, best contact information, what you need insured, and your renewal or start date. Ask us how to send sensitive documents securely.</p></div><p>Already a client? <a href="/client-services">Get service help here.</a></p></div>
    </section>
    <Section title="Our offices"><div className="offices">{AGENCY.offices.map((office, index) => <article key={office.city} data-reveal style={{ '--reveal-delay': `${index * 60}ms` }}><IconChip name="map-pin" className="sm" /><span className="eyebrow">{office.state}</span><h3>{office.city}</h3><p>{office.street}<br />{office.locality}</p><a className="text-link" href={office.maps}>Get directions <Icon name="external" size={16} /></a></article>)}</div></Section>
    <Section title="Prefer to send your information online?"><p data-reveal>Use a tailored application for your construction business, property or association, dental or medical practice, or personal insurance. You can include policy documents and spreadsheets.</p><a className="button" href="/quote">Choose an application {arrow}</a></Section></>;
}
function PrivacyChoices() {
  const [optedOut, setOptedOut] = useState(false);
  const [gpc, setGpc] = useState(false);
  // Browser-only state, read after hydration so the prerendered page matches.
  useEffect(() => { setOptedOut(adsOptedOut()); setGpc(globalPrivacyControl()); }, []);
  function toggle() { setAdsOptOut(!optedOut); setOptedOut(!optedOut || gpc); }
  return <div className="privacy-choices" id="choices"><h2>Your privacy choices</h2><p>You can opt out of the use of your information for targeted advertising, which California law calls “sharing.” Your choice is saved in this browser. We also honor the Global Privacy Control signal sent by some browsers.</p><p role="status"><strong>{optedOut ? 'You are opted out of advertising cookies and sharing in this browser.' : 'Advertising cookies and sharing are allowed in this browser.'}</strong>{gpc && ' Your browser’s Global Privacy Control signal is on.'}</p>{!gpc && <button type="button" className="button" onClick={toggle}>{optedOut ? 'Allow advertising cookies' : 'Opt out of sharing for advertising'}</button>}</div>;
}
function PrivacyPage() {
  return <><Intro label="Your information" current="Privacy notice" title="Privacy notice">Quote applications and supporting documents</Intro><section className="section wrap quote-info"><h2>Information you choose to send</h2><p>Our applications collect contact details, insurance needs, business or household information, claims history, and documents you choose to upload. We use this information to review your request, contact you, and prepare insurance quotes. Additional information or carrier forms may be needed.</p><h2>Automatic draft saving</h2><p>Application answers save as you enter them, before final submission. Selected documents upload to the private draft. A necessary browser cookie remembers that application on your device; application answers are stored on our server rather than in browser storage. Saved drafts include the application type, current step, completion percentage, and last-save time.</p><p>Return to the same application in the same browser within 30 days of its last save to continue. Private return links let you continue on another device. Anyone with a return link can access that application, so keep it private. Phone upload links only allow adding documents. If cookies are cleared or another browser is used, the private return link is needed.</p><p>On a shared device, use “Forget on this device” to stop that browser from remembering the current application. This does not delete its database record. Draft records may remain after access expires; contact us to request deletion. These records may be reviewed to follow up about your insurance request, but are not completed applications or permission for unrelated marketing. Do not enter or upload patient records or patient-identifying information.</p><h2>How submissions are handled</h2><p>Applications, drafts, and attachments are stored in a private database. Submitting a form saves your information but does not automatically send an email notification to the agency. If you email us separately, your email provider handles that message. Please avoid sending Social Security numbers, payment details, driver’s license numbers, or patient records and patient-identifying information through these forms.</p><p>The website does not currently send applications automatically to AgencyZoom or to insurance companies.</p><h2>Website operation</h2><p>Technical information may be processed by the hosting provider to operate and protect this website. Submission attempts are limited to reduce abuse. Customers do not need an account to request a quote.</p><h2>Analytics and advertising</h2><p>This website may use Google Analytics, Google Ads, and Meta advertising tools to measure visits, learn which ads lead to quote requests, and show our ads to people who may need insurance. These services can set cookies and receive information such as pages viewed, the ad you clicked, and device details. When you send a request, a hashed (scrambled) version of the email or phone number you entered may be shared with Google to measure ad results. We store the ad or campaign that brought you to the site with your request so we can understand which advertising works.</p><PrivacyChoices /><h2>Questions or corrections</h2><p>To ask about information stored through this website, request a correction or deletion, or discuss an alternative way to submit documents, contact the operator of this website. For an agency insurance conversation, call <a href={PHONE}>877-747-9020</a> or email <a href={EMAIL}>info@thefirebirdagency.com</a>. Record retention may be subject to agency and legal requirements.</p><p>Submitting a form does not bind, amend, or cancel coverage.</p></section></>;
}
export const informationalPages = {
  '/business': BusinessPage,
  '/personal': PersonalPage,
  '/trucking': TruckingPage,
  '/medical-offices': MedicalPage,
  '/multifamily': MultifamilyPage,
  '/services': ServicesPage,
  '/about': AboutPage,
  '/client-services': ClientServicesPage,
  '/carriers': CarriersPage,
  '/client-login': ClientLoginPage,
  '/careers': CareersPage,
  '/contact': ContactPage,
  '/privacy': PrivacyPage,
  ...Object.fromEntries(coverageData.map(coverage => [coverage.href, () => <CoverageGuide coverage={coverage} />])),
  ...Object.fromEntries(truckingTypes.map(operation => [operation.href, () => <TruckingDetail operation={operation} />])),
  ...Object.fromEntries(Object.entries(specialtyData).map(([path, data]) => [path, () => <SpecialtyPage data={data} />])),
};
export const pageTitles = {
  '/business':'Business & Contractor Insurance', '/personal':'Home, Auto & Personal Insurance', '/trucking':'Trucking Insurance', '/medical-offices':'Dental & Medical Office Insurance', '/multifamily':'Multifamily & Community Association Insurance', '/services':'Insurance Services', '/about':'About Firebird', '/client-services':'Client Services', '/carriers':'Claims & Payments', '/client-login':'Client Portal', '/careers':'Careers', '/contact':'Contact & Request a Quote', '/privacy':'Privacy Notice',
  ...Object.fromEntries(coverageData.map(coverage => [coverage.href, coverage.title])),
  ...Object.fromEntries(truckingTypes.map(operation => [operation.href, `${operation.title} insurance`])),
  ...Object.fromEntries(Object.entries(specialtyData).map(([path, data]) => [path, data.name])),
};


// Document metadata matched to each rendered reference route.
export const pageMetadata = {
  "/business": {"title":"Business & Contractor Insurance | Firebird Agency","description":"Compare business and contractor insurance with Firebird: general liability, workers’ comp, property, commercial auto and umbrella. Start a coverage review."},
  "/personal": {"title":"Home, Auto & Personal Insurance | Firebird Agency","description":"Compare home, auto, umbrella and other personal insurance with Firebird in Mesa, AZ and Carlsbad, CA. Clear advice and a straightforward quote process."},
  "/trucking": {"title":"Trucking Insurance for Owner-Operators & Fleets | Firebird","description":"Trucking insurance for owner-operators, fleets and new authorities. Review liability, physical damage, cargo and trailers with The Firebird Agency."},
  "/medical-offices": {"title":"Dental practice & small medical office insurance | Firebird Agency","description":"Insurance for dental practices and small medical offices. Review malpractice, office property, equipment, cyber, and employee coverage with tailored applications."},
  "/multifamily": {"title":"Apartment, condo association & HOA insurance | Firebird Agency","description":"Insurance reviews and tailored applications for apartment complexes, condo associations, and HOAs. Share property details and upload current insurance documents."},
  "/services": {"title":"Insurance Coverage Guide | The Firebird Agency","description":"Explore business, trucking and personal insurance in plain language. Find the coverage to discuss with your Firebird agent."},
  "/about": {"title":"About Our Independent Insurance Agency | Firebird","description":"Meet The Firebird Agency: independent insurance advice, offices in Mesa and Carlsbad, and support for business owners and families."},
  "/client-services": {"title":"Certificates, Policy Changes & Client Services | Firebird","description":"Request a certificate of insurance, ask for a policy change, or find claims and billing help from The Firebird Agency."},
  "/carriers": {"title":"Insurance Claims & Payments | Firebird Carrier Directory","description":"Find claims and payment contacts in Firebird’s carrier directory, or contact the service team for help identifying your insurer."},
  "/client-login": {"title":"Client Portal Help | The Firebird Agency","description":"Contact Firebird for client portal access and help with policy documents, certificates and service requests."},
  "/careers": {"title":"Insurance Careers | The Firebird Agency","description":"Explore producer, account management and client service opportunities with The Firebird Agency. Contact us about current openings."},
  "/contact": {"title":"Request an Insurance Quote | Contact Firebird Agency","description":"Call 877-747-9020 or email Firebird to request business, trucking, home or auto insurance. Offices in Mesa, Arizona and Carlsbad, California."},
  "/privacy": {"title":"Privacy notice | Firebird Agency","description":"How The Firebird Agency handles website quote applications and attachments."},
  "/medical-offices/dental-practices": {"title":"Dental practice insurance & quote application | Firebird Agency","description":"Insurance reviews for dental offices: malpractice, treatment equipment, business income, cyber, workers’ compensation, and more. Start a dental-specific application."},
  ...Object.fromEntries(coverageData.map(coverage => [coverage.href, { title: `${coverage.title} | The Firebird Agency`, description: `${coverage.description} Contact Firebird in Mesa, Arizona and Carlsbad, California.` }])),
  ...Object.fromEntries(truckingTypes.map(operation => [operation.href, { title: `${operation.title} Trucking Insurance | Firebird Agency`, description: `${operation.description} Talk with Firebird about your trucking insurance.` }])),
  ...Object.fromEntries(Object.entries(specialtyData).filter(([path]) => path.startsWith('/multifamily/')).map(([path, data]) => [path, { title: `${data.name} insurance | Firebird Agency`, description: data.description }])),
};

const intakeMetadataRoutes = new Set(['/medical-offices', '/medical-offices/dental-practices', '/multifamily', '/multifamily/condo-associations', '/multifamily/apartments', '/multifamily/hoas', '/privacy']);
for (const [path, metadata] of Object.entries(pageMetadata)) metadata.usesIntakeStyles = intakeMetadataRoutes.has(path);
