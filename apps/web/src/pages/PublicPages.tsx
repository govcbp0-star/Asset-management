import { useState } from 'react'
import { ArrowDownRight, ArrowRight, LockKeyhole, Menu, ShieldCheck, UserRound, X } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Brand } from '../components/Brand'

const pageCopy: Record<string, { eyebrow: string; title: string; body: string; bullets: string[] }> = {
  '/services': {
    eyebrow: 'SERVICES', title: 'A clearer record of what you own.', body: 'A secure, professionally maintained register brings asset details, supporting evidence, and valuation history into one permissioned account.', bullets: ['Asset inventory and entity records', 'Evidence review with a documented scope', 'Valuation history with source and date', 'Dated portfolio summaries with clear caveats'],
  },
  '/who-we-serve': {
    eyebrow: 'WHO WE SERVE', title: 'Built around complex ownership.', body: 'A structured record can help individuals, companies, and family offices keep track of assets held across entities and locations.', bullets: ['Private clients and households', 'Family offices and delegated teams', 'Companies with controlled asset registers'],
  },
  '/how-it-works': {
    eyebrow: 'HOW IT WORKS', title: 'Every record has a source and a status.', body: 'Authorized staff prepare records, reviewers assess submitted evidence independently, and clients see what has been checked and when.', bullets: ['Create an account', 'Organize assets by legal-owner entity', 'Review evidence with scope and rationale', 'Maintain dated valuation and change history'],
  },
  '/about': {
    eyebrow: 'ABOUT', title: 'Clarity, with limits made visible.', body: 'The registry is designed for careful recordkeeping and transparent evidence review. It is not a government title register, custodian, broker, or investment adviser.', bullets: ['Privacy by default', 'Role-based access and documented activity', 'Separate ownership evidence from valuation status'],
  },
  '/privacy': {
    eyebrow: 'PRIVACY', title: 'Privacy is part of the product design.', body: 'This implementation is a development scaffold. A production service must publish an approved privacy notice that identifies its operator, purposes, legal bases, retention periods, and contact channels.', bullets: ['Account records are access scoped', 'The browser cannot directly read private RTDB records', 'Do not enter real personal, identity, or financial data in this build'],
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
    <footer className="public-footer"><div className="public-footer-main"><Brand inverse /><p>Private asset records, maintained with care and transparent limits.</p><div className="footer-links"><Link to="/contact">Contact</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/disclosures">Disclosures</Link></div></div><div className="footer-bottom"><span>© 2026 Aurelius Registry</span><span>Recordkeeping only. Not legal title certification or financial advice.</span></div></footer>
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
    <section className="principles-section"><div className="section-heading"><div><p className="eyebrow"><span className="eyebrow-line" />A DISCIPLINED APPROACH</p><h2>Trust comes from <em>transparency.</em></h2></div><p>Every status should tell you what was checked, by whom, and on what date.</p></div><div className="principle-grid"><article><span className="principle-index">01 / RECORD</span><h3>One structured register</h3><p>Capture assets against the legal-owner entities that hold them, with the details needed to understand each record.</p></article><article><span className="principle-index">02 / REVIEW</span><h3>Evidence with boundaries</h3><p>Document the sources and scope of a review. An evidence review is never presented as legal title certification.</p></article><article><span className="principle-index">03 / VALUE</span><h3>Values in context</h3><p>Keep the amount, currency, valuation date, source, and method together. A reported value is not a market guarantee.</p></article></div></section>
    <section className="closing-cta"><p className="eyebrow">A PRIVATE VIEW, AT YOUR PACE</p><div><h2>Bring the picture <em>into focus.</em></h2><Link className="button button-light" to="/register">Create account <ArrowRight size={16} /></Link></div></section>
  </main></PublicLayout>
}

export function ContactPage() {
  return <PublicLayout><main id="main-content" className="information-page contact-page">
    <p className="eyebrow"><span className="eyebrow-line" />CONTACT</p>
    <h1>Start a conversation.</h1>
    <p className="information-lead">Service availability and onboarding are being established. Public contact details will be published when client service operations are ready.</p>
    <div className="information-rule" />
    <div className="contact-grid">
      <section className="contact-card">
        <p className="principle-index">ACCOUNT ACCESS</p>
        <h2>Already have an account?</h2>
        <p>Sign in to access your private account and services.</p>
        <Link className="button button-dark" to="/login"><UserRound size={15} /> My account <ArrowRight size={15} /></Link>
      </section>
      <section className="contact-card">
        <p className="principle-index">GENERAL ENQUIRIES</p>
        <h2>Contact details coming soon</h2>
        <p>Public contact channels will appear here once client service operations are ready.</p>
        <p className="contact-note">Please do not send identity documents or private portfolio details through public channels.</p>
      </section>
    </div>
    <aside className="plain-disclaimer"><ShieldCheck size={17} /><p>Records describe information held by the service. The platform does not certify legal title, guarantee valuations, or provide investment advice.</p></aside>
  </main></PublicLayout>
}

export function InformationPage({ pathname }: { pathname: string }) {
  const page = pageCopy[pathname] ?? pageCopy['/about']
  return <PublicLayout><main id="main-content" className="information-page"><p className="eyebrow"><span className="eyebrow-line" />{page.eyebrow}</p><h1>{page.title}</h1><p className="information-lead">{page.body}</p><div className="information-rule" /><ul>{page.bullets.map((bullet) => <li key={bullet}><span className="bullet-mark">—</span>{bullet}</li>)}</ul>{pathname !== '/contact' && pathname !== '/privacy' && pathname !== '/terms' && <Link className="text-link dark-link" to="/register">Create an account <ArrowRight size={15} /></Link>}<aside className="plain-disclaimer"><ShieldCheck size={17} /><p>Records describe information held by the service. The platform does not certify legal title, guarantee valuations, or provide investment advice.</p></aside></main></PublicLayout>
}
