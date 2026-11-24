import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BriefcaseBusiness, CalendarDays, ChartNoAxesCombined, CircleAlert, Clock3, FileCheck2, RefreshCw, ShieldCheck } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { PortalDashboard, UserRole } from '@pwarpi/shared'
import { getPortalDashboard } from '../../lib/dashboard-api'
import { useAuth } from '../../app/useAuth'
import { Notice } from '../../components/Notice'
import { Spinner } from '../../components/Spinner'
import { friendlyError } from '../../lib/auth-errors'

const chartColors = ['#ad8951', '#263b4b', '#7491a1', '#cfc4ad', '#526570', '#9c9c91']

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

function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) {
  return <div className="page-header"><div><p className="eyebrow"><span className="eyebrow-line" />{eyebrow}</p><h1>{title}</h1><p className="page-subtitle">{subtitle}</p></div>{action}</div>
}

function MetricCard({ label, value, detail, icon: Icon, accent = false }: { label: string; value: string; detail: string; icon: typeof BriefcaseBusiness; accent?: boolean }) {
  return <article className={`metric-card${accent ? ' metric-card-accent' : ''}`}><div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={17} strokeWidth={1.7} /></span></div><strong>{value}</strong><small>{detail}</small></article>
}

export function DashboardPage({ staff = false }: { staff?: boolean }) {
  const { claims } = useAuth()
  const [dashboard, setDashboard] = useState<PortalDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const tenantId = claims.tenantId
  const role = (claims.role ?? 'client_owner') as UserRole
  const allocations = useMemo(() => dashboard ? allocationShares(dashboard) : [], [dashboard])

  useEffect(() => {
    let active = true
    getPortalDashboard(tenantId ?? '').then((result) => {
      if (active) { setDashboard(result); setError('') }
    }).catch((cause: unknown) => {
      if (active) setError(friendlyError(cause))
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [tenantId])

  async function load() {
    setLoading(true); setError('')
    try { setDashboard(await getPortalDashboard(tenantId ?? '')) }
    catch (cause) { setError(friendlyError(cause)) } finally { setLoading(false) }
  }

  if (loading) return <div className="dashboard-loading"><Spinner label="Loading your account" /></div>
  if (error) return <><PageHeader eyebrow={staff ? 'OPERATIONS' : 'PRIVATE CLIENT PORTAL'} title={staff ? 'Operations overview' : 'Portfolio overview'} subtitle="A secure view of your account." /><Notice tone="error">{error}</Notice><button className="button button-outline retry-button" onClick={() => void load()}><RefreshCw size={15} /> Try again</button></>
  if (!dashboard) return null

  const greeting = staff ? 'Operations at a glance.' : `Welcome, ${dashboard.tenantName}.`
  const value = dashboard.grossRegisteredValueMinor === null ? 'Not yet available' : moneyFromMinor(dashboard.grossRegisteredValueMinor, dashboard.reportingCurrency)
  const dateLabel = dashboard.asOf > 0 ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(dashboard.asOf) : null

  return <>
    <PageHeader eyebrow={staff ? 'OPERATIONS' : 'PRIVATE CLIENT PORTAL'} title={staff ? 'Operations overview' : greeting} subtitle={staff ? `Account for ${dashboard.tenantName}. Review access and current record activity.` : 'Your records, evidence status, and valuation details in one private view.'} action={<button className="button button-outline" onClick={() => void load()}><RefreshCw size={15} /> Refresh</button>} />
    {dashboard.tenantStatus !== 'active' && <Notice tone="info">Your account is being reviewed. Asset registration and staff-managed services are not active yet.</Notice>}
    <section className="metrics-grid" aria-label="Portfolio summary">
      <MetricCard label="Registered gross asset value" value={value} detail={dashboard.grossRegisteredValueMinor === null ? 'Available after records are reviewed' : `As of ${dateLabel ?? 'the latest update'}`} icon={ChartNoAxesCombined} accent />
      <MetricCard label="Assets recorded" value={dashboard.counts.totalAssets.toLocaleString()} detail="Current account register" icon={BriefcaseBusiness} />
      <MetricCard label="Evidence reviewed" value={dashboard.counts.evidenceReviewed.toLocaleString()} detail="Ownership evidence status" icon={FileCheck2} />
      <MetricCard label="Needs attention" value={(dashboard.counts.pendingReview + dashboard.counts.disputed).toLocaleString()} detail={`${dashboard.counts.pendingReview} pending · ${dashboard.counts.disputed} disputed`} icon={CircleAlert} />
    </section>
    <div className="dashboard-grid">
      <section className="dashboard-panel allocation-panel"><div className="panel-heading"><div><p className="panel-kicker">PORTFOLIO COMPOSITION</p><h2>Asset allocation</h2></div><span className="panel-asof">{dateLabel ? `As of ${dateLabel}` : 'Awaiting records'}</span></div>
        {allocations.length ? <div className="allocation-content"><div className="allocation-chart" role="img" aria-label={`Asset allocation chart with ${allocations.length} categories`}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={allocations} dataKey="share" nameKey="label" innerRadius={62} outerRadius={88} paddingAngle={3} stroke="none">{allocations.map((entry, index) => <Cell key={entry.category} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip formatter={(share) => `${share}%`} /></PieChart></ResponsiveContainer></div><ul className="allocation-legend">{allocations.map((entry, index) => <li key={entry.category}><span className="legend-dot" style={{ backgroundColor: chartColors[index % chartColors.length] }} /><span>{entry.label}</span><strong>{entry.share.toFixed(1)}%</strong></li>)}</ul></div> : <div className="panel-empty"><div className="empty-icon"><ChartNoAxesCombined size={20} /></div><h3>No allocation data yet</h3><p>Asset categories will appear here after authorized staff records assets in your account.</p></div>}
      </section>
      <section className="dashboard-panel status-panel"><div className="panel-heading"><div><p className="panel-kicker">RECORD QUALITY</p><h2>Status overview</h2></div><ShieldCheck size={18} className="panel-heading-icon" /></div>
        <ul className="status-list"><li><span className="status-mark status-reviewed"><FileCheck2 size={15} /></span><span>Evidence reviewed</span><strong>{dashboard.counts.evidenceReviewed}</strong></li><li><span className="status-mark status-pending"><Clock3 size={15} /></span><span>Pending review</span><strong>{dashboard.counts.pendingReview}</strong></li><li><span className="status-mark status-disputed"><CircleAlert size={15} /></span><span>Disputed records</span><strong>{dashboard.counts.disputed}</strong></li><li><span className="status-mark status-stale"><CalendarDays size={15} /></span><span>Stale valuations</span><strong>{dashboard.counts.staleValuations}</strong></li></ul>
        <div className="status-note"><ArrowDownRight size={15} /><span>Ownership evidence and valuation status are recorded separately.</span></div>
      </section>
    </div>
    <div className="dashboard-grid dashboard-grid-bottom">
      <section className="dashboard-panel activity-panel"><div className="panel-heading"><div><p className="panel-kicker">ACCOUNT HISTORY</p><h2>Recent activity</h2></div><Activity size={18} className="panel-heading-icon" /></div>
        {dashboard.recentActivity.length ? <ol className="activity-list">{dashboard.recentActivity.map((item) => <li key={item.id}><span className="activity-marker" /><div><strong>{item.label}</strong><span>{item.status}</span></div><time dateTime={new Date(item.occurredAt).toISOString()}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(item.occurredAt)}</time></li>)}</ol> : <div className="compact-empty"><p>No recent changes</p><span>Activity will appear here when records are added or reviewed.</span></div>}
      </section>
      <section className="dashboard-panel attention-panel"><p className="panel-kicker">A NOTE ON THIS SUMMARY</p><h2>Context matters.</h2><p>Registered gross value is a record of reported asset values. It is not net worth and may not account for ownership percentages, liabilities, layered entities, or currency conversion.</p><div className="attention-link"><span><ArrowUpRight size={14} /></span><span>Review your service disclosures</span></div></section>
    </div>
    {staff && <div className="staff-access-note"><span><ShieldCheck size={16} /></span><p><strong>{role.replaceAll('_', ' ')}</strong> access is limited to the account permissions assigned by a trusted administrator. Sensitive access is logged.</p></div>}
  </>
}

export function FeaturePage({ title, description }: { title: string; description: string }) {
  return <div className="feature-empty-page"><PageHeader eyebrow="ACCOUNT" title={title} subtitle={description} /><section className="dashboard-panel feature-panel"><div className="empty-icon"><BriefcaseBusiness size={20} /></div><h2>This area is in a later phase</h2><p>Foundation release includes secure sign-in, account separation, and role-based dashboard access. Asset workflows and related records will be added in the operational MVP.</p><span className="feature-phase"><span /> PLANNED FOR PHASE 2</span></section></div>
}

export function AccessDeniedPage() {
  return <div className="feature-empty-page"><PageHeader eyebrow="ACCESS CONTROL" title="This area is not assigned to your role." subtitle="Account access is checked on the server and limited to your assigned permissions." /><a className="button button-outline retry-button" href="/">Return to the public site <ArrowRight size={15} /></a></div>
}
