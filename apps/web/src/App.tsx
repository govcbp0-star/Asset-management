import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { RoleHomePath, StaffRoles, type UserRole } from '@pwarpi/shared'
import { AuthProvider } from './app/AuthProvider'
import { useAuth } from './app/useAuth'
import { PortalLayout } from './components/PortalLayout'
import { Spinner } from './components/Spinner'
import { ContactPage, HomePage, InformationPage } from './pages/PublicPages'

const DashboardPage = lazy(() => import('./features/dashboard/DashboardPages').then((module) => ({ default: module.DashboardPage })))
const FeaturePage = lazy(() => import('./features/dashboard/DashboardPages').then((module) => ({ default: module.FeaturePage })))
const AccessDeniedPage = lazy(() => import('./features/dashboard/DashboardPages').then((module) => ({ default: module.AccessDeniedPage })))
const AccountInformationPage = lazy(() => import('./features/dashboard/DashboardPages').then((module) => ({ default: module.AccountInformationPage })))
const BeneficiaryPage = lazy(() => import('./features/dashboard/DashboardPages').then((module) => ({ default: module.BeneficiaryPage })))
const AccountSettingsPage = lazy(() => import('./features/dashboard/DashboardPages').then((module) => ({ default: module.AccountSettingsPage })))
const LoginPage = lazy(() => import('./features/auth/AuthPages').then((module) => ({ default: module.LoginPage })))
const RegisterPage = lazy(() => import('./features/auth/AuthPages').then((module) => ({ default: module.RegisterPage })))
const ResetPasswordPage = lazy(() => import('./features/auth/AuthPages').then((module) => ({ default: module.ResetPasswordPage })))
const VerifyEmailPage = lazy(() => import('./features/auth/AuthPages').then((module) => ({ default: module.VerifyEmailPage })))

function roleHome(role: string | null) {
  return (role && role in RoleHomePath ? RoleHomePath[role as UserRole] : '/access-denied')
}

function AuthenticatedGate() {
  const { loading, user, claims } = useAuth()
  const { pathname } = useLocation()
  if (loading) return <Spinner label="Checking your sign-in" />
  if (!user) return <Navigate to="/login" replace state={{ from: pathname }} />
  if (!claims.tenantId) return <Navigate to="/register" replace />
  if (!user.emailVerified && pathname !== '/auth/verify-email') return <Navigate to="/auth/verify-email" replace />
  if (user.emailVerified && pathname === '/auth/verify-email') return <Navigate to={roleHome(claims.role)} replace />
  return <Outlet />
}

function ClientRoleGate() {
  const { claims } = useAuth()
  if (claims.role !== 'client_owner' && claims.role !== 'client_delegate') return <Navigate to={roleHome(claims.role)} replace />
  return <Outlet />
}

function ClientOwnerGate() {
  const { claims } = useAuth()
  if (claims.role !== 'client_owner') return <AccessDeniedPage />
  return <Outlet />
}

function StaffRoleGate({ roles }: { roles?: UserRole[] }) {
  const { claims } = useAuth()
  if (!claims.role || !StaffRoles.includes(claims.role as typeof StaffRoles[number])) return <Navigate to={roleHome(claims.role)} replace />
  if (roles && !roles.includes(claims.role as UserRole)) return <AccessDeniedPage />
  return <Outlet />
}

function AppRoutes() {
  return <Suspense fallback={<Spinner label="Opening your account" />}><Routes>
    <Route path="/" element={<HomePage />} />
    {['/services', '/who-we-serve', '/how-it-works', '/about', '/privacy', '/terms', '/disclosures'].map((path) => <Route key={path} path={path} element={<InformationPage pathname={path} />} />)}
    <Route path="/contact" element={<ContactPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/auth/onboarding" element={<Navigate to="/register" replace />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route element={<AuthenticatedGate />}>
      <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
      <Route element={<ClientRoleGate />}>
        <Route element={<PortalLayout />}>
          <Route path="/app/overview" element={<DashboardPage />} />
          <Route path="/app/account-information" element={<AccountInformationPage />} />
          <Route path="/app/settings" element={<AccountSettingsPage />} />
          <Route path="/app/settings/security" element={<Navigate to="/app/settings" replace />} />
          <Route element={<ClientOwnerGate />}>
            <Route path="/app/beneficiaries" element={<BeneficiaryPage />} />
          </Route>
          <Route path="/app/assets" element={<FeaturePage title="My assets" description="Browse the assets recorded in your account." />} />
          <Route path="/app/assets/:assetId" element={<FeaturePage title="Asset details" description="Review a record, evidence scope, valuation and history." />} />
          <Route path="/app/analytics" element={<FeaturePage title="Portfolio analytics" description="Explore category, entity and jurisdiction views of your recorded portfolio." />} />
          <Route path="/app/locations" element={<FeaturePage title="Locations" description="View private location information for assets you are permitted to access." />} />
          <Route path="/app/documents" element={<FeaturePage title="Documents" description="Access controlled supporting documents and their review status." />} />
          <Route path="/app/reports" element={<FeaturePage title="Reports" description="Open dated portfolio summaries with visible valuation and verification caveats." />} />
          <Route path="/app/requests" element={<FeaturePage title="Requests and messages" description="Follow onboarding, correction, and document requests." />} />
          <Route path="/app/notifications" element={<FeaturePage title="Notifications" description="See private updates about records, requests, and review decisions." />} />
          <Route path="/app/organization" element={<FeaturePage title="Organization and family access" description="Manage legal-owner entities and delegated access to your account." />} />
        </Route>
      </Route>
      <Route element={<StaffRoleGate />}>
        <Route element={<PortalLayout />}>
          <Route path="/admin/overview" element={<DashboardPage staff />} />
          <Route path="/admin/account-information" element={<AccountInformationPage />} />
          <Route path="/admin/settings" element={<AccountSettingsPage />} />
          <Route path="/admin/clients" element={<StaffRoleGate roles={['compliance_officer', 'platform_administrator']} />}>
            <Route index element={<FeaturePage title="Clients and organizations" description="Review tenant profiles and client onboarding state." />} />
          </Route>
          <Route path="/admin/clients/:id" element={<StaffRoleGate roles={['compliance_officer', 'platform_administrator']} />}>
            <Route index element={<FeaturePage title="Client profile" description="Review the permitted profile, entity, and service history for a client." />} />
          </Route>
          <Route path="/admin/assets" element={<StaffRoleGate roles={['registrar', 'compliance_officer', 'platform_administrator']} />}>
            <Route index element={<FeaturePage title="Asset register" description="Work with asset drafts and authorized portfolio records." />} />
          </Route>
          <Route path="/admin/assets/new" element={<StaffRoleGate roles={['registrar', 'platform_administrator']} />}>
            <Route index element={<FeaturePage title="Create an asset draft" description="Prepare an asset record for a permitted legal-owner entity." />} />
          </Route>
          <Route path="/admin/assets/:id/edit" element={<StaffRoleGate roles={['registrar', 'platform_administrator']} />}>
            <Route index element={<FeaturePage title="Edit asset draft" description="Review and update an unapproved asset draft." />} />
          </Route>
          <Route path="/admin/onboarding" element={<StaffRoleGate roles={['compliance_officer', 'platform_administrator']} />}>
            <Route index element={<FeaturePage title="Onboarding queue" description="Review account setup status and required follow-up." />} />
          </Route>
          <Route path="/admin/reviews" element={<StaffRoleGate roles={['verifier', 'platform_administrator']} />}>
            <Route index element={<FeaturePage title="Review queue" description="Review assigned evidence with scope, provenance, and rationale." />} />
          </Route>
          <Route path="/reviewer/queue" element={<StaffRoleGate roles={['verifier', 'platform_administrator']} />}>
            <Route index element={<FeaturePage title="Assigned reviews" description="Review evidence within your assigned permission scope." />} />
          </Route>
          <Route path="/admin/valuations" element={<StaffRoleGate roles={['valuation_specialist', 'platform_administrator']} />}>
            <Route index element={<FeaturePage title="Valuations" description="Record valuation details, source, method, and effective date." />} />
          </Route>
          <Route path="/admin/documents" element={<StaffRoleGate roles={['registrar', 'verifier', 'compliance_officer', 'platform_administrator']} />}>
            <Route index element={<FeaturePage title="Documents" description="Manage restricted document metadata and review state." />} />
          </Route>
          <Route path="/admin/requests" element={<StaffRoleGate roles={['registrar', 'compliance_officer', 'platform_administrator']} />}>
            <Route index element={<FeaturePage title="Client requests" description="Review and respond to permitted client service requests." />} />
          </Route>
          <Route path="/admin/reports" element={<StaffRoleGate roles={['compliance_officer', 'platform_administrator', 'auditor']} />}>
            <Route index element={<FeaturePage title="Reports" description="Prepare permission-scoped, dated portfolio summaries." />} />
          </Route>
          <Route path="/admin/staff" element={<StaffRoleGate roles={['platform_administrator']} />}>
            <Route index element={<FeaturePage title="Staff and roles" description="Review staff assignments and least-privilege permissions." />} />
          </Route>
          <Route path="/admin/audit" element={<StaffRoleGate roles={['compliance_officer', 'platform_administrator', 'auditor']} />}>
            <Route index element={<FeaturePage title="Audit activity" description="Search authorized account actions and access events." />} />
          </Route>
        </Route>
      </Route>
    </Route>
    <Route path="/access-denied" element={<AccessDeniedPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense>
}

export default function App() {
  return <AuthProvider><BrowserRouter><AppRoutes /></BrowserRouter></AuthProvider>
}
