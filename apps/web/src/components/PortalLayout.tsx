import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Activity, BriefcaseBusiness, ChevronDown, CircleHelp, FileText, LayoutDashboard, LogOut, Menu, Settings2, ShieldCheck, Users, X } from 'lucide-react'
import { RoleHomePath, type UserRole } from '@pwarpi/shared'
import { Brand } from './Brand'
import { useAuth } from '../app/useAuth'

const roleLabels: Record<UserRole, string> = {
  client_owner: 'Client owner',
  client_delegate: 'Client delegate',
  registrar: 'Registrar',
  verifier: 'Evidence reviewer',
  valuation_specialist: 'Valuation specialist',
  compliance_officer: 'Compliance officer',
  platform_administrator: 'Platform administrator',
  auditor: 'Auditor',
}

export function PortalLayout() {
  const { user, claims, logOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const role = (claims.role ?? 'client_owner') as UserRole
  const isClient = role === 'client_owner' || role === 'client_delegate'
  const clientLinks = isClient
    ? [
        { to: '/app/overview', label: 'Overview', icon: LayoutDashboard, end: true },
        { to: '/app/assets', label: 'My assets', icon: BriefcaseBusiness },
        { to: '/app/analytics', label: 'Analytics', icon: Activity },
        { to: '/app/requests', label: 'Requests', icon: FileText },
        { to: '/app/settings/security', label: 'Security', icon: ShieldCheck },
      ]
    : []
  const staffLinks = [
    { to: '/admin/overview', label: 'Operations overview', icon: LayoutDashboard, end: true, roles: ['registrar', 'valuation_specialist', 'compliance_officer', 'platform_administrator', 'auditor'] },
    { to: '/admin/clients', label: 'Clients', icon: Users, roles: ['compliance_officer', 'platform_administrator'] },
    { to: '/admin/assets', label: 'Asset register', icon: BriefcaseBusiness, roles: ['registrar', 'compliance_officer', 'platform_administrator'] },
    { to: '/admin/reviews', label: 'Review queue', icon: ShieldCheck, roles: ['verifier', 'platform_administrator'] },
    { to: '/admin/valuations', label: 'Valuations', icon: Activity, roles: ['valuation_specialist', 'platform_administrator'] },
    { to: '/admin/onboarding', label: 'Onboarding', icon: Users, roles: ['compliance_officer', 'platform_administrator'] },
    { to: '/admin/audit', label: 'Audit activity', icon: Activity, roles: ['compliance_officer', 'platform_administrator', 'auditor'] },
  ]
  const links = isClient ? clientLinks : staffLinks.filter((link) => link.roles.includes(role))

  async function handleSignOut() {
    await logOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="portal-frame">
      <aside className={`sidebar${menuOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-top"><Brand inverse /><button className="icon-button mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X size={19} /></button></div>
        <div className="account-card">
          <span className="account-avatar">{(user?.displayName ?? user?.email ?? 'P').charAt(0).toUpperCase()}</span>
          <div className="account-copy"><strong>{user?.displayName || 'Private account'}</strong><span>{roleLabels[role]}</span></div>
          <ChevronDown size={15} aria-hidden="true" />
        </div>
        <p className="nav-caption">ACCOUNT</p>
        <nav className="portal-nav" aria-label="Account navigation">
          {links.map(({ to, label, icon: Icon, end }) => <NavLink key={to} end={end} to={to} onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}><Icon size={17} strokeWidth={1.8} /><span>{label}</span></NavLink>)}
        </nav>
        <div className="sidebar-bottom">
          <Link className="nav-link" to="/disclosures"><CircleHelp size={17} /><span>Service disclosures</span></Link>
          <button className="nav-link signout-link" onClick={handleSignOut}><LogOut size={17} /><span>Sign out</span></button>
        </div>
      </aside>
      {menuOpen && <button className="mobile-scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}
      <div className="portal-main">
        <header className="portal-topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <div className="breadcrumbs"><span>Account</span><span className="breadcrumb-slash">/</span><strong>{isClient ? 'Client portal' : 'Operations'}</strong></div>
          <div className="topbar-actions"><span className="account-email">{user?.email}</span><Link className="topbar-icon" to={RoleHomePath[role]} aria-label="Account settings"><Settings2 size={18} /></Link><span className="avatar-small">{(user?.displayName ?? user?.email ?? 'P').charAt(0).toUpperCase()}</span></div>
        </header>
        <main className="portal-content"><Outlet /></main>
        <footer className="portal-footer"><span>PRIVATE WEALTH REGISTRY</span><span>Recorded information is not a title certification or investment advice.</span></footer>
      </div>
    </div>
  )
}
