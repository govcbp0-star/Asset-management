import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Activity, ArrowRight, BriefcaseBusiness, Check, Clock3, FileCheck2, Mail, RefreshCw, ShieldCheck, UsersRound } from 'lucide-react'
import {
  type AdminAsset,
  type AdminClient,
  type AdminClientDetail,
  type AdminEnquiry,
  type AdminOverview,
  type AdminStaffUser,
  type AssetCategory,
  AssetCategorySchema,
  type ClientAsset,
} from '@pwarpi/shared'
import { useAuth } from '../../app/useAuth'
import { Notice } from '../../components/Notice'
import { Spinner } from '../../components/Spinner'
import { friendlyError } from '../../lib/auth-errors'
import {
  createAdminAsset,
  getAdminAssets,
  getAdminAudit,
  getAdminClient,
  getAdminClients,
  getAdminEnquiries,
  getAdminOverview,
  getAdminStaff,
  getAdminTenantOptions,
  getClientAssets,
  recordAdminValuation,
  reviewAdminAsset,
  setAdminStaffAssignment,
  updateAdminEnquiryStatus,
  updateAdminOnboarding,
} from '../../lib/dashboard-api'

const categoryLabels: Record<AssetCategory, string> = {
  real_estate: 'Real estate',
  cash_and_deposits: 'Cash and deposits',
  investments: 'Investments',
  business_interests: 'Business interests',
  vehicles: 'Vehicles',
  art_and_collectibles: 'Art and collectibles',
  other: 'Other assets',
}

function AdminHeader({ eyebrow = 'ACCOUNT', title, subtitle, action }: { eyebrow?: string; title: string; subtitle: string; action?: ReactNode }) {
  return <div className="page-header"><div><p className="eyebrow"><span className="eyebrow-line" />{eyebrow}</p><h1>{title}</h1><p className="page-subtitle">{subtitle}</p></div>{action}</div>
}

function AdminMetric({ label, value, detail, icon: Icon }: { label: string; value: number | string; detail: string; icon: typeof UsersRound }) {
  return <article className="admin-metric"><span className="admin-metric-icon"><Icon size={17} /></span><small>{label}</small><strong>{value}</strong><span>{detail}</span></article>
}

function dateLabel(value: number) {
  return value > 0 ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(value) : 'Date unavailable'
}

function statusLabel(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatMinorAmount(minor: string, currency: string) {
  try {
    const formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency })
    const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2
    const divisor = 10n ** BigInt(digits)
    const amount = BigInt(minor)
    const integer = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(amount / divisor)
    const fraction = digits ? new Intl.NumberFormat(undefined, { minimumIntegerDigits: digits, useGrouping: false }).format(amount % divisor) : ''
    let integerWritten = false
    return formatter.formatToParts(0).map((part) => {
      if (part.type === 'integer' && !integerWritten) { integerWritten = true; return integer }
      if (part.type === 'fraction') return fraction
      return part.value
    }).join('')
  } catch { return `${minor} ${currency} minor units` }
}

function useAdminClients() {
  const [clients, setClients] = useState<AdminClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setClients(await getAdminClients()) } catch (cause) { setError(friendlyError(cause)) } finally { setLoading(false) }
  }, [])
  useEffect(() => {
    let active = true
    getAdminClients().then((items) => { if (active) setClients(items) }).catch((cause) => { if (active) setError(friendlyError(cause)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  return { clients, loading, error, load, setClients }
}

export function AdminOverviewPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setOverview(await getAdminOverview()) } catch (cause) { setError(friendlyError(cause)) } finally { setLoading(false) }
  }, [])
  useEffect(() => {
    let active = true
    getAdminOverview().then((value) => { if (active) setOverview(value) }).catch((cause) => { if (active) setError(friendlyError(cause)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  if (loading) return <div className="dashboard-loading"><Spinner label="Loading operations dashboard" /></div>
  return <div className="admin-page">
    <AdminHeader eyebrow="OPERATIONS" title="Operations overview" subtitle="A current view of client onboarding, asset records, and review activity." action={<button className="button button-outline" onClick={() => void load()}><RefreshCw size={15} /> Refresh</button>} />
    {error && <Notice tone="error">{error}</Notice>}
    {overview && <>
      <section className="admin-metrics-grid" aria-label="Operations summary">
        <AdminMetric label="Registered clients" value={overview.clients} detail="Client accounts in the registry" icon={UsersRound} />
        <AdminMetric label="Onboarding attention" value={overview.onboardingPending} detail="Awaiting approval or follow-up" icon={Clock3} />
        <AdminMetric label="Asset records" value={overview.assets} detail="Across client portfolios" icon={BriefcaseBusiness} />
        <AdminMetric label="Evidence to review" value={overview.evidencePending} detail={`${overview.disputed} disputed records`} icon={FileCheck2} />
      </section>
      <div className="dashboard-panel admin-overview-note"><ShieldCheck size={19} /><div><h2>Record, review, and publish</h2><p>Asset entries and valuations are recorded against a client account. Evidence decisions are audited and appear in the client portal as soon as saved.</p></div></div>
      <div className="admin-quick-links"><Link to="/admin/clients"><UsersRound size={18} /><span><strong>Open client directory</strong><small>Review registered accounts and onboarding state</small></span><ArrowRight size={16} /></Link><Link to="/admin/assets"><BriefcaseBusiness size={18} /><span><strong>Record an asset</strong><small>Add an asset to a client register</small></span><ArrowRight size={16} /></Link></div>
    </>}
  </div>
}

export function AdminClientsPage() {
  const { clients, loading, error, load } = useAdminClients()
  const [filter, setFilter] = useState('')
  const filtered = useMemo(() => clients.filter((client) => `${client.displayName} ${client.email ?? ''}`.toLowerCase().includes(filter.toLowerCase())), [clients, filter])
  return <div className="admin-page">
    <AdminHeader title="Clients and organizations" subtitle="Review registered client accounts, onboarding state, and portfolio records." action={<button className="button button-outline" onClick={() => void load()}><RefreshCw size={15} /> Refresh</button>} />
    {error && <Notice tone="error">{error}</Notice>}
    <div className="admin-toolbar"><label className="admin-search"><span className="sr-only">Search clients</span><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search by name or email" /></label><span>{clients.length} registered {clients.length === 1 ? 'client' : 'clients'}</span></div>
    {loading ? <div className="dashboard-loading"><Spinner label="Loading client directory" /></div> : filtered.length ? <div className="admin-client-list">{filtered.map((client) => <Link className="admin-client-row" key={client.tenantId} to={`/admin/clients/${client.tenantId}`}>
      <span className="admin-client-avatar">{client.displayName.charAt(0).toUpperCase()}</span><span className="admin-client-main"><strong>{client.displayName}</strong><small>{client.email ?? statusLabel(client.tenantType)} · {client.assetCount} asset records</small></span>
      <span className={`admin-status admin-status-${client.onboardingStatus}`}>{statusLabel(client.onboardingStatus)}</span><time>{dateLabel(client.createdAt)}</time><ArrowRight size={16} />
    </Link>)}</div> : <section className="dashboard-panel admin-empty"><UsersRound size={22} /><h2>{filter ? 'No clients match this search' : 'No registered clients yet'}</h2><p>{filter ? 'Try a different name or email.' : 'New client accounts will appear here after registration.'}</p></section>}
  </div>
}

export function AdminClientDetailPage() {
  const { id = '' } = useParams()
  const [detail, setDetail] = useState<AdminClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [note, setNote] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setDetail(await getAdminClient(id)) } catch (cause) { setError(friendlyError(cause)) } finally { setLoading(false) }
  }, [id])
  useEffect(() => {
    let active = true
    getAdminClient(id).then((value) => { if (active) setDetail(value) }).catch((cause) => { if (active) setError(friendlyError(cause)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])
  async function updateOnboarding(status: 'active' | 'action_required') {
    setBusy(true); setError(''); setNotice('')
    try { await updateAdminOnboarding({ tenantId: id, status, note }); setNotice(status === 'active' ? 'Client onboarding is approved.' : 'Follow-up has been requested.'); await load() }
    catch (cause) { setError(friendlyError(cause)) } finally { setBusy(false) }
  }
  if (loading) return <div className="dashboard-loading"><Spinner label="Loading client profile" /></div>
  if (!detail) return <div className="admin-page"><AdminHeader title="Client profile" subtitle="Client record details." /><Notice tone="error">{error || 'Client not found.'}</Notice><Link className="button button-outline" to="/admin/clients">Back to clients</Link></div>
  const { client } = detail
  return <div className="admin-page">
    <AdminHeader eyebrow="CLIENT ACCOUNT" title={client.displayName} subtitle={`${statusLabel(client.tenantType)} account · registered ${dateLabel(client.createdAt)}`} action={<Link className="button button-outline" to="/admin/clients">Back to clients</Link>} />
    {error && <Notice tone="error">{error}</Notice>}{notice && <Notice tone="success">{notice}</Notice>}
    <section className="admin-detail-grid">
      <article className="dashboard-panel"><p className="panel-kicker">ACCOUNT INFORMATION</p><dl className="admin-detail-list"><div><dt>Email address</dt><dd>{client.email ?? 'Not available'}</dd></div><div><dt>Account status</dt><dd>{statusLabel(client.status)}</dd></div><div><dt>Onboarding</dt><dd>{statusLabel(client.onboardingStatus)}</dd></div><div><dt>Asset records</dt><dd>{client.assetCount}</dd></div><div><dt>Account reference</dt><dd>{client.tenantId}</dd></div></dl></article>
      <article className="dashboard-panel"><p className="panel-kicker">ONBOARDING DECISION</p><h2 className="admin-section-heading">{client.onboardingStatus === 'active' ? 'Client account is active' : 'Review account setup'}</h2><label className="admin-field"><span>Note for the client account record</span><textarea maxLength={1000} rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add context for the audit record or follow-up" /></label><div className="admin-actions"><button className="button button-dark" disabled={busy || client.onboardingStatus === 'active'} onClick={() => void updateOnboarding('active')}><Check size={15} /> Approve onboarding</button><button className="button button-outline" disabled={busy || !note.trim()} onClick={() => void updateOnboarding('action_required')}>Request follow-up</button></div></article>
    </section>
    <div className="admin-section-title"><div><p className="panel-kicker">PORTFOLIO</p><h2>Asset register</h2></div><Link className="button button-dark" to={`/admin/assets?tenant=${encodeURIComponent(client.tenantId)}`}>Record an asset <ArrowRight size={15} /></Link></div>
    <AssetTable assets={detail.assets} />
    <section className="dashboard-panel admin-entities"><p className="panel-kicker">LEGAL OWNERS</p><div className="admin-entity-list">{detail.entities.map((entity) => <div key={entity.id}><strong>{entity.name}</strong><small>{entity.id}</small></div>)}</div></section>
  </div>
}

function AssetTable({ assets }: { assets: AdminAsset[] | ClientAsset[] }) {
  if (!assets.length) return <section className="dashboard-panel admin-empty"><BriefcaseBusiness size={21} /><h2>No asset records yet</h2><p>Records entered by authorized staff will appear here.</p></section>
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Asset</th><th>Category</th><th>Evidence</th><th>Latest valuation</th><th>Updated</th></tr></thead><tbody>{assets.map((asset) => <tr key={asset.id}><td><strong>{asset.name}</strong><small>{asset.ownerEntityName}{asset.location ? ` · ${asset.location}` : ''}</small></td><td>{categoryLabels[asset.category]}</td><td><span className={`admin-status admin-status-${asset.ownershipEvidenceStatus}`}>{statusLabel(asset.ownershipEvidenceStatus)}</span>{asset.evidenceRationale && <small className="admin-rationale">{asset.evidenceRationale}</small>}</td><td>{asset.latestValuation ? `${formatMinorAmount(asset.latestValuation.amountMinor, asset.latestValuation.currency)} · ${asset.latestValuation.asOfDate}` : 'Not recorded'}</td><td>{dateLabel(asset.updatedAt)}</td></tr>)}</tbody></table></div>
}

export function AdminAssetsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [clients, setClients] = useState<AdminClient[]>([])
  const [selected, setSelected] = useState(searchParams.get('tenant') ?? '')
  const [detail, setDetail] = useState<AdminClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState<AssetCategory>('real_estate')
  const [entityId, setEntityId] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  useEffect(() => { let active = true; void getAdminTenantOptions().then((items) => { if (active) { setClients(items); setSelected((current) => current || items[0]?.tenantId || '') } }).catch((cause) => { if (active) setError(friendlyError(cause)) }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
  const loadDetail = useCallback(async () => {
    if (!selected) { setDetail(null); return }
    setError('')
    try { setDetail(await getAdminClient(selected)) } catch (cause) { setError(friendlyError(cause)) }
  }, [selected])
  useEffect(() => {
    if (!selected) return
    let active = true
    getAdminClient(selected).then((value) => { if (active) setDetail(value) }).catch((cause) => { if (active) setError(friendlyError(cause)) })
    return () => { active = false }
  }, [selected])
  useEffect(() => { if (selected) setSearchParams({ tenant: selected }, { replace: true }) }, [selected, setSearchParams])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('')
    try { await createAdminAsset({ tenantId: selected, legalOwnerEntityId: entityId, name, category, description, location }); setName(''); setDescription(''); setLocation(''); setNotice('Asset record created. It is visible in the client portal and waiting for evidence review.'); await loadDetail() }
    catch (cause) { setError(friendlyError(cause)) } finally { setSaving(false) }
  }
  return <div className="admin-page">
    <AdminHeader title="Asset register" subtitle="Record assets against a client and legal owner. New entries appear in the client portal as pending evidence review." />
    {error && <Notice tone="error">{error}</Notice>}{notice && <Notice tone="success">{notice}</Notice>}
    {loading ? <div className="dashboard-loading"><Spinner label="Loading client accounts" /></div> : <>
      <label className="admin-field admin-client-select"><span>Client account</span><select value={selected} onChange={(event) => setSelected(event.target.value)}><option value="">Select a client</option>{clients.map((client) => <option key={client.tenantId} value={client.tenantId}>{client.displayName} · {client.tenantId.slice(-8)}</option>)}</select></label>
      {selected && <div className="admin-asset-workspace">
        <section className="dashboard-panel"><div className="admin-section-heading-row"><div><p className="panel-kicker">NEW PORTFOLIO RECORD</p><h2 className="admin-section-heading">Record an asset</h2></div></div><form className="admin-form" onSubmit={(event) => void submit(event)}>
          <label className="admin-field"><span>Asset name</span><input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="For example, residential property" /></label>
          <label className="admin-field"><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value as AssetCategory)}>{AssetCategorySchema.options.map((option) => <option key={option} value={option}>{categoryLabels[option]}</option>)}</select></label>
          <label className="admin-field"><span>Legal owner</span><select required value={entityId} onChange={(event) => setEntityId(event.target.value)}><option value="">Select an owner</option>{detail?.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select></label>
          <label className="admin-field"><span>Location</span><input maxLength={160} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City, country" /></label>
          <label className="admin-field admin-field-wide"><span>Description</span><textarea rows={3} maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Short record description" /></label>
          <button className="button button-dark" disabled={saving || !entityId}>{saving ? 'Saving record…' : 'Record asset'} <ArrowRight size={15} /></button>
        </form></section>
        <section><div className="admin-section-title"><div><p className="panel-kicker">CLIENT PORTFOLIO</p><h2>{detail?.client.displayName ?? 'Asset records'}</h2></div><button className="button button-outline" onClick={() => void loadDetail()}><RefreshCw size={15} /> Refresh</button></div><AssetTable assets={detail?.assets ?? []} /></section>
      </div>}
    </>}
  </div>
}

function TenantPicker({ clients, value, onChange }: { clients: AdminClient[]; value: string; onChange: (value: string) => void }) {
  return <label className="admin-field admin-client-select"><span>Client account</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">Select a client</option>{clients.map((client) => <option key={client.tenantId} value={client.tenantId}>{client.displayName} · {client.tenantId.slice(-8)}</option>)}</select></label>
}

export function AdminReviewsPage() {
  const { claims, user } = useAuth()
  const isPlatformAdministrator = claims.role === 'platform_administrator'
  const [clients, setClients] = useState<AdminClient[]>([])
  const [selected, setSelected] = useState('')
  const [assets, setAssets] = useState<AdminAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [rationales, setRationales] = useState<Record<string, string>>({})
  useEffect(() => { let active = true; void getAdminTenantOptions().then((items) => { if (active) { setClients(items); if (items[0]) setSelected(items[0].tenantId) } }).catch((cause) => { if (active) setError(friendlyError(cause)) }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
  const loadAssets = useCallback(async () => { if (!selected) { setAssets([]); return }; try { setAssets(await getAdminAssets(selected)); setError('') } catch (cause) { setError(friendlyError(cause)) } }, [selected])
  useEffect(() => {
    if (!selected) return
    let active = true
    getAdminAssets(selected).then((items) => { if (active) setAssets(items) }).catch((cause) => { if (active) setError(friendlyError(cause)) })
    return () => { active = false }
  }, [selected])
  async function decide(asset: AdminAsset, decision: 'evidence_reviewed' | 'disputed') {
    const rationale = rationales[asset.id]?.trim() ?? ''
    if (rationale.length < 5) { setError('Add a short rationale before saving this evidence decision.'); return }
    setBusyId(asset.id); setError(''); setNotice('')
    try { await reviewAdminAsset({ tenantId: selected, assetId: asset.id, decision, rationale }); setNotice(decision === 'disputed' ? 'Asset marked as disputed.' : 'Evidence review saved.'); setRationales((current) => ({ ...current, [asset.id]: '' })); await loadAssets() }
    catch (cause) { setError(friendlyError(cause)) } finally { setBusyId('') }
  }
  const pending = assets.filter((asset) => asset.ownershipEvidenceStatus === 'pending_review' || asset.ownershipEvidenceStatus === 'disputed')
  return <div className="admin-page"><AdminHeader title="Review queue" subtitle={isPlatformAdministrator ? 'Review any client asset with a rationale. Platform administrator decisions are recorded in the audit history, including when you review an asset you recorded.' : 'Record evidence decisions with a rationale. Verifiers cannot review assets they recorded.'} />{error && <Notice tone="error">{error}</Notice>}{notice && <Notice tone="success">{notice}</Notice>}{loading ? <div className="dashboard-loading"><Spinner label="Loading review queue" /></div> : <><TenantPicker clients={clients} value={selected} onChange={(value) => { setSelected(value); if (!value) setAssets([]) }} /><div className="admin-section-title"><div><p className="panel-kicker">EVIDENCE REVIEW</p><h2>{pending.length} awaiting review or follow-up</h2></div><button className="button button-outline" onClick={() => void loadAssets()}><RefreshCw size={15} /> Refresh</button></div>{pending.length ? <div className="admin-review-list">{pending.map((asset) => <article className="dashboard-panel admin-review-card" key={asset.id}><div><p className="panel-kicker">{categoryLabels[asset.category]} · {asset.ownerEntityName}</p><h2>{asset.name}</h2><p>{asset.description || 'No additional description.'}</p>{asset.ownershipEvidenceStatus === 'disputed' && <Notice tone="info">Previously disputed: {asset.evidenceRationale}</Notice>}{isPlatformAdministrator && asset.createdByUid === user?.uid && <Notice tone="info">You recorded this asset. Your platform administrator decision will be marked as an audited override.</Notice>}<small>Recorded {dateLabel(asset.createdAt)} · {asset.location || 'Location not supplied'}</small></div><label className="admin-field"><span>Review rationale</span><textarea rows={2} maxLength={1000} value={rationales[asset.id] ?? ''} onChange={(event) => setRationales((current) => ({ ...current, [asset.id]: event.target.value }))} placeholder="Explain what was reviewed or what needs attention" /></label><div className="admin-actions"><button className="button button-dark" disabled={busyId === asset.id} onClick={() => void decide(asset, 'evidence_reviewed')}><Check size={15} /> Mark reviewed</button><button className="button button-outline" disabled={busyId === asset.id} onClick={() => void decide(asset, 'disputed')}>Mark disputed</button></div></article>)}</div> : <section className="dashboard-panel admin-empty"><ShieldCheck size={21} /><h2>No evidence waiting for review</h2><p>Choose another account or check back after an asset is recorded.</p></section>}</>}</div>
}

function currencyMinorUnits(currency: string) {
  try { return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2 } catch { return 2 }
}

function amountToMinor(value: string, digits: number): string | null {
  if (!/^\d{1,15}(?:\.\d{1,6})?$/.test(value)) return null
  const [whole, fraction = ''] = value.split('.')
  if (fraction.length > digits) return null
  try { return (BigInt(whole) * (10n ** BigInt(digits)) + BigInt((fraction + '0'.repeat(digits)).slice(0, digits) || '0')).toString() } catch { return null }
}

export function AdminValuationsPage() {
  const [clients, setClients] = useState<AdminClient[]>([])
  const [selected, setSelected] = useState('')
  const [assets, setAssets] = useState<AdminAsset[]>([])
  const [assetId, setAssetId] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [asOfDate, setAsOfDate] = useState('')
  const [sourceType, setSourceType] = useState('')
  const [methodology, setMethodology] = useState('')
  useEffect(() => { let active = true; void getAdminTenantOptions().then((items) => { if (active) { setClients(items); if (items[0]) setSelected(items[0].tenantId) } }).catch((cause) => { if (active) setError(friendlyError(cause)) }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
  const loadAssets = useCallback(async () => { if (!selected) { setAssets([]); return }; try { const items = await getAdminAssets(selected); setAssets(items); setAssetId((current) => items.some((asset) => asset.id === current) ? current : items[0]?.id ?? '') } catch (cause) { setError(friendlyError(cause)) } }, [selected])
  useEffect(() => {
    if (!selected) return
    let active = true
    getAdminAssets(selected).then((items) => { if (active) { setAssets(items); setAssetId((current) => items.some((asset) => asset.id === current) ? current : items[0]?.id ?? '') } }).catch((cause) => { if (active) setError(friendlyError(cause)) })
    return () => { active = false }
  }, [selected])
  const digits = currencyMinorUnits(currency)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const amountMinor = amountToMinor(amount, digits)
    if (!amountMinor) { setError(`Enter a valid ${currency} amount with no more than ${digits} decimal places.`); return }
    setBusy(true); setError(''); setNotice('')
    try { await recordAdminValuation({ tenantId: selected, assetId, amountMinor, currency, asOfDate, sourceType, methodology }); setNotice('Valuation recorded and client portfolio summary updated.'); setAmount(''); setSourceType(''); setMethodology(''); await loadAssets() }
    catch (cause) { setError(friendlyError(cause)) } finally { setBusy(false) }
  }
  return <div className="admin-page"><AdminHeader title="Valuations" subtitle="Record dated asset values with the source and method. The client portfolio summary updates after each saved valuation." />{error && <Notice tone="error">{error}</Notice>}{notice && <Notice tone="success">{notice}</Notice>}{loading ? <div className="dashboard-loading"><Spinner label="Loading valuation workspace" /></div> : <><TenantPicker clients={clients} value={selected} onChange={setSelected} />{selected && <section className="dashboard-panel admin-form-panel"><p className="panel-kicker">NEW VALUATION</p><h2 className="admin-section-heading">Record a valuation</h2>{assets.length ? <form className="admin-form" onSubmit={(event) => void submit(event)}><label className="admin-field admin-field-wide"><span>Asset</span><select required value={assetId} onChange={(event) => setAssetId(event.target.value)}>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name} · {categoryLabels[asset.category]}</option>)}</select></label><label className="admin-field"><span>Value ({currency})</span><input inputMode="decimal" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={digits ? `0.${'0'.repeat(digits)}` : '0'} /></label><label className="admin-field"><span>Currency</span><input required minLength={3} maxLength={3} pattern="[A-Za-z]{3}" value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} /></label><label className="admin-field"><span>Effective date</span><input type="date" required value={asOfDate} onChange={(event) => setAsOfDate(event.target.value)} /></label><label className="admin-field"><span>Source</span><input required minLength={2} maxLength={80} value={sourceType} onChange={(event) => setSourceType(event.target.value)} placeholder="For example, client statement" /></label><label className="admin-field admin-field-wide"><span>Valuation method</span><input required minLength={2} maxLength={120} value={methodology} onChange={(event) => setMethodology(event.target.value)} placeholder="For example, market comparable or reported estimate" /></label><div className="admin-form-footnote">Financial values are stored in minor units. The client overview totals values in the account reporting currency only.</div><button className="button button-dark" disabled={busy || !assetId}>{busy ? 'Saving valuation…' : 'Record valuation'} <ArrowRight size={15} /></button></form> : <p className="admin-muted">Record an asset before adding a valuation.</p>}</section>}{selected && <><div className="admin-section-title"><div><p className="panel-kicker">CURRENT PORTFOLIO</p><h2>Latest recorded values</h2></div></div><AssetTable assets={assets} /></>}</>}</div>
}

export function AdminOnboardingPage() {
  const { clients, loading, error, load } = useAdminClients()
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState('')
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')
  async function setStatus(client: AdminClient, status: 'active' | 'action_required') {
    const note = notes[client.tenantId]?.trim() ?? ''
    if (status === 'action_required' && note.length < 5) { setActionError('Add a follow-up note of at least five characters.'); return }
    setBusyId(client.tenantId); setActionError(''); setNotice('')
    try { await updateAdminOnboarding({ tenantId: client.tenantId, status, note }); setNotice(`${client.displayName}: onboarding ${status === 'active' ? 'approved' : 'follow-up requested'}.`); await load() }
    catch (cause) { setActionError(friendlyError(cause)) } finally { setBusyId('') }
  }
  const pending = clients.filter((client) => client.onboardingStatus !== 'active')
  return <div className="admin-page"><AdminHeader title="Onboarding queue" subtitle="Review account setup and either approve access or record the follow-up needed." action={<button className="button button-outline" onClick={() => void load()}><RefreshCw size={15} /> Refresh</button>} />{error && <Notice tone="error">{error}</Notice>}{actionError && <Notice tone="error">{actionError}</Notice>}{notice && <Notice tone="success">{notice}</Notice>}{loading ? <div className="dashboard-loading"><Spinner label="Loading onboarding queue" /></div> : pending.length ? <div className="admin-review-list">{pending.map((client) => <article className="dashboard-panel admin-onboarding-card" key={client.tenantId}><div className="admin-section-heading-row"><div><p className="panel-kicker">{statusLabel(client.tenantType)} · {client.assetCount} assets</p><h2>{client.displayName}</h2><small>{client.email ?? client.tenantId} · registered {dateLabel(client.createdAt)}</small></div><span className={`admin-status admin-status-${client.onboardingStatus}`}>{statusLabel(client.onboardingStatus)}</span></div><label className="admin-field"><span>Follow-up note (required when requesting information)</span><textarea rows={2} maxLength={1000} value={notes[client.tenantId] ?? ''} onChange={(event) => setNotes((current) => ({ ...current, [client.tenantId]: event.target.value }))} placeholder="What should the client provide or clarify?" /></label><div className="admin-actions"><button className="button button-dark" disabled={busyId === client.tenantId} onClick={() => void setStatus(client, 'active')}><Check size={15} /> Approve account</button><button className="button button-outline" disabled={busyId === client.tenantId} onClick={() => void setStatus(client, 'action_required')}>Request information</button><Link className="button button-outline" to={`/admin/clients/${client.tenantId}`}>Open profile <ArrowRight size={14} /></Link></div></article>)}</div> : <section className="dashboard-panel admin-empty"><Check size={21} /><h2>Onboarding is up to date</h2><p>All registered client accounts have been approved.</p></section>}</div>
}

export function AdminStaffPage() {
  const [staff, setStaff] = useState<AdminStaffUser[]>([])
  const [clients, setClients] = useState<AdminClient[]>([])
  const [staffUid, setStaffUid] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const load = useCallback(async () => {
    setError('')
    try {
      const [staffRecords, clientRecords] = await Promise.all([getAdminStaff(), getAdminTenantOptions()])
      setStaff(staffRecords); setClients(clientRecords)
      setStaffUid((current) => current || staffRecords[0]?.uid || '')
      setTenantId((current) => current || clientRecords[0]?.tenantId || '')
    } catch (cause) { setError(friendlyError(cause)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => {
    let active = true
    Promise.all([getAdminStaff(), getAdminTenantOptions()]).then(([staffRecords, clientRecords]) => {
      if (!active) return
      setStaff(staffRecords); setClients(clientRecords)
      setStaffUid(staffRecords[0]?.uid ?? '')
      setTenantId(clientRecords[0]?.tenantId ?? '')
    }).catch((cause) => { if (active) setError(friendlyError(cause)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const selectedStaff = staff.find((record) => record.uid === staffUid)
  const assigned = selectedStaff?.assignedTenantIds.includes(tenantId) ?? false
  async function toggleAssignment() {
    if (!staffUid || !tenantId) return
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await setAdminStaffAssignment({ staffUid, tenantId, assigned: !assigned })
      setNotice(`${result.clientName} access ${assigned ? 'revoked' : 'granted'}.`)
      await load()
    } catch (cause) { setError(friendlyError(cause)) } finally { setBusy(false) }
  }
  return <div className="admin-page"><AdminHeader title="Staff access" subtitle="Assign provisioned staff to the client accounts they need to work on. Platform administrators retain global access." action={<button className="button button-outline" onClick={() => void load()}><RefreshCw size={15} /> Refresh</button>} />{error && <Notice tone="error">{error}</Notice>}{notice && <Notice tone="success">{notice}</Notice>}{loading ? <div className="dashboard-loading"><Spinner label="Loading staff access" /></div> : staff.length && clients.length ? <section className="dashboard-panel admin-staff-access"><p className="panel-kicker">CLIENT ASSIGNMENTS</p><h2 className="admin-section-heading">Grant or revoke access</h2><p className="admin-muted">Staff roles are provisioned through the trusted staff utility. This screen only assigns client scope; it cannot create or promote staff accounts.</p><div className="admin-form"><label className="admin-field"><span>Staff member</span><select value={staffUid} onChange={(event) => setStaffUid(event.target.value)}>{staff.map((record) => <option key={record.uid} value={record.uid}>{record.displayName} · {statusLabel(record.role)}{record.email ? ` · ${record.email}` : ''}</option>)}</select></label><label className="admin-field"><span>Client account</span><select value={tenantId} onChange={(event) => setTenantId(event.target.value)}>{clients.map((client) => <option key={client.tenantId} value={client.tenantId}>{client.displayName} · {client.tenantId.slice(-8)}</option>)}</select></label><div className="admin-form-footnote admin-field-wide">{selectedStaff ? `${selectedStaff.assignedTenantIds.length} client assignment${selectedStaff.assignedTenantIds.length === 1 ? '' : 's'} for ${selectedStaff.email ?? selectedStaff.displayName}.` : 'Select a staff member.'}</div><button className={`button ${assigned ? 'button-outline' : 'button-dark'}`} disabled={busy || !tenantId || !staffUid} onClick={() => void toggleAssignment()}>{busy ? 'Saving access…' : assigned ? 'Revoke client access' : 'Grant client access'}</button></div></section> : <section className="dashboard-panel admin-empty"><UsersRound size={21} /><h2>{staff.length ? 'No client accounts yet' : 'No provisioned staff found'}</h2><p>{staff.length ? 'Register a client before assigning account access.' : 'Provision a staff account with the trusted utility before assigning client access.'}</p></section>}</div>
}

export function AdminMessagesPage() {
  const [messages, setMessages] = useState<AdminEnquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setMessages(await getAdminEnquiries()) } catch (cause) { setError(friendlyError(cause)) } finally { setLoading(false) }
  }, [])
  useEffect(() => { let active = true; getAdminEnquiries().then((items) => { if (active) setMessages(items) }).catch((cause) => { if (active) setError(friendlyError(cause)) }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
  const newCount = messages.filter((message) => message.status === 'new').length

  async function updateStatus(message: AdminEnquiry, status: 'new' | 'read' | 'resolved') {
    setBusyId(message.id); setError(''); setNotice('')
    try {
      await updateAdminEnquiryStatus({ id: message.id, status })
      setMessages((current) => current.map((item) => item.id === message.id ? { ...item, status, updatedAt: Date.now() } : item))
      setNotice(status === 'resolved' ? 'Enquiry marked resolved.' : status === 'read' ? 'Enquiry marked as read.' : 'Enquiry returned to new.')
    } catch (cause) { setError(friendlyError(cause)) } finally { setBusyId('') }
  }

  return <div className="admin-page">
    <AdminHeader title="Messages" subtitle="Read and manage enquiries sent through the public contact form. Only platform administrators can access this inbox." action={<button className="button button-outline" onClick={() => void load()}><RefreshCw size={15} /> Refresh</button>} />
    {error && <Notice tone="error">{error}</Notice>}{notice && <Notice tone="success">{notice}</Notice>}
    <div className="admin-section-title"><div><p className="panel-kicker">PUBLIC ENQUIRIES</p><h2>{newCount} new · {messages.length} in the inbox</h2></div></div>
    {loading ? <div className="dashboard-loading"><Spinner label="Loading enquiries" /></div> : messages.length ? <div className="admin-message-list">{messages.map((message) => <article className="dashboard-panel admin-message-card" key={message.id}>
      <div className="admin-message-top"><div><p className="panel-kicker">RECEIVED {dateLabel(message.receivedAt)}</p><h2>{message.name}</h2><a className="admin-message-email" href={`mailto:${encodeURIComponent(message.email)}`}><Mail size={14} /> {message.email}</a></div><span className={`admin-status admin-status-${message.status}`}>{statusLabel(message.status)}</span></div>
      <p className="admin-message-body">{message.message}</p>
      <div className="admin-actions"><a className="button button-outline" href={`mailto:${encodeURIComponent(message.email)}?subject=${encodeURIComponent('Aurelius Registry enquiry')}`}><Mail size={14} /> Reply by email</a>{message.status !== 'read' && message.status !== 'resolved' && <button className="button button-outline" disabled={busyId === message.id} onClick={() => void updateStatus(message, 'read')}>Mark read</button>}{message.status !== 'resolved' ? <button className="button button-dark" disabled={busyId === message.id} onClick={() => void updateStatus(message, 'resolved')}><Check size={14} /> Mark resolved</button> : <button className="button button-outline" disabled={busyId === message.id} onClick={() => void updateStatus(message, 'new')}>Reopen</button>}</div>
    </article>)}</div> : <section className="dashboard-panel admin-empty"><Mail size={22} /><h2>No enquiries yet</h2><p>Messages sent from the public contact form will appear here.</p></section>}
  </div>
}

export function AdminAuditPage() {
  const [clients, setClients] = useState<AdminClient[]>([])
  const [tenantId, setTenantId] = useState('')
  const [events, setEvents] = useState<Array<Record<string, unknown> & { id: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { let active = true; void getAdminTenantOptions().then((items) => { if (active) { setClients(items); if (items[0]) setTenantId(items[0].tenantId) } }).catch((cause) => { if (active) setError(friendlyError(cause)) }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
  const load = useCallback(async () => { if (!tenantId) return; setError(''); try { setEvents(await getAdminAudit(tenantId)) } catch (cause) { setError(friendlyError(cause)) } }, [tenantId])
  useEffect(() => {
    if (!tenantId) return
    let active = true
    getAdminAudit(tenantId).then((items) => { if (active) setEvents(items) }).catch((cause) => { if (active) setError(friendlyError(cause)) })
    return () => { active = false }
  }, [tenantId])
  return <div className="admin-page"><AdminHeader title="Audit activity" subtitle="Review staff changes recorded for a client account." action={<button className="button button-outline" onClick={() => void load()}><RefreshCw size={15} /> Refresh</button>} />{error && <Notice tone="error">{error}</Notice>}{loading ? <div className="dashboard-loading"><Spinner label="Loading audit activity" /></div> : <><TenantPicker clients={clients} value={tenantId} onChange={setTenantId} />{events.length ? <ol className="admin-audit-list">{events.map((event) => <li key={event.id}><span className="activity-marker" /><div><strong>{String(event.label ?? event.action ?? 'Account activity')}</strong><span>{String(event.status ?? 'Recorded')} · staff account {String(event.actorUid ?? '')}</span></div><time>{dateLabel(Number(event.occurredAt ?? 0))}</time></li>)}</ol> : <section className="dashboard-panel admin-empty"><Activity size={21} /><h2>No audit events yet</h2><p>Staff asset, review, valuation, and onboarding actions will appear here.</p></section>}</>}</div>
}

export function ClientAssetsPage() {
  const { claims } = useAuth()
  const tenantId = claims.tenantId
  const [assets, setAssets] = useState<ClientAsset[]>([])
  const [loading, setLoading] = useState(Boolean(tenantId))
  const [error, setError] = useState('')
  const load = useCallback(async () => { if (!tenantId) return; setLoading(true); setError(''); try { setAssets(await getClientAssets(tenantId)) } catch (cause) { setError(friendlyError(cause)) } finally { setLoading(false) } }, [tenantId])
  useEffect(() => {
    if (!tenantId) return
    let active = true
    getClientAssets(tenantId).then((items) => { if (active) setAssets(items) }).catch((cause) => { if (active) setError(friendlyError(cause)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [tenantId])
  return <div className="admin-page"><AdminHeader eyebrow="PRIVATE CLIENT PORTAL" title="My assets" subtitle="View assets recorded for your account, with their current evidence and valuation status." action={<button className="button button-outline" onClick={() => void load()}><RefreshCw size={15} /> Refresh</button>} />{error && <Notice tone="error">{error}</Notice>}{loading ? <div className="dashboard-loading"><Spinner label="Loading your assets" /></div> : <AssetTable assets={assets} />}</div>
}
