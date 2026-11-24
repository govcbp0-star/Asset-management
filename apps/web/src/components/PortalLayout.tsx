import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Activity, BriefcaseBusiness, CircleHelp, CircleUserRound, FileText, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, Users, UsersRound, X, type LucideIcon } from 'lucide-react'
import type { UserRole } from '@pwarpi/shared'
import { Brand } from './Brand'
import { useAuth } from '../app/useAuth'

type PortalLink = { to: string; label: string; icon: LucideIcon; end?: boolean }

export function PortalLayout() {
  const { user, claims, logOut, profilePhotoUrl } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const role = (claims.role ?? 'client_owner') as UserRole
  const isClient = role === 'client_owner' || role === 'client_delegate'
  const clientLinks: PortalLink[] = [
    { to: '/app/overview', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/app/assets', label: 'My assets', icon: BriefcaseBusiness },
    { to: '/app/analytics', label: 'Analytics', icon: Activity },
    { to: '/app/requests', label: 'Requests', icon: FileText },
    ...(role === 'client_owner' ? [{ to: '/app/beneficiaries', label: 'Beneficiary', icon: UsersRound }] : []),
    { to: '/app/account-information', label: 'Account information', icon: CircleUserRound },
    { to: '/app/settings', label: 'Settings', icon: Settings },
  ]
  const staffLinks: (PortalLink & { roles: UserRole[] })[] = [
    { to: '/admin/overview', label: 'Operations overview', icon: LayoutDashboard, end: true, roles: ['registrar', 'valuation_specialist', 'compliance_officer', 'platform_administrator', 'auditor'] },
    { to: '/admin/clients', label: 'Clients', icon: Users, roles: ['compliance_officer', 'platform_administrator'] },
    { to: '/admin/assets', label: 'Asset register', icon: BriefcaseBusiness, roles: ['registrar', 'compliance_officer', 'platform_administrator'] },
    { to: '/admin/reviews', label: 'Review queue', icon: ShieldCheck, roles: ['verifier', 'platform_administrator'] },
    { to: '/admin/valuations', label: 'Valuations', icon: Activity, roles: ['valuation_specialist', 'platform_administrator'] },
    { to: '/admin/onboarding', label: 'Onboarding', icon: Users, roles: ['compliance_officer', 'platform_administrator'] },
    { to: '/admin/audit', label: 'Audit activity', icon: Activity, roles: ['compliance_officer', 'platform_administrator', 'auditor'] },
  ]
  const links: PortalLink[] = isClient
    ? clientLinks
    : [
        ...staffLinks.filter((link) => link.roles.includes(role)).map(({ roles: _roles, ...link }) => link),
        { to: '/admin/account-information', label: 'Account information', icon: CircleUserRound },
        { to: '/admin/settings', label: 'Settings', icon: Settings },
      ]

  async function handleSignOut() {
    await logOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="portal-frame">
      <aside className={`sidebar${menuOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-top"><Brand inverse /><button className="icon-button mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X size={19} /></button></div>
        <div className="account-card">
          {profilePhotoUrl ? <img className="account-avatar account-avatar-image" src={profilePhotoUrl} alt="" /> : <span className="account-avatar">{(user?.displayName ?? user?.email ?? 'P').charAt(0).toUpperCase()}</span>}
          <div className="account-copy"><strong>{user?.displayName || 'Private account'}</strong></div>
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
        </header>
        <main className="portal-content"><Outlet /></main>
        <footer className="portal-footer"><span>PRIVATE WEALTH REGISTRY</span><span>Recorded information is not a title certification or investment advice.</span></footer>
      </div>
    </div>
  )
}
