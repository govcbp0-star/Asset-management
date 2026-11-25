import { useState, type FormEvent } from 'react'
import { ArrowDownRight, ArrowRight, CheckCircle2, LockKeyhole, Mail, Menu, Phone, Send, ShieldCheck, UserRound, X } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { postPublicApi } from '../lib/api'

const sampleContactEmail = 'enquiries@example.com'
const sampleContactPhone = '+1 (202) 555-0147'
const publicContactEmail = import.meta.env.VITE_PUBLIC_CONTACT_EMAIL?.trim() || sampleContactEmail
const publicContactPhone = import.meta.env.VITE_PUBLIC_CONTACT_PHONE?.trim() || sampleContactPhone
const publicContactTelephone = publicContactPhone.replace(/[^\d+]/g, '')
const usingSampleContactDetails = !import.meta.env.VITE_PUBLIC_CONTACT_EMAIL?.trim() || !import.meta.env.VITE_PUBLIC_CONTACT_PHONE?.trim()

type InformationSection = { kicker: string; title: string; body: string; bullets: string[] }

const pageCopy: Record<string, { eyebrow: string; title: string; body: string; bullets: string[]; sections?: InformationSection[] }> = {
  '/services': {
    eyebrow: 'SERVICES', title: 'A clearer record of what you own.', body: 'A permissioned asset register brings ownership context, evidence review status, and dated valuation information into one organized account. Each record keeps its stated limits visible.', bullets: ['Asset inventory organized by legal-owner entity', 'Evidence decisions with reviewer rationale', 'Valuations with amount, currency, source, method, and date', 'A client dashboard with recorded portfolio activity'],
    sections: [
      { kicker: '01 / REGISTER', title: 'One organized asset record', body: 'Keep a consistent record for real estate, deposits, investments, business interests, vehicles, collections, and other holdings.', bullets: ['Identify the client account and legal owner', 'Describe the asset and its category', 'See the current record and evidence status'] },
      { kicker: '02 / EVIDENCE', title: 'Review status with context', body: 'Authorized staff can record whether evidence was reviewed or needs follow-up, with a written rationale attached to the decision.', bullets: ['A recorded status explains what happened', 'A rationale gives the decision context', 'A review does not certify legal title'] },
      { kicker: '03 / VALUATION', title: 'Values with dates and sources', body: 'Keep valuation details together so a reported amount can be read in its stated currency, time, source, and method.', bullets: ['Dated valuation history', 'Explicit currency and source', 'No promise of future or market value'] },
    ],
  },
  '/who-we-serve': {
    eyebrow: 'WHO WE SERVE', title: 'Built around complex ownership.', body: 'A structured register is useful when assets are held across multiple categories, legal owners, or locations and a single account view is easier to maintain.', bullets: ['Private clients and households', 'Family offices coordinating multiple holdings', 'Companies maintaining an asset register'],
    sections: [
      { kicker: 'PRIVATE CLIENTS', title: 'A more complete personal view', body: 'Bring property, investments, deposits, and personal assets into an account-level record with clear ownership and valuation context.', bullets: ['See the records associated with your account', 'Understand evidence and valuation status', 'Keep beneficiary details in the client portal'] },
      { kicker: 'FAMILY OFFICES', title: 'Structure across entities', body: 'Organize complex portfolios around the legal-owner entities connected to each asset record.', bullets: ['Separate holdings by owner', 'Review dated values in context', 'Keep a documented record of operational changes'] },
      { kicker: 'ORGANIZATIONS', title: 'A consistent asset register', body: 'Maintain a shared operational view of assets entered by authorized staff and the evidence decisions recorded for them.', bullets: ['Use consistent asset categories', 'Record review outcomes and rationale', 'Keep information access permission-scoped'] },
    ],
  },
  '/how-it-works': {
    eyebrow: 'HOW IT WORKS', title: 'Every record has a source and a status.', body: 'The registry separates the asset description, evidence decision, and valuation history so each part can be understood on its own terms.', bullets: ['Create and verify an account', 'Group assets by legal-owner entity', 'Review evidence and record a rationale', 'Add dated valuations and later changes'],
    sections: [
      { kicker: 'STEP 01', title: 'Set up an account', body: 'Create a client sign-in and complete the account details needed to establish the private registry workspace.', bullets: ['Verify your email address', 'Complete the account profile', 'Account access follows the assigned role'] },
      { kicker: 'STEP 02', title: 'Build the register', body: 'Assets are entered against the account and the legal-owner entity shown for each record.', bullets: ['Choose an asset category', 'Add identifying details and location', 'See records in the client dashboard'] },
      { kicker: 'STEP 03', title: 'Review and maintain', body: 'Authorized staff record evidence outcomes, rationale, and valuations; saved changes become visible in the relevant account view.', bullets: ['Review or request follow-up on evidence', 'Record valuation source and effective date', 'Retain dated activity for context'] },
    ],
  },
  '/about': {
    eyebrow: 'ABOUT', title: 'Clarity, with limits made visible.', body: 'Aurelius Registry is a private asset recordkeeping platform. It is designed to organize information, document review decisions, and present valuation details with their context.', bullets: ['Role-based access to account information', 'Recorded changes and evidence decisions', 'Separate ownership evidence from valuation status'],
    sections: [
      { kicker: 'OUR APPROACH', title: 'Make the record understandable', body: 'A useful registry shows what information was recorded, how it is organized, and when its status or valuation changed.', bullets: ['Use structured asset categories', 'Connect records to legal owners', 'Keep dated details together'] },
      { kicker: 'OUR RESPONSIBILITY', title: 'Make access and activity clear', body: 'Account access is permission-scoped. Authorized actions are routed through the server and recorded where applicable.', bullets: ['Protect private account views', 'Record operational changes', 'Limit staff actions by assigned role'] },
      { kicker: 'OUR LIMITS', title: 'A record is not a certification', body: 'The registry does not establish legal title, hold assets, execute transactions, guarantee valuations, or provide legal or investment advice.', bullets: ['Evidence review has a defined scope', 'Reported values are not guaranteed prices', 'Clients remain responsible for independent professional advice'] },
    ],
  },
  '/privacy': {
    eyebrow: 'PRIVACY', title: 'Privacy is part of the product design.', body: 'This implementation is a development scaffold. Public enquiry submissions are stored for administrator review; a production service must publish an approved privacy notice with its operator, lawful purposes, retention periods, and contact channels.', bullets: ['Account records are access scoped', 'Public enquiries include the name, email, and message submitted', 'A derived network-address key is used to limit repeat submissions', 'Do not include credentials or sensitive portfolio information in an enquiry'],
  },
  '/terms': {
    eyebrow: 'TERMS', title: 'Service terms are not yet in force.', body: 'The service operator, governing law, client agreement, and service limitations must be finalized before accepting production clients. The current onboarding flow records version identifiers for development only.', bullets: ['No production service agreement is supplied', 'No title, ownership, or valuation guarantee is made'],
  },
  '/disclosures': {
    eyebrow: 'DISCLOSURES', title: 'Know what a record means.', body: 'An asset record summarizes information supplied to or gathered by authorized staff. Evidence review documents a defined review scope; it does not establish legal title or government recognition.', bullets: ['Registered gross value is not net worth', 'Reported values are not guaranteed market prices', 'No custody, brokerage, transaction execution, or investment advice', 'No external registry checks are integrated in this build'],
  },
}

const publicLinks = [
  ['/', 'Home'], ['/services', 'Services'], ['/who-we-serve', 'Who we serve'], ['/how-it-works', 'How it works'], ['/about', 'About'], ['/contact', 'Contact'],
] as const

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  return <div className="public-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="public-header"><div className="public-header-inner"><Brand />
      <button className="icon-button public-menu-toggle" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? 'Close menu' : 'Open menu'}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
      <nav className={`public-nav${menuOpen ? ' public-nav-open' : ''}`} aria-label="Main navigation">
        {publicLinks.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setMenuOpen(false)}>{label}</NavLink>)}
        <Link className="header-signin" to="/login" onClick={() => setMenuOpen(false)}><UserRound size={14} /> My account</Link>
      </nav>
    </div></header>
    {children}
    <footer className="public-footer"><div className="public-footer-main"><Brand inverse /><p>Private asset records, maintained with care and transparent limits.</p><div className="footer-links"><Link to="/contact">Contact</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/disclosures">Disclosures</Link></div><div className="footer-contact"><span>{usingSampleContactDetails ? 'SAMPLE CONTACTS - REPLACE BEFORE LAUNCH' : 'CONTACT'}</span><a href={"mailto:" + publicContactEmail}><Mail size={13} /> {publicContactEmail}</a><a href={"tel:" + publicContactTelephone}><Phone size={13} /> {publicContactPhone}</a>{usingSampleContactDetails && <small>Sample only; replace with official contacts before launch</small>}</div></div><div className="footer-bottom"><span>Copyright 2026 Aurelius Registry</span><span>Recordkeeping only. Not legal title certification or financial advice.</span></div></footer>
    {pathname === '/' && <span className="sr-only">Welcome</span>}
  </div>
}

export function HomePage() {
  return <PublicLayout><main id="main-content">
    <section className="hero-section"><div className="hero-copy"><p className="eyebrow"><span className="eyebrow-line" />PRIVATE ASSET RECORDKEEPING</p><h1>A considered view of <em>what matters.</em></h1><p className="hero-description">One discreet, well-structured register for the assets, entities, and evidence that make up a private portfolio.</p><div className="hero-actions"><Link className="button button-gold" to="/register">Create account <ArrowRight size={16} /></Link><Link className="text-link" to="/how-it-works">See how it works <ArrowDownRight size={16} /></Link></div><div className="hero-footnote"><LockKeyhole size={14} /><span>Private by design · Clear about what is verified</span></div></div>
      <div className="hero-art" aria-label="Abstract architectural illustration of a secure private registry" role="img"><div className="art-grid" /><div className="art-orbit art-orbit-one" /><div className="art-orbit art-orbit-two" /><div className="art-panel"><div className="art-panel-top"><span className="art-dot" /><span>PRIVATE PORTFOLIO</span><span className="art-menu">•••</span></div><div className="art-panel-body"><div className="art-label">REGISTERED ASSETS</div><div className="art-number">04<span> records</span></div><div className="art-rule" /><div className="art-lines"><span /><span /><span /></div></div><div className="art-seal"><ShieldCheck size={19} /><span>DOCUMENTED<br />SCOPE</span></div></div><div className="art-caption"><span>FIG. 01</span><span>AN ORDERED VIEW</span></div></div>
    </section>
    <section className="trust-strip"><div><span className="trust-num">01</span><p>Private, permissioned<br />accounts</p></div><div><span className="trust-num">02</span><p>Evidence reviewed<br />with a clear scope</p></div><div><span className="trust-num">03</span><p>Values recorded<br />with source and date</p></div><div><span className="trust-num">04</span><p>History kept<br />with the record</p></div></section>
    <section className="intro-section"><div className="section-label">A MORE ORDERED RECORD</div><div><h2>Complex holdings deserve <em>clear context.</em></h2><p>Property, operating companies, investments, and personal collections rarely sit in one place. Aurelius brings the record together while keeping ownership evidence, valuations, and access history distinct.</p><Link className="text-link dark-link" to="/services">Explore the service <ArrowRight size={15} /></Link></div></section>
    <section className="asset-types-section">
      <div className="section-heading"><div><p className="eyebrow"><span className="eyebrow-line" />A BROAD VIEW OF PRIVATE ASSETS</p><h2>Different holdings. <em>One considered record.</em></h2></div><p>Keep each record connected to its legal owner, supporting evidence, and the history that gives it context.</p></div>
      <div className="asset-types-grid">
        <article><span className="principle-index">01 / PROPERTY</span><h3>Real estate</h3><p>Record property by name, location, owner entity, and supporting evidence status.</p></article>
        <article><span className="principle-index">02 / LIQUID ASSETS</span><h3>Cash and investments</h3><p>Keep account and investment records organized within the portfolio register.</p></article>
        <article><span className="principle-index">03 / ENTERPRISE</span><h3>Business interests</h3><p>Maintain a structured view of business holdings and the entities that own them.</p></article>
        <article><span className="principle-index">04 / PERSONAL PROPERTY</span><h3>Vehicles and collections</h3><p>Include vehicles, art, collectibles, and other individually described assets.</p></article>
        <article><span className="principle-index">05 / OWNERSHIP</span><h3>Legal-owner entities</h3><p>Group records by the person or organization shown as their legal owner.</p></article>
        <article><span className="principle-index">06 / CHANGE HISTORY</span><h3>Values over time</h3><p>Keep valuation amount, currency, effective date, source, and method together.</p></article>
      </div>
    </section>
    <section className="workflow-section">
      <div className="section-heading"><div><p className="eyebrow"><span className="eyebrow-line" />HOW THE REGISTER WORKS</p><h2>From an entry to <em>a clear status.</em></h2></div><p>Each step adds useful context while keeping the limits of a record visible.</p></div>
      <div className="workflow-grid">
        <article><span>01</span><div><h3>Organize the portfolio</h3><p>Assets are recorded against the client account and legal-owner entity, with a category and relevant description.</p></div></article>
        <article><span>02</span><div><h3>Review the evidence</h3><p>An authorized reviewer records whether evidence was reviewed or needs follow-up, along with a written rationale.</p></div></article>
        <article><span>03</span><div><h3>Keep the record current</h3><p>Dated valuations and later changes add history, so each value can be understood in its stated context.</p></div></article>
      </div>
    </section>
    <section className="principles-section"><div className="section-heading"><div><p className="eyebrow"><span className="eyebrow-line" />A DISCIPLINED APPROACH</p><h2>Trust comes from <em>transparency.</em></h2></div><p>Every status should tell you what was checked, by whom, and on what date.</p></div><div className="principle-grid"><article><span className="principle-index">01 / RECORD</span><h3>One structured register</h3><p>Capture assets against the legal-owner entities that hold them, with the details needed to understand each record.</p></article><article><span className="principle-index">02 / REVIEW</span><h3>Evidence with boundaries</h3><p>Document the sources and scope of a review. An evidence review is never presented as legal title certification.</p></article><article><span className="principle-index">03 / VALUE</span><h3>Values in context</h3><p>Keep the amount, currency, valuation date, source, and method together. A reported value is not a market guarantee.</p></article></div></section>
    <section className="closing-cta"><p className="eyebrow">A PRIVATE VIEW, AT YOUR PACE</p><div><h2>Bring the picture <em>into focus.</em></h2><Link className="button button-light" to="/register">Create account <ArrowRight size={16} /></Link></div></section>
  </main></PublicLayout>
}

export function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')
  const [consented, setConsented] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setSent(false)
    try {
      await postPublicApi<{ received: boolean }>('/api/submitContactEnquiry', { name, email, message, website })
      setName('')
      setEmail('')
      setMessage('')
      setWebsite('')
      setConsented(false)
      setSent(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your enquiry could not be sent. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return <PublicLayout><main id="main-content" className="contact-page">
    <section className="contact-hero">
      <div><p className="eyebrow"><span className="eyebrow-line" />CONTACT AURELIUS</p><h1>Clear routes for account and service questions.</h1><p className="information-lead">Use the form to send a general enquiry to the administrator inbox. For private account details, sign in to your dashboard instead.</p><div className="contact-sample-details"><span>{usingSampleContactDetails ? 'SAMPLE CONTACT DETAILS - REPLACE BEFORE LAUNCH' : 'CONTACT DETAILS'}</span><a href={"mailto:" + publicContactEmail}><Mail size={15} /> {publicContactEmail}</a><a href={"tel:" + publicContactTelephone}><Phone size={15} /> {publicContactPhone}</a></div></div>
      <aside className="contact-intro-card"><span className="contact-card-index">CLIENT SERVICES</span><h2>Private by design.<br /><em>Clear in practice.</em></h2><p>We keep account records access-scoped and describe what evidence reviews and valuations establish, along with their limits.</p><Link className="text-link dark-link" to="/disclosures">Read service disclosures <ArrowRight size={15} /></Link></aside>
    </section>
    <section className="contact-form-section" aria-labelledby="contact-form-title">
      <div className="contact-form-intro"><p className="eyebrow"><span className="eyebrow-line" />GENERAL ENQUIRIES</p><h2 id="contact-form-title">Send us a message</h2><p>Your name, email, and message are delivered to the private admin inbox. Please do not include passwords, identity documents, or confidential portfolio details.</p></div>
      <form className="contact-form" onSubmit={(event) => void submit(event)}>
        {error && <div className="contact-form-feedback contact-form-error" role="alert">{error}</div>}
        {sent && <div className="contact-form-feedback contact-form-success" role="status"><CheckCircle2 size={17} /> Your enquiry was received and added to the administrator inbox.</div>}
        <div className="contact-form-row"><label className="contact-field"><span>Your name</span><input name="name" autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" /></label><label className="contact-field"><span>Email address</span><input name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label></div>
        <label className="contact-field"><span>Message</span><textarea name="message" required minLength={15} maxLength={3000} rows={6} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="How can we help?" /></label>
        <div className="contact-honeypot" aria-hidden="true"><label htmlFor="contact-website">Leave this field blank</label><input id="contact-website" name="website" autoComplete="off" tabIndex={-1} value={website} onChange={(event) => setWebsite(event.target.value)} /></div>
        <label className="contact-consent"><input type="checkbox" required checked={consented} onChange={(event) => setConsented(event.target.checked)} /><span>I understand my name, email, and message will be stored for administrator review. See the <Link to="/privacy">privacy notice</Link>.</span></label>
        <button className="button button-dark" type="submit" disabled={busy || !consented}>{busy ? 'Sending enquiry...' : 'Send enquiry'} <Send size={15} /></button>
        <p className="contact-form-footnote">Messages are rate-limited to reduce automated spam. Do not use this form for urgent requests or sensitive account matters.</p>
      </form>
    </section>
    <section className="contact-options-section" aria-labelledby="contact-options-title">
      <div className="contact-section-heading"><div><p className="eyebrow"><span className="eyebrow-line" />OTHER ROUTES</p><h2 id="contact-options-title">Choose a route</h2></div><p>For your privacy, do not include account credentials or portfolio details in a public enquiry.</p></div>
      <div className="contact-grid">
        <section className="contact-card"><p className="principle-index">01 / ACCOUNT ACCESS</p><h3>Manage your account</h3><p>Sign in to review your account, update your profile, or access your private dashboard.</p><Link className="button button-dark" to="/login"><UserRound size={15} /> Sign in securely <ArrowRight size={15} /></Link></section>
        <section className="contact-card"><p className="principle-index">02 / SERVICE OVERVIEW</p><h3>Understand the registry</h3><p>Learn what the register covers, how records are reviewed, and how status and valuation history are presented.</p><div className="contact-link-row"><Link className="text-link dark-link" to="/services">Services <ArrowRight size={14} /></Link><Link className="text-link dark-link" to="/how-it-works">How it works <ArrowRight size={14} /></Link></div></section>
        <section className="contact-card"><p className="principle-index">03 / PRIVACY</p><h3>Review privacy and service limits</h3><p>Read the current privacy information and the limits that apply to registry records and evidence review.</p><div className="contact-link-row"><Link className="text-link dark-link" to="/privacy">Privacy <ArrowRight size={14} /></Link><Link className="text-link dark-link" to="/disclosures">Disclosures <ArrowRight size={14} /></Link></div></section>
      </div>
    </section>
  </main></PublicLayout>
}

export function InformationPage({ pathname }: { pathname: string }) {
  const page = pageCopy[pathname] ?? pageCopy['/about']
  return <PublicLayout><main id="main-content" className={`information-page${page.sections ? ' information-page-rich' : ''}`}>
    <p className="eyebrow"><span className="eyebrow-line" />{page.eyebrow}</p>
    <h1>{page.title}</h1>
    <p className="information-lead">{page.body}</p>
    <div className="information-rule" />
    <ul className="information-highlights">{page.bullets.map((bullet) => <li key={bullet}><span className="bullet-mark">-</span>{bullet}</li>)}</ul>
    {page.sections && <section className="information-detail-grid">{page.sections.map((section) => <article className="information-detail-card" key={section.kicker}>
      <p className="principle-index">{section.kicker}</p><h2>{section.title}</h2><p>{section.body}</p><ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
    </article>)}</section>}
    {pathname !== '/privacy' && pathname !== '/terms' && <Link className="text-link dark-link" to="/register">Create an account <ArrowRight size={15} /></Link>}
    <aside className="plain-disclaimer"><ShieldCheck size={17} /><p>Records describe information held by the service. The platform does not certify legal title, guarantee valuations, or provide investment advice.</p></aside>
  </main></PublicLayout>
}
