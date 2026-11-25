import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowRight, BriefcaseBusiness, CalendarDays, Camera, ChartNoAxesCombined, CheckCircle2, ChevronRight, CircleAlert, Clock3, FileCheck2, KeyRound, Mail, MapPin, RefreshCw, ShieldCheck, UsersRound } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { Beneficiary, ClientAsset, PortalDashboard, UserRole } from '@pwarpi/shared'
import { getBeneficiaries, getClientAssets, getPortalDashboard } from '../../lib/dashboard-api'
import { useAuth } from '../../app/useAuth'
import { Notice } from '../../components/Notice'
import { Spinner } from '../../components/Spinner'
import { friendlyError } from '../../lib/auth-errors'
import { Link } from 'react-router-dom'

const chartColors = ['#ad8951', '#263b4b', '#7491a1', '#cfc4ad', '#526570', '#9c9c91']
const assetCategoryLabels: Record<ClientAsset['category'], string> = {
  real_estate: 'Real estate',
  cash_and_deposits: 'Cash and deposits',
  investments: 'Investments',
  business_interests: 'Business interests',
  vehicles: 'Vehicles',
  art_and_collectibles: 'Art and collections',
  other: 'Other assets',
}

function moneyFromMinor(minor: string, currency: string): string {
  try {
    const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2
    const divisor = 10n ** BigInt(digits)
    const amount = BigInt(minor)
    const whole = amount / divisor
    const fraction = digits ? (amount % divisor).toString().padStart(digits, '0') : ''
    const parts = new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).formatToParts(whole)
    const integerIndex = parts.findLastIndex((part) => part.type === 'integer')
    if (digits && integerIndex >= 0) {
      const decimal = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1 }).formatToParts(1.1).find((part) => part.type === 'decimal')?.value ?? '.'
      parts.splice(integerIndex + 1, 0, { type: 'decimal', value: decimal }, { type: 'fraction', value: fraction })
    }
    return parts.map((part) => part.value).join('')
  } catch { return `${minor} ${currency} minor units` }
}

function allocationShares(dashboard: PortalDashboard) {
  const eligible = dashboard.allocations.filter((item) => item.currency === dashboard.reportingCurrency)
  const total = eligible.reduce((sum, item) => sum + BigInt(item.amountMinor), 0n)
  if (total === 0n) return []
  return eligible.map((item) => ({
    ...item,
    share: Number((BigInt(item.amountMinor) * 10000n) / total) / 100,
  }))
}

function fetchClientOverview(tenantId: string | null) {
  return Promise.allSettled([
    getPortalDashboard(tenantId ?? ''),
    getClientAssets(tenantId ?? ''),
  ] as const)
}

function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) {
  return <div className="page-header"><div><p className="eyebrow"><span className="eyebrow-line" />{eyebrow}</p><h1>{title}</h1><p className="page-subtitle">{subtitle}</p></div>{action}</div>
}

function MetricCard({ label, value, detail, icon: Icon, accent = false }: { label: string; value: string; detail: string; icon: typeof BriefcaseBusiness; accent?: boolean }) {
  return <article className={`metric-card${accent ? ' metric-card-accent' : ''}`}><div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={17} strokeWidth={1.7} /></span></div><strong>{value}</strong><small>{detail}</small></article>
}

export function DashboardPage({ staff = false }: { staff?: boolean }) {
  const { claims } = useAuth()
  const [dashboard, setDashboard] = useState<PortalDashboard | null>(null)
  const [assets, setAssets] = useState<ClientAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [assetsLoading, setAssetsLoading] = useState(true)
  const [error, setError] = useState('')
  const [assetsError, setAssetsError] = useState('')
  const tenantId = claims.tenantId
  const role = (claims.role ?? 'client_owner') as UserRole
  const allocations = useMemo(() => dashboard ? allocationShares(dashboard) : [], [dashboard])

  const load = useCallback(async () => {
    setLoading(true); setAssetsLoading(true)
    const [dashboardResult, assetsResult] = await fetchClientOverview(tenantId)
    if (dashboardResult.status === 'fulfilled') { setDashboard(dashboardResult.value); setError('') }
    else setError(friendlyError(dashboardResult.reason))
    if (assetsResult.status === 'fulfilled') { setAssets(assetsResult.value); setAssetsError('') }
    else setAssetsError(friendlyError(assetsResult.reason))
    setLoading(false)
    setAssetsLoading(false)
  }, [tenantId])

  useEffect(() => {
    let active = true
    void fetchClientOverview(tenantId).then(([dashboardResult, assetsResult]) => {
      if (!active) return
      if (dashboardResult.status === 'fulfilled') { setDashboard(dashboardResult.value); setError('') }
      else setError(friendlyError(dashboardResult.reason))
      if (assetsResult.status === 'fulfilled') { setAssets(assetsResult.value); setAssetsError('') }
      else setAssetsError(friendlyError(assetsResult.reason))
      setLoading(false)
      setAssetsLoading(false)
    })
    return () => { active = false }
  }, [tenantId])

  if (loading) return <div className="dashboard-loading"><Spinner label="Loading your account" /></div>
  if (error) return <><PageHeader eyebrow={staff ? 'OPERATIONS' : 'PRIVATE CLIENT PORTAL'} title={staff ? 'Operations overview' : 'Portfolio overview'} subtitle="A secure view of your account." /><Notice tone="error">{error}</Notice><button className="button button-outline retry-button" onClick={() => void load()}><RefreshCw size={15} /> Try again</button></>
  if (!dashboard) return null

  const value = dashboard.grossRegisteredValueMinor === null ? 'Not yet available' : moneyFromMinor(dashboard.grossRegisteredValueMinor, dashboard.reportingCurrency)
  const dateLabel = dashboard.asOf > 0 ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(dashboard.asOf) : null
  const recentAssets = [...assets].sort((left, right) => right.updatedAt - left.updatedAt).slice(0, 3)
  const valuedAssets = assets.filter((asset) => asset.latestValuation).length
  const valuationCoverage = assetsError ? 'Not available' : `${valuedAssets} of ${assets.length} assets`
  const clientStatusLabel = dashboard.tenantStatus === 'active' ? 'Account active' : dashboard.tenantStatus === 'suspended' ? 'Account paused' : 'Account under review'

  return <div className="client-dashboard">
    <section className="client-welcome-banner">
      <div className="client-welcome-copy">
        <h1>Welcome back,<span>{dashboard.tenantName}</span></h1>
        <p>Your asset register, review status, and account activity.</p>
      </div>
      <div className="client-welcome-aside" role="group" aria-label="Account status and reporting details">
        <div className="client-welcome-aside-header">
          <p className="panel-kicker">Account status</p>
          <button className="button button-outline client-refresh-button" onClick={() => void load()} disabled={loading} aria-label="Refresh dashboard"><RefreshCw size={14} /> Refresh</button>
        </div>
        <strong><span className={`client-status-dot client-status-${dashboard.tenantStatus}`} />{clientStatusLabel}</strong>
        <span>{dashboard.tenantType.replaceAll('_', ' ')} account</span>
        <span>Reporting currency: {dashboard.reportingCurrency}</span>
        {dateLabel && <small>Last updated {dateLabel}</small>}
      </div>
    </section>
    {dashboard.tenantStatus !== 'active' && <Notice tone="info">Your account is being reviewed. Asset registration and staff-managed services are not active yet.</Notice>}
    <section className="metrics-grid client-metrics-grid" aria-label="Portfolio summary">
      <MetricCard label="Registered asset value" value={value} detail={dashboard.grossRegisteredValueMinor === null ? 'Reported values appear when available' : `Reported in ${dashboard.reportingCurrency}`} icon={ChartNoAxesCombined} accent />
      <MetricCard label="Total assets" value={dashboard.counts.totalAssets.toLocaleString()} detail="In your current register" icon={BriefcaseBusiness} />
      <MetricCard label="Evidence reviewed" value={dashboard.counts.evidenceReviewed.toLocaleString()} detail="Marked reviewed by staff" icon={FileCheck2} />
      <MetricCard label="Pending review" value={dashboard.counts.pendingReview.toLocaleString()} detail={`${dashboard.counts.disputed} disputed records`} icon={CircleAlert} />
    </section>
    <section className="dashboard-panel client-allocation-panel">
      <div className="panel-heading"><h2>Portfolio allocation</h2><span className="panel-asof">{dateLabel ? `As of ${dateLabel}` : 'Awaiting records'}</span></div>
      {allocations.length ? <div className="client-allocation-content">
        <div className="allocation-chart client-allocation-chart" role="img" aria-label={`Asset allocation chart with ${allocations.length} categories`}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={allocations} dataKey="share" nameKey="label" innerRadius="68%" outerRadius="95%" paddingAngle={3} stroke="none">{allocations.map((entry, index) => <Cell key={entry.category} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip formatter={(share) => `${share}%`} /></PieChart></ResponsiveContainer><div className="allocation-center"><strong>{allocations.reduce((sum, entry) => sum + entry.share, 0).toFixed(0)}%</strong><span>reported<br />allocation</span></div></div>
        <ul className="allocation-legend">{allocations.map((entry, index) => <li key={entry.category}><span className="legend-dot" style={{ backgroundColor: chartColors[index % chartColors.length] }} /><span>{entry.label}</span><strong>{entry.share.toFixed(1)}%</strong></li>)}</ul>
        <aside className="client-allocation-context"><p className="panel-kicker">Valuation coverage</p><strong>{valuationCoverage}</strong><p>{assetsError ? 'Valuation coverage could not be loaded.' : 'Assets with a recorded valuation. Each value keeps its stated currency and date.'}</p><Link className="text-link dark-link" to="/app/assets">Review my assets</Link></aside>
      </div> : <div className="client-allocation-empty"><h3>Portfolio breakdown is not available yet</h3><p>A breakdown appears when at least one asset has a recorded valuation in {dashboard.reportingCurrency}. Values in other currencies stay separate.</p><Link className="text-link dark-link" to="/app/assets">View my assets</Link></div>}
    </section>
    <section className="dashboard-panel client-assets-panel">
      <div className="panel-heading"><h2>Recently updated assets</h2><Link className="button button-outline client-view-all" to="/app/assets">View all assets</Link></div>
      {assetsError && <Notice tone="error">{assetsError}</Notice>}
      {assetsLoading ? <div className="client-assets-loading"><Spinner label="Loading your assets" /></div> : recentAssets.length ? <div className="client-asset-list">{recentAssets.map((asset) => {
        const reviewLabel = asset.ownershipEvidenceStatus === 'evidence_reviewed' ? 'Evidence reviewed' : asset.ownershipEvidenceStatus === 'disputed' ? 'Disputed' : 'Pending review'
        const reviewClass = asset.ownershipEvidenceStatus === 'evidence_reviewed' ? 'reviewed' : asset.ownershipEvidenceStatus === 'disputed' ? 'disputed' : 'pending'
        return <Link className="client-asset-row" to="/app/assets" key={asset.id}>
          <span className="client-asset-icon"><BriefcaseBusiness size={20} /></span>
          <span className="client-asset-details"><span className={`client-asset-status client-asset-status-${reviewClass}`}>{asset.ownershipEvidenceStatus === 'evidence_reviewed' ? <CheckCircle2 size={12} /> : asset.ownershipEvidenceStatus === 'disputed' ? <CircleAlert size={12} /> : <Clock3 size={12} />}{reviewLabel}</span><strong>{asset.name}</strong><span className="client-asset-meta"><span><MapPin size={12} />{asset.location || 'Location not recorded'}</span><span><BriefcaseBusiness size={11} />{assetCategoryLabels[asset.category]}</span>{asset.latestValuation && <span><CalendarDays size={12} />Valued {formatAccountDate(asset.latestValuation.asOfDate)}</span>}</span></span>
          <span className="client-asset-value">{asset.latestValuation ? moneyFromMinor(asset.latestValuation.amountMinor, asset.latestValuation.currency) : <small>Not yet valued</small>}<ChevronRight size={17} /></span>
        </Link>
      })}</div> : <div className="client-assets-empty"><div className="empty-icon"><BriefcaseBusiness size={20} /></div><div><h3>No assets recorded yet</h3><p>Assets added to your account by authorized staff will appear here.</p></div></div>}
    </section>
    <div className="dashboard-grid dashboard-grid-bottom client-dashboard-bottom">
      <section className="dashboard-panel activity-panel"><div className="panel-heading"><h2>Recent activity</h2></div>
        {dashboard.recentActivity.length ? <ol className="activity-list">{dashboard.recentActivity.slice(0, 4).map((item) => <li key={item.id}><span className="activity-marker" /><div><strong>{item.label}</strong><span>{item.status}</span></div><time dateTime={new Date(item.occurredAt).toISOString()}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(item.occurredAt)}</time></li>)}</ol> : <div className="compact-empty"><p>No recent changes</p><span>Activity will appear here when records are added or reviewed.</span></div>}
      </section>
      <section className="dashboard-panel attention-panel client-security-panel"><span className="client-security-icon"><ShieldCheck size={24} /></span><h2>What an evidence review means</h2><p>A reviewed label records the staff decision on submitted evidence. It does not certify legal title or guarantee a valuation.</p><div className="client-security-links"><Link to="/disclosures"><ShieldCheck size={14} /> Service disclosures</Link><Link to="/contact"><Mail size={14} /> Contact support</Link></div></section>
    </div>
    {staff && <div className="staff-access-note"><span><ShieldCheck size={16} /></span><p><strong>{role.replaceAll('_', ' ')}</strong> access is limited to the account permissions assigned by a trusted administrator. Sensitive access is logged.</p></div>}
  </div>
}

export function FeaturePage({ title, description }: { title: string; description: string }) {
  return <div className="feature-empty-page"><PageHeader eyebrow="ACCOUNT" title={title} subtitle={description} /><section className="dashboard-panel feature-panel"><div className="empty-icon"><BriefcaseBusiness size={20} /></div><h2>This area is in a later phase</h2><p>Foundation release includes secure sign-in, account separation, and role-based dashboard access. Asset workflows and related records will be added in the operational MVP.</p><span className="feature-phase"><span /> PLANNED FOR PHASE 2</span></section></div>
}

function formatAccountDate(value?: string | null) {
  if (!value) return 'Not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Not available' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

function formatRoleLabel(role: string | null) {
  if (!role) return 'Not available'
  return role.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

export function AccountInformationPage() {
  const { user, claims, profilePhotoUrl } = useAuth()
  const initials = (user?.displayName ?? user?.email ?? 'A').charAt(0).toUpperCase()
  const rows = [
    ['Account name', user?.displayName || 'Not set'],
    ['Email address', user?.email || 'Not available'],
    ['Access role', formatRoleLabel(claims.role)],
    ['Email verification', user?.emailVerified ? 'Verified' : 'Not verified'],
    ['Account created', formatAccountDate(user?.metadata.creationTime)],
    ['Last sign in', formatAccountDate(user?.metadata.lastSignInTime)],
  ]

  return <div className="feature-empty-page">
    <PageHeader eyebrow="ACCOUNT" title="Account information" subtitle="Review the sign-in profile and access details for your account." />
    <section className="dashboard-panel account-information-panel">
      <div className="account-information-heading">
        {profilePhotoUrl ? <img className="account-information-photo" src={profilePhotoUrl} alt="" /> : <span className="account-information-photo account-information-initial">{initials}</span>}
        <div><p className="panel-kicker">SIGNED-IN PROFILE</p><h2>{user?.displayName || 'Account holder'}</h2></div>
      </div>
      <dl className="account-information-list">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </section>
  </div>
}

export function BeneficiaryPage() {
  const { claims } = useAuth()
  return <BeneficiaryList key={claims.tenantId ?? 'no-tenant'} tenantId={claims.tenantId} />
}

function BeneficiaryList({ tenantId }: { tenantId: string | null }) {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [loading, setLoading] = useState(Boolean(tenantId))
  const [error, setError] = useState(tenantId ? '' : 'Your account access could not be confirmed. Sign in again and try once more.')

  useEffect(() => {
    let active = true
    if (!tenantId) return () => { active = false }
    void getBeneficiaries(tenantId).then((result) => {
      if (active) setBeneficiaries(result)
    }).catch((cause: unknown) => {
      if (active) setError(friendlyError(cause))
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [tenantId])

  return <div className="feature-empty-page">
    <PageHeader eyebrow="PRIVATE CLIENT PORTAL" title="Beneficiaries & next of kin" subtitle="View the people recorded for your account." />
    {loading ? <div className="dashboard-loading"><Spinner label="Loading beneficiary details" /></div> : error ? <Notice tone="error">{error}</Notice> : beneficiaries.length ? <section className="beneficiary-list" aria-label="Beneficiaries and next of kin">
      {beneficiaries.map((beneficiary) => <BeneficiaryCard key={beneficiary.id} beneficiary={beneficiary} />)}
    </section> : <section className="dashboard-panel beneficiaries-empty"><div className="empty-icon"><UsersRound size={20} /></div><h2>No beneficiary details recorded</h2><p>There are no beneficiary or next-of-kin records available for this account yet.</p></section>}
  </div>
}

function BeneficiaryCard({ beneficiary }: { beneficiary: Beneficiary }) {
  const label = beneficiary.type === 'next_of_kin' ? 'Next of kin' : 'Beneficiary'
  return <article className="dashboard-panel beneficiary-card">
    <span className="beneficiary-type">{label}</span>
    <h2>{beneficiary.name}</h2>
    <p><span>Relationship</span><strong>{beneficiary.relationship}</strong></p>
  </article>
}

export function AccountSettingsPage() {
  const { user, profilePhotoUrl, updateAccountName, changePassword, uploadProfilePhoto, sendReset } = useAuth()
  const [accountName, setAccountName] = useState(user?.displayName ?? '')
  const [nameBusy, setNameBusy] = useState(false)
  const [nameError, setNameError] = useState('')
  const [nameNotice, setNameNotice] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [photoNotice, setPhotoNotice] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordNotice, setPasswordNotice] = useState('')
  const [resetBusy, setResetBusy] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const hasPasswordProvider = user?.providerData.some((provider) => provider.providerId === 'password') ?? false
  const hasGoogleProvider = user?.providerData.some((provider) => provider.providerId === 'google.com') ?? false

  async function saveAccountName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNameError(''); setNameNotice('')
    const normalizedName = accountName.trim()
    if (normalizedName.length < 2 || normalizedName.length > 80) {
      setNameError('Enter an account name between 2 and 80 characters.')
      return
    }
    setNameBusy(true)
    try { await updateAccountName(normalizedName); setNameNotice('Your account name has been updated.') }
    catch (cause) { setNameError(friendlyError(cause)) }
    finally { setNameBusy(false) }
  }

  async function savePhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPhotoError(''); setPhotoNotice('')
    if (!photoFile) { setPhotoError('Choose a profile photo first.'); return }
    setPhotoBusy(true)
    try { await uploadProfilePhoto(photoFile); setPhotoFile(null); setPhotoNotice('Your profile photo has been updated.') }
    catch (cause) { setPhotoError(friendlyError(cause)) }
    finally { setPhotoBusy(false) }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordError(''); setPasswordNotice('')
    if (hasPasswordProvider && !currentPassword) { setPasswordError('Enter your current password to continue.'); return }
    if (newPassword.length < 12 || newPassword.length > 128) { setPasswordError('Use a new password between 12 and 128 characters.'); return }
    if (hasPasswordProvider && newPassword === currentPassword) { setPasswordError('Choose a new password that differs from your current password.'); return }
    if (newPassword !== confirmPassword) { setPasswordError('The new passwords do not match.'); return }
    setPasswordBusy(true)
    try {
      await changePassword(hasPasswordProvider ? currentPassword : null, newPassword)
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      setPasswordNotice('Your password has been changed. Other devices may need to sign in again.')
    } catch (cause) { setPasswordError(friendlyError(cause)) }
    finally { setPasswordBusy(false) }
  }

  async function sendPasswordSetupLink() {
    if (!user?.email) { setPasswordError('This account does not have an email address for password recovery.'); return }
    setPasswordError(''); setPasswordNotice(''); setResetBusy(true)
    try { await sendReset(user.email); setPasswordNotice('Password setup instructions have been sent to your account email.') }
    catch (cause) { setPasswordError(friendlyError(cause)) }
    finally { setResetBusy(false) }
  }

  return <div className="feature-empty-page">
    <PageHeader eyebrow="ACCOUNT SETTINGS" title="Settings" subtitle="Update your account name, profile photo, and password." />
    <div className="settings-grid">
      <section className="dashboard-panel settings-card">
        <div className="settings-card-heading"><span><UsersRound size={17} /></span><div><p className="panel-kicker">PROFILE</p><h2>Account name</h2></div></div>
        <form className="settings-form" onSubmit={(event) => void saveAccountName(event)}>
          <label htmlFor="account-name">Name shown in your account</label>
          <input id="account-name" name="accountName" autoComplete="name" maxLength={80} value={accountName} onChange={(event) => setAccountName(event.target.value)} />
          {nameError && <Notice tone="error">{nameError}</Notice>}{nameNotice && <Notice tone="success">{nameNotice}</Notice>}
          <button className="button button-dark" disabled={nameBusy}>{nameBusy ? 'Saving…' : 'Save account name'}</button>
        </form>
      </section>

      <section className="dashboard-panel settings-card">
        <div className="settings-card-heading"><span><Camera size={17} /></span><div><p className="panel-kicker">PROFILE</p><h2>Profile photo</h2></div></div>
        <form className="settings-form" onSubmit={(event) => void savePhoto(event)}>
          <div className="photo-control-row">
            {profilePhotoUrl ? <img className="settings-photo-preview" src={profilePhotoUrl} alt="Current profile" /> : <span className="settings-photo-preview settings-photo-initial">{(user?.displayName ?? user?.email ?? 'A').charAt(0).toUpperCase()}</span>}
            <div><label htmlFor="profile-photo">Choose an image</label><input id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.currentTarget.files?.[0] ?? null; setPhotoError(''); setPhotoNotice(''); if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1_500_000)) { setPhotoFile(null); setPhotoError('Choose a JPG, PNG, or WebP image smaller than 1.5 MB.'); event.currentTarget.value = ''; return } setPhotoFile(file) }} /><small>JPG, PNG, or WebP. Maximum 1.5 MB.</small></div>
          </div>
          {photoError && <Notice tone="error">{photoError}</Notice>}{photoNotice && <Notice tone="success">{photoNotice}</Notice>}
          <button className="button button-dark" disabled={photoBusy || !photoFile}>{photoBusy ? 'Uploading…' : 'Save profile photo'}</button>
        </form>
      </section>

      <section className="dashboard-panel settings-card settings-password-card">
        <div className="settings-card-heading"><span><KeyRound size={17} /></span><div><p className="panel-kicker">SIGN-IN SECURITY</p><h2>Change password</h2></div></div>
        {hasPasswordProvider || hasGoogleProvider ? <form className="settings-form" onSubmit={(event) => void savePassword(event)}>
          {hasPasswordProvider ? <><label htmlFor="current-password">Current password</label><input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></> : <Notice tone="info">Confirm your identity in the Google sign-in window before the new password is saved.</Notice>}
          <label htmlFor="new-password">New password</label><input id="new-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
          <small>Use at least 12 characters. A unique passphrase is a good choice.</small>
          <label htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
          {passwordError && <Notice tone="error">{passwordError}</Notice>}{passwordNotice && <Notice tone="success">{passwordNotice}</Notice>}
          <button className="button button-dark" disabled={passwordBusy}>{passwordBusy ? 'Verifying and saving…' : 'Change password'}</button>
        </form> : <div className="settings-form"><Notice tone="info">Your sign-in provider does not support an in-dashboard password change.</Notice><button className="button button-outline" type="button" onClick={() => void sendPasswordSetupLink()} disabled={resetBusy}>{resetBusy ? 'Sending…' : 'Send password setup link'}</button>{passwordError && <Notice tone="error">{passwordError}</Notice>}{passwordNotice && <Notice tone="success">{passwordNotice}</Notice>}</div>}
        <p className="settings-security-note"><ShieldCheck size={14} /> The app asks you to confirm your current sign-in before saving a password change.</p>
      </section>
    </div>
  </div>
}

export function AccessDeniedPage() {
  return <div className="feature-empty-page"><PageHeader eyebrow="ACCESS CONTROL" title="This area is not assigned to your role." subtitle="Account access is checked on the server and limited to your assigned permissions." /><a className="button button-outline retry-button" href="/">Return to the public site <ArrowRight size={15} /></a></div>
}
