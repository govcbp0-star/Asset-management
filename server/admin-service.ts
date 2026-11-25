import {
  AdminEnquiriesSchema,
  AdminEnquirySchema,
  AdminAssetSchema,
  AdminClientDetailSchema,
  AdminClientSchema,
  AdminOverviewSchema,
  AssetCategorySchema,
  CreateAdminAssetInputSchema,
  RecordAdminValuationInputSchema,
  ReviewAdminAssetInputSchema,
  StaffRoleSchema,
  UpdateAdminOnboardingInputSchema,
  UpdateAdminEnquiryStatusInputSchema,
  type AdminAsset,
  type AdminClient,
  type AssetCategory,
} from '@pwarpi/shared'
import { ApiError } from './errors.js'
import { getAdminAuth, getAdminDatabase } from './firebase-admin.js'
import type { DecodedIdToken } from 'firebase-admin/auth'
import { requireTenantMember } from './tenant-access.js'
import { z } from 'zod'

const staffActionSchema = z.object({
  action: z.enum(['overview', 'clients', 'client', 'tenantOptions', 'assets', 'createAsset', 'reviewAsset', 'recordValuation', 'onboarding', 'audit', 'staffDirectory', 'staffAssignment', 'contactMessages', 'contactMessageStatus']),
}).passthrough()

const tenantIdSchema = z.string().regex(/^[A-Za-z0-9_-]{8,80}$/)
const staffAssignmentInputSchema = z.object({
  staffUid: z.string().regex(/^[A-Za-z0-9:_-]{1,128}$/),
  tenantId: tenantIdSchema,
  assigned: z.boolean(),
}).strict()
const categoryLabels: Record<AssetCategory, string> = {
  real_estate: 'Real estate',
  cash_and_deposits: 'Cash and deposits',
  investments: 'Investments',
  business_interests: 'Business interests',
  vehicles: 'Vehicles',
  art_and_collectibles: 'Art and collectibles',
  other: 'Other assets',
}

type DirectoryRecord = {
  ownerUid?: unknown
  displayName?: unknown
  kind?: unknown
  status?: unknown
  onboardingStatus?: unknown
  createdAt?: unknown
}

function requireRole(identity: DecodedIdToken, allowed: string[]) {
  const role = StaffRoleSchema.safeParse(identity.role)
  if (!role.success || !allowed.includes(role.data) || identity.email_verified !== true) {
    throw new ApiError('permission-denied', 'Your staff account is not permitted to perform this action.')
  }
  return role.data
}

async function requireTenantAssignment(identity: DecodedIdToken, tenantId: string) {
  const role = StaffRoleSchema.safeParse(identity.role)
  if (!role.success) throw new ApiError('permission-denied', 'Your staff account is not permitted to access client records.')
  if (role.data === 'platform_administrator' || role.data === 'compliance_officer') return
  const snapshot = await getAdminDatabase().ref(`staffTenantAssignments/${identity.uid}/${tenantId}`).get()
  if (objectValue(snapshot.val()).status !== 'active') throw new ApiError('permission-denied', 'This client account is not assigned to your staff role.')
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function timestamp(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback
}

function normalizedText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.slice(0, 1000) : fallback
}

async function ensureDirectory() {
  const database = getAdminDatabase()
  const [directorySnapshot, migrationSnapshot] = await Promise.all([
    database.ref('tenantDirectory').get(),
    database.ref('systemMeta/tenantDirectoryBackfillComplete').get(),
  ])
  const current = objectValue(directorySnapshot.val()) as Record<string, DirectoryRecord>
  if (migrationSnapshot.val() === true) return current

  // Backfill accounts created before the staff directory was introduced.
  const indexSnapshot = await database.ref('userTenantIndex').get()
  const indexes = objectValue(indexSnapshot.val())
  const owners: Array<{ uid: string; tenantId: string }> = []
  for (const [uid, membershipsValue] of Object.entries(indexes)) {
    for (const [tenantId, membershipValue] of Object.entries(objectValue(membershipsValue))) {
      if (/^[A-Za-z0-9_-]{8,80}$/.test(tenantId) && objectValue(membershipValue).role === 'client_owner') {
        owners.push({ uid, tenantId })
      }
    }
  }

  const missing = owners.filter(({ tenantId }) => !current[tenantId])
  if (missing.length) {
    const profileSnapshots = await Promise.all(missing.map(({ tenantId }) => database.ref(`tenants/${tenantId}/profile`).get()))
    const updates: Record<string, unknown> = {}
    missing.forEach(({ uid, tenantId }, index) => {
      const profile = objectValue(profileSnapshots[index].val())
      if (typeof profile.displayName !== 'string') return
      updates[`tenantDirectory/${tenantId}`] = {
        ownerUid: uid,
        displayName: profile.displayName,
        kind: profile.kind ?? 'individual',
        status: profile.status ?? 'onboarding',
        onboardingStatus: profile.onboardingStatus ?? 'pending_review',
        createdAt: profile.createdAt ?? 0,
      }
    })
    if (Object.keys(updates).length) await database.ref().update(updates)
  }

  await database.ref('systemMeta/tenantDirectoryBackfillComplete').set(true)
  const finalSnapshot = await database.ref('tenantDirectory').get()
  return objectValue(finalSnapshot.val()) as Record<string, DirectoryRecord>
}

function normalizeCategory(value: unknown): AssetCategory {
  const result = AssetCategorySchema.safeParse(value)
  return result.success ? result.data : 'other'
}

function mapAsset(id: string, tenantId: string, value: unknown, entityNames: Record<string, string>): AdminAsset | null {
  const raw = objectValue(value)
  const locationRaw = objectValue(raw.location)
  const locationParts = [locationRaw.city, locationRaw.countryCode].filter((part) => typeof part === 'string' && part.length)
  const latestRaw = objectValue(raw.latestValuation)
  const hasValuation = /^\d{1,18}$/.test(String(latestRaw.amountMinor ?? '')) && /^[A-Z]{3}$/.test(String(latestRaw.currency ?? ''))
  const evidence = raw.ownershipEvidenceStatus === 'evidence_reviewed' || raw.ownershipEvidenceStatus === 'disputed'
    ? raw.ownershipEvidenceStatus
    : 'pending_review'
  const parsed = AdminAssetSchema.safeParse({
    id,
    tenantId,
    legalOwnerEntityId: typeof raw.legalOwnerEntityId === 'string' ? raw.legalOwnerEntityId : '',
    ownerEntityName: entityNames[String(raw.legalOwnerEntityId)] ?? 'Account owner',
    name: normalizedText(raw.name, 'Unnamed asset').slice(0, 120),
    category: normalizeCategory(raw.category),
    description: normalizedText(raw.description),
    location: typeof raw.location === 'string' ? raw.location : locationParts.join(', '),
    recordStatus: raw.recordStatus === 'archived' ? 'archived' : 'active',
    ownershipEvidenceStatus: evidence,
    evidenceRationale: normalizedText(raw.evidenceRationale),
    createdAt: timestamp(raw.createdAt),
    updatedAt: timestamp(raw.updatedAt, timestamp(raw.createdAt)),
    createdByUid: typeof raw.createdByUid === 'string' ? raw.createdByUid : '',
    latestValuation: hasValuation ? {
      amountMinor: String(latestRaw.amountMinor),
      currency: String(latestRaw.currency),
      asOfDate: normalizedText(latestRaw.asOfDate),
      methodology: normalizedText(latestRaw.methodology),
      sourceType: normalizedText(latestRaw.sourceType),
    } : null,
  })
  return parsed.success ? parsed.data : null
}

async function listClientSummaries(includeEmail: boolean): Promise<AdminClient[]> {
  const database = getAdminDatabase()
  const directory = await ensureDirectory()
  const entries = Object.entries(directory).slice(0, 500)
  const result = await Promise.all(entries.map(async ([tenantId, directoryValue]) => {
    if (!tenantIdSchema.safeParse(tenantId).success) return null
    const directoryRecord = objectValue(directoryValue)
    const ownerUid = typeof directoryRecord.ownerUid === 'string' ? directoryRecord.ownerUid : ''
    const [profileSnapshot, overviewSnapshot, user] = await Promise.all([
      database.ref(`tenants/${tenantId}/profile`).get(),
      ownerUid ? database.ref(`tenants/${tenantId}/readModels/clientOverview/${ownerUid}`).get() : Promise.resolve(null),
      includeEmail && ownerUid ? getAdminAuth().getUser(ownerUid).catch(() => null) : Promise.resolve(null),
    ])
    const profile = objectValue(profileSnapshot.val())
    const readModel = objectValue(overviewSnapshot?.val())
    if (!Object.keys(profile).length && typeof directoryRecord.displayName !== 'string') return null
    const modelAssetCount = objectValue(readModel.counts).totalAssets
    const assetCount = typeof modelAssetCount === 'number' && Number.isInteger(modelAssetCount) && modelAssetCount >= 0
      ? modelAssetCount
      : Object.keys(objectValue((await database.ref(`tenants/${tenantId}/assets`).get()).val())).length
    const parsed = AdminClientSchema.safeParse({
      tenantId,
      displayName: normalizedText(profile.displayName ?? directoryRecord.displayName, 'Private account').slice(0, 100),
      email: includeEmail && user ? user.email ?? null : null,
      tenantType: profile.kind ?? directoryRecord.kind ?? 'individual',
      status: profile.status ?? directoryRecord.status ?? 'onboarding',
      onboardingStatus: profile.onboardingStatus ?? directoryRecord.onboardingStatus ?? 'pending_review',
      createdAt: timestamp(profile.createdAt ?? directoryRecord.createdAt),
      assetCount,
    })
    return parsed.success ? parsed.data : null
  }))
  return result.filter((value): value is AdminClient => value !== null).sort((a, b) => b.createdAt - a.createdAt)
}

async function getClientDetail(tenantId: string, includeEmail: boolean) {
  const database = getAdminDatabase()
  const directory = await ensureDirectory()
  const entry = objectValue(directory[tenantId])
  const [profileSnapshot, entitiesSnapshot, assetsSnapshot, user] = await Promise.all([
    database.ref(`tenants/${tenantId}/profile`).get(),
    database.ref(`tenants/${tenantId}/entities`).get(),
    database.ref(`tenants/${tenantId}/assets`).orderByKey().limitToLast(500).get(),
    includeEmail && typeof entry.ownerUid === 'string' ? getAdminAuth().getUser(entry.ownerUid).catch(() => null) : Promise.resolve(null),
  ])
  const profile = objectValue(profileSnapshot.val())
  if (!profileSnapshot.exists()) throw new ApiError('not-found', 'Client account not found.')
  const entities = objectValue(entitiesSnapshot.val())
  const entityNames = Object.fromEntries(Object.entries(entities).map(([id, value]) => [id, normalizedText(objectValue(value).name, 'Account owner')]))
  const assetRecords = objectValue(assetsSnapshot.val())
  const assets = Object.entries(assetRecords).map(([id, value]) => mapAsset(id, tenantId, value, entityNames)).filter((value): value is AdminAsset => value !== null)
  const client = AdminClientSchema.parse({
    tenantId,
    displayName: normalizedText(profile.displayName, 'Private account'),
    email: user?.email ?? null,
    tenantType: profile.kind ?? 'individual',
    status: profile.status ?? 'onboarding',
    onboardingStatus: profile.onboardingStatus ?? 'pending_review',
    createdAt: timestamp(profile.createdAt),
    assetCount: assets.length,
  })
  return AdminClientDetailSchema.parse({
    client,
    assets: assets.sort((a, b) => b.updatedAt - a.updatedAt),
    entities: Object.entries(entities).map(([id, value]) => ({ id, name: normalizedText(objectValue(value).name, 'Account owner') })).slice(0, 100),
  })
}

async function getTenantAssets(tenantId: string) {
  if (!tenantIdSchema.safeParse(tenantId).success) throw new ApiError('invalid-argument', 'Choose a valid client account.')
  const database = getAdminDatabase()
  const [profile, entitiesSnapshot, assetsSnapshot] = await Promise.all([
    database.ref(`tenants/${tenantId}/profile`).get(),
    database.ref(`tenants/${tenantId}/entities`).get(),
    database.ref(`tenants/${tenantId}/assets`).orderByKey().limitToLast(500).get(),
  ])
  if (!profile.exists()) throw new ApiError('not-found', 'Client account not found.')
  const entities = objectValue(entitiesSnapshot.val())
  const entityNames = Object.fromEntries(Object.entries(entities).map(([id, value]) => [id, normalizedText(objectValue(value).name, 'Account owner')]))
  return Object.entries(objectValue(assetsSnapshot.val())).map(([id, value]) => mapAsset(id, tenantId, value, entityNames)).filter((value): value is AdminAsset => value !== null).sort((a, b) => b.updatedAt - a.updatedAt)
}

function auditRecord(actorUid: string, action: string, label: string, status: string, metadata: Record<string, unknown>) {
  const id = getAdminDatabase().ref('tenants').push().key
  if (!id) throw new ApiError('internal', 'Could not create an audit record.')
  return {
    id,
    record: { actorUid, action, label, status, occurredAt: Date.now(), metadata },
  }
}

async function projectionUpdates(tenantId: string, newAssetOverrides: Record<string, Record<string, unknown>>, addedAudit?: { id: string; record: Record<string, unknown> }) {
  const database = getAdminDatabase()
  const [profileSnapshot, membersSnapshot, assetsSnapshot, auditSnapshot] = await Promise.all([
    database.ref(`tenants/${tenantId}/profile`).get(),
    database.ref(`tenants/${tenantId}/members`).get(),
    database.ref(`tenants/${tenantId}/assets`).get(),
    database.ref(`tenants/${tenantId}/audit`).orderByKey().limitToLast(9).get(),
  ])
  const profile = objectValue(profileSnapshot.val())
  const assets = { ...objectValue(assetsSnapshot.val()), ...newAssetOverrides }
  const members = objectValue(membersSnapshot.val())
  const auditRows = objectValue(auditSnapshot.val())
  if (addedAudit) auditRows[addedAudit.id] = addedAudit.record

  const counts = { totalAssets: 0, evidenceReviewed: 0, pendingReview: 0, disputed: 0, staleValuations: 0 }
  const amountByCategory = new Map<string, bigint>()
  let gross = 0n
  let hasReportableValue = false
  const now = Date.now()
  for (const rawValue of Object.values(assets)) {
    const asset = objectValue(rawValue)
    if (asset.recordStatus === 'archived') continue
    counts.totalAssets += 1
    if (asset.ownershipEvidenceStatus === 'evidence_reviewed') counts.evidenceReviewed += 1
    else if (asset.ownershipEvidenceStatus === 'disputed') counts.disputed += 1
    else counts.pendingReview += 1
    const valuation = objectValue(asset.latestValuation)
    const valuationDate = typeof valuation.asOfDate === 'string' ? Date.parse(`${valuation.asOfDate}T00:00:00Z`) : 0
    if (!valuationDate || now - valuationDate > 365 * 24 * 60 * 60 * 1000) counts.staleValuations += 1
    if (typeof valuation.amountMinor === 'string' && /^\d{1,18}$/.test(valuation.amountMinor) && valuation.currency === (profile.reportingCurrency ?? 'USD')) {
      const amount = BigInt(valuation.amountMinor)
      gross += amount
      hasReportableValue = true
      const category = normalizeCategory(asset.category)
      amountByCategory.set(category, (amountByCategory.get(category) ?? 0n) + amount)
    }
  }

  const latestActivity = Object.entries(auditRows).sort(([a], [b]) => b.localeCompare(a)).slice(0, 10).map(([id, value]) => {
    const event = objectValue(value)
    return { id, label: normalizedText(event.label, normalizedText(event.action, 'Account updated')), occurredAt: timestamp(event.occurredAt), status: normalizedText(event.status, 'Recorded') }
  })
  const tenantName = normalizedText(profile.displayName, 'Private account')
  const tenantType = profile.kind ?? 'individual'
  const tenantStatus = profile.status ?? 'onboarding'
  const onboardingStatus = profile.onboardingStatus ?? 'pending_review'
  const reportingCurrency = typeof profile.reportingCurrency === 'string' ? profile.reportingCurrency : 'USD'
  const allocations = Array.from(amountByCategory.entries()).map(([category, amountMinor]) => ({ category, label: categoryLabels[category as AssetCategory], amountMinor: amountMinor.toString(), currency: reportingCurrency })).slice(0, 12)
  const overview = {
    tenantName, tenantType, tenantStatus, onboardingStatus, reportingCurrency, asOf: now,
    grossRegisteredValueMinor: hasReportableValue ? gross.toString() : null,
    counts, allocations, recentActivity: latestActivity,
  }
  const updates: Record<string, unknown> = {
    [`tenantDirectory/${tenantId}/displayName`]: tenantName,
    [`tenantDirectory/${tenantId}/kind`]: tenantType,
    [`tenantDirectory/${tenantId}/status`]: tenantStatus,
    [`tenantDirectory/${tenantId}/onboardingStatus`]: onboardingStatus,
    [`tenantDirectory/${tenantId}/assetCount`]: counts.totalAssets,
    [`tenantDirectory/${tenantId}/createdAt`]: timestamp(profile.createdAt),
  }
  for (const [uid, membershipValue] of Object.entries(members)) {
    const membership = objectValue(membershipValue)
    if (membership.status === 'active' && (membership.role === 'client_owner' || membership.role === 'client_delegate')) {
      updates[`tenants/${tenantId}/readModels/clientOverview/${uid}`] = overview
    }
  }
  return updates
}

async function ensureTenant(tenantId: string) {
  if (!tenantIdSchema.safeParse(tenantId).success) throw new ApiError('invalid-argument', 'Choose a valid client account.')
  const snapshot = await getAdminDatabase().ref(`tenants/${tenantId}/profile`).get()
  if (!snapshot.exists()) throw new ApiError('not-found', 'Client account not found.')
  return objectValue(snapshot.val())
}

export async function adminPortal(identity: DecodedIdToken, rawPayload: unknown): Promise<unknown> {
  const actionResult = staffActionSchema.safeParse(rawPayload)
  if (!actionResult.success) throw new ApiError('invalid-argument', 'Choose a valid dashboard action.')
  const payload = rawPayload as Record<string, unknown>
  const inputPayload = Object.fromEntries(Object.entries(payload).filter(([key]) => key !== 'action'))
  const database = getAdminDatabase()

  switch (actionResult.data.action) {
    case 'overview': {
      requireRole(identity, ['registrar', 'verifier', 'valuation_specialist', 'compliance_officer', 'platform_administrator', 'auditor'])
      const clients = await listClientSummaries(false)
      const directory = await ensureDirectory()
      const models = await Promise.all(clients.map((client) => {
        const ownerUid = objectValue(directory[client.tenantId]).ownerUid
        return typeof ownerUid === 'string'
          ? database.ref(`tenants/${client.tenantId}/readModels/clientOverview/${ownerUid}`).get()
          : Promise.resolve(null)
      }))
      let evidencePending = 0
      let disputed = 0
      for (const modelSnapshot of models) {
        const counts = objectValue(objectValue(modelSnapshot?.val()).counts)
        evidencePending += Number(counts.pendingReview ?? 0) || 0
        disputed += Number(counts.disputed ?? 0) || 0
      }
      return AdminOverviewSchema.parse({
        clients: clients.length,
        onboardingPending: clients.filter((client) => client.onboardingStatus !== 'active').length,
        assets: clients.reduce((sum, client) => sum + client.assetCount, 0),
        evidencePending,
        disputed,
        asOf: Date.now(),
      })
    }
    case 'clients': {
      const role = requireRole(identity, ['compliance_officer', 'platform_administrator'])
      return listClientSummaries(true).then((clients) => clients.map((client) => ({ ...client, email: role === 'platform_administrator' || role === 'compliance_officer' ? client.email : null })))
    }
    case 'tenantOptions': {
      const role = requireRole(identity, ['registrar', 'verifier', 'valuation_specialist', 'compliance_officer', 'platform_administrator', 'auditor'])
      const clients = await listClientSummaries(false)
      let scopedClients = clients
      if (role !== 'platform_administrator' && role !== 'compliance_officer') {
        const snapshot = await database.ref(`staffTenantAssignments/${identity.uid}`).get()
        const assignments = objectValue(snapshot.val())
        scopedClients = clients.filter((client) => objectValue(assignments[client.tenantId]).status === 'active')
      }
      return scopedClients.map(({ tenantId, displayName, tenantType, status, onboardingStatus, createdAt, assetCount }) => ({ tenantId, displayName, email: null, tenantType, status, onboardingStatus, createdAt, assetCount }))
    }
    case 'client': {
      const role = requireRole(identity, ['compliance_officer', 'platform_administrator', 'registrar', 'verifier', 'valuation_specialist'])
      const parsed = tenantIdSchema.safeParse(payload.tenantId)
      if (!parsed.success) throw new ApiError('invalid-argument', 'Choose a valid client account.')
      await requireTenantAssignment(identity, parsed.data)
      return getClientDetail(parsed.data, role === 'compliance_officer' || role === 'platform_administrator')
    }
    case 'assets': {
      requireRole(identity, ['registrar', 'verifier', 'valuation_specialist', 'compliance_officer', 'platform_administrator'])
      const parsed = tenantIdSchema.safeParse(payload.tenantId)
      if (!parsed.success) throw new ApiError('invalid-argument', 'Choose a client account to view its asset register.')
      await requireTenantAssignment(identity, parsed.data)
      return getTenantAssets(parsed.data)
    }
    case 'createAsset': {
      requireRole(identity, ['registrar', 'compliance_officer', 'platform_administrator'])
      const input = CreateAdminAssetInputSchema.safeParse(inputPayload)
      if (!input.success) throw new ApiError('invalid-argument', 'Check the asset details and try again.')
      await requireTenantAssignment(identity, input.data.tenantId)
      await ensureTenant(input.data.tenantId)
      const entitySnapshot = await database.ref(`tenants/${input.data.tenantId}/entities/${input.data.legalOwnerEntityId}`).get()
      if (!entitySnapshot.exists() || objectValue(entitySnapshot.val()).status !== 'active') throw new ApiError('invalid-argument', 'Choose an active legal owner for this asset.')
      const assetRef = database.ref(`tenants/${input.data.tenantId}/assets`).push()
      const audit = auditRecord(identity.uid, 'asset_recorded', 'Asset recorded', 'Pending evidence review', { assetId: assetRef.key, category: input.data.category })
      if (!assetRef.key) throw new ApiError('internal', 'Could not create the asset record.')
      const now = Date.now()
      const asset = {
        id: assetRef.key,
        registryId: `PWR-${new Date(now).getUTCFullYear()}-${assetRef.key.slice(-8).toUpperCase()}`,
        tenantId: input.data.tenantId,
        legalOwnerEntityId: input.data.legalOwnerEntityId,
        name: input.data.name,
        category: input.data.category,
        description: input.data.description,
        location: input.data.location,
        recordStatus: 'active',
        ownershipEvidenceStatus: 'pending_review',
        evidenceRationale: '',
        valuationStatus: 'not_recorded',
        latestValuation: null,
        latestValuationId: null,
        currentVersion: 1,
        createdByUid: identity.uid,
        createdAt: now,
        updatedAt: now,
      }
      const updates = await projectionUpdates(input.data.tenantId, { [assetRef.key]: asset }, audit)
      updates[`tenants/${input.data.tenantId}/assets/${assetRef.key}`] = asset
      updates[`tenants/${input.data.tenantId}/assetVersions/${assetRef.key}/v1`] = { ...asset, changedByUid: identity.uid, changeReason: 'Initial asset record' }
      updates[`tenants/${input.data.tenantId}/audit/${audit.id}`] = audit.record
      await database.ref().update(updates)
      return { id: assetRef.key }
    }
    case 'reviewAsset': {
      requireRole(identity, ['verifier', 'platform_administrator'])
      const input = ReviewAdminAssetInputSchema.safeParse(inputPayload)
      if (!input.success) throw new ApiError('invalid-argument', 'Add a review decision and rationale, then try again.')
      await requireTenantAssignment(identity, input.data.tenantId)
      await ensureTenant(input.data.tenantId)
      const assetRef = database.ref(`tenants/${input.data.tenantId}/assets/${input.data.assetId}`)
      const assetSnapshot = await assetRef.get()
      if (!assetSnapshot.exists()) throw new ApiError('not-found', 'Asset record not found.')
      const asset = objectValue(assetSnapshot.val())
      if (!['pending_review', 'disputed'].includes(String(asset.ownershipEvidenceStatus))) throw new ApiError('failed-precondition', 'This asset is no longer waiting for an evidence decision.')
      const adminOverride = asset.createdByUid === identity.uid && identity.role === 'platform_administrator'
      if (asset.createdByUid === identity.uid && !adminOverride) throw new ApiError('permission-denied', 'A verifier cannot approve evidence for an asset they recorded.')
      const now = Date.now()
      const audit = auditRecord(identity.uid, 'asset_evidence_reviewed', input.data.decision === 'disputed' ? 'Asset marked as disputed' : 'Asset evidence reviewed', input.data.decision === 'disputed' ? 'Disputed' : 'Reviewed', { assetId: input.data.assetId, rationale: input.data.rationale, adminOverride })
      const nextAsset = { ...asset, ownershipEvidenceStatus: input.data.decision, evidenceRationale: input.data.rationale, reviewedByUid: identity.uid, updatedAt: now, currentVersion: Number(asset.currentVersion ?? 1) + 1 }
      const updates = await projectionUpdates(input.data.tenantId, { [input.data.assetId]: nextAsset }, audit)
      updates[`tenants/${input.data.tenantId}/assets/${input.data.assetId}`] = nextAsset
      updates[`tenants/${input.data.tenantId}/assetVersions/${input.data.assetId}/v${nextAsset.currentVersion}`] = { ...nextAsset, changedByUid: identity.uid, changeReason: input.data.rationale }
      updates[`tenants/${input.data.tenantId}/reviews/${audit.id}`] = { id: audit.id, assetId: input.data.assetId, decision: input.data.decision, rationale: input.data.rationale, reviewedByUid: identity.uid, adminOverride, createdAt: now }
      updates[`tenants/${input.data.tenantId}/audit/${audit.id}`] = audit.record
      await database.ref().update(updates)
      return { updated: true }
    }
    case 'recordValuation': {
      requireRole(identity, ['valuation_specialist', 'platform_administrator'])
      const input = RecordAdminValuationInputSchema.safeParse(inputPayload)
      if (!input.success) throw new ApiError('invalid-argument', 'Check the valuation amount, currency, source, method, and effective date.')
      await requireTenantAssignment(identity, input.data.tenantId)
      await ensureTenant(input.data.tenantId)
      const assetRef = database.ref(`tenants/${input.data.tenantId}/assets/${input.data.assetId}`)
      const assetSnapshot = await assetRef.get()
      if (!assetSnapshot.exists()) throw new ApiError('not-found', 'Asset record not found.')
      const asset = objectValue(assetSnapshot.val())
      const valuationRef = database.ref(`tenants/${input.data.tenantId}/valuations/${input.data.assetId}`).push()
      const now = Date.now()
      const valuation = {
        id: valuationRef.key,
        assetId: input.data.assetId,
        amountMinor: input.data.amountMinor,
        currency: input.data.currency,
        asOfDate: input.data.asOfDate,
        sourceType: input.data.sourceType,
        methodology: input.data.methodology,
        approvalStatus: 'recorded',
        evidenceDocumentIds: [],
        createdBy: identity.uid,
        createdAt: now,
      }
      const latestValuation = { amountMinor: valuation.amountMinor, currency: valuation.currency, asOfDate: valuation.asOfDate, sourceType: valuation.sourceType, methodology: valuation.methodology }
      const nextAsset = { ...asset, latestValuation, latestValuationId: valuationRef.key, valuationStatus: 'recorded', updatedAt: now, currentVersion: Number(asset.currentVersion ?? 1) + 1 }
      const audit = auditRecord(identity.uid, 'valuation_recorded', 'Asset valuation recorded', 'Recorded', { assetId: input.data.assetId, currency: input.data.currency, asOfDate: input.data.asOfDate })
      const updates = await projectionUpdates(input.data.tenantId, { [input.data.assetId]: nextAsset }, audit)
      updates[`tenants/${input.data.tenantId}/assets/${input.data.assetId}`] = nextAsset
      updates[`tenants/${input.data.tenantId}/assetVersions/${input.data.assetId}/v${nextAsset.currentVersion}`] = { ...nextAsset, changedByUid: identity.uid, changeReason: 'Valuation recorded' }
      updates[`tenants/${input.data.tenantId}/valuations/${input.data.assetId}/${valuationRef.key}`] = valuation
      updates[`tenants/${input.data.tenantId}/audit/${audit.id}`] = audit.record
      await database.ref().update(updates)
      return { updated: true }
    }
    case 'onboarding': {
      requireRole(identity, ['compliance_officer', 'platform_administrator'])
      const input = UpdateAdminOnboardingInputSchema.safeParse(inputPayload)
      if (!input.success) throw new ApiError('invalid-argument', 'Add a valid onboarding decision and try again.')
      const profile = await ensureTenant(input.data.tenantId)
      const status = input.data.status === 'active' ? 'active' : 'onboarding'
      const now = Date.now()
      const audit = auditRecord(identity.uid, 'onboarding_updated', input.data.status === 'active' ? 'Client onboarding approved' : 'Client information requested', input.data.status === 'active' ? 'Active' : 'Action required', { note: input.data.note })
      const updates: Record<string, unknown> = {
        [`tenants/${input.data.tenantId}/profile/status`]: status,
        [`tenants/${input.data.tenantId}/profile/onboardingStatus`]: input.data.status,
        [`tenants/${input.data.tenantId}/profile/onboardingNote`]: input.data.note,
        [`tenantDirectory/${input.data.tenantId}/status`]: status,
        [`tenantDirectory/${input.data.tenantId}/onboardingStatus`]: input.data.status,
        [`tenants/${input.data.tenantId}/audit/${audit.id}`]: audit.record,
      }
      const members = objectValue((await database.ref(`tenants/${input.data.tenantId}/members`).get()).val())
      for (const [uid, value] of Object.entries(members)) {
        const member = objectValue(value)
        if (member.status !== 'active' || !['client_owner', 'client_delegate'].includes(String(member.role))) continue
        const existingModel = objectValue((await database.ref(`tenants/${input.data.tenantId}/readModels/clientOverview/${uid}`).get()).val())
        const existingActivity = Array.isArray(existingModel.recentActivity) ? existingModel.recentActivity : []
        const recentActivity = [{ id: audit.id, label: audit.record.label, occurredAt: now, status: audit.record.status }, ...existingActivity].slice(0, 10)
        updates[`tenants/${input.data.tenantId}/readModels/clientOverview/${uid}/tenantStatus`] = status
        updates[`tenants/${input.data.tenantId}/readModels/clientOverview/${uid}/onboardingStatus`] = input.data.status
        updates[`tenants/${input.data.tenantId}/readModels/clientOverview/${uid}/asOf`] = now
        updates[`tenants/${input.data.tenantId}/readModels/clientOverview/${uid}/tenantName`] = profile.displayName
        updates[`tenants/${input.data.tenantId}/readModels/clientOverview/${uid}/recentActivity`] = recentActivity
      }
      await database.ref().update(updates)
      return { updated: true }
    }
    case 'audit': {
      requireRole(identity, ['compliance_officer', 'platform_administrator', 'auditor'])
      const parsed = tenantIdSchema.safeParse(payload.tenantId)
      if (!parsed.success) throw new ApiError('invalid-argument', 'Choose a client account to search its activity.')
      await requireTenantAssignment(identity, parsed.data)
      await ensureTenant(parsed.data)
      const snapshot = await database.ref(`tenants/${parsed.data}/audit`).orderByKey().limitToLast(100).get()
      return Object.entries(objectValue(snapshot.val())).map(([id, value]) => ({ id, ...objectValue(value) })).reverse()
    }
    case 'contactMessages': {
      requireRole(identity, ['platform_administrator'])
      const snapshot = await database.ref('publicEnquiries').orderByKey().limitToLast(200).get()
      const messages = Object.entries(objectValue(snapshot.val())).flatMap(([id, value]) => {
        const raw = objectValue(value)
        const parsed = AdminEnquirySchema.safeParse({
          id,
          name: raw.name,
          email: raw.email,
          message: raw.message,
          receivedAt: raw.receivedAt,
          updatedAt: raw.updatedAt,
          status: raw.status,
        })
        return parsed.success ? [parsed.data] : []
      })
      return AdminEnquiriesSchema.parse(messages.sort((left, right) => right.receivedAt - left.receivedAt))
    }
    case 'contactMessageStatus': {
      requireRole(identity, ['platform_administrator'])
      const input = UpdateAdminEnquiryStatusInputSchema.safeParse(inputPayload)
      if (!input.success) throw new ApiError('invalid-argument', 'Choose a valid enquiry and inbox status.')
      const messageRef = database.ref(`publicEnquiries/${input.data.id}`)
      const snapshot = await messageRef.get()
      if (!snapshot.exists()) throw new ApiError('not-found', 'Enquiry not found.')
      const current = objectValue(snapshot.val())
      if (!AdminEnquirySchema.safeParse({ ...current, id: input.data.id }).success) throw new ApiError('data-loss', 'This enquiry record is incomplete and cannot be updated.')
      const audit = auditRecord(identity.uid, 'contact_enquiry_status_changed', 'Contact enquiry status changed', input.data.status, { enquiryId: input.data.id })
      await database.ref().update({
        [`publicEnquiries/${input.data.id}/status`]: input.data.status,
        [`publicEnquiries/${input.data.id}/updatedAt`]: Date.now(),
        [`systemAudit/${audit.id}`]: audit.record,
      })
      return { updated: true }
    }
    case 'staffDirectory': {
      requireRole(identity, ['platform_administrator'])
      const { users } = await getAdminAuth().listUsers(1000)
      const staff = await Promise.all(users.map(async (user) => {
        const role = StaffRoleSchema.safeParse(user.customClaims?.role)
        if (!role.success) return null
        const assignmentsSnapshot = await database.ref(`staffTenantAssignments/${user.uid}`).get()
        const assignedTenantIds = Object.entries(objectValue(assignmentsSnapshot.val()))
          .filter(([, value]) => objectValue(value).status === 'active')
          .map(([tenantId]) => tenantId)
          .slice(0, 500)
        return { uid: user.uid, email: user.email ?? null, displayName: user.displayName ?? user.email ?? 'Staff member', role: role.data, assignedTenantIds }
      }))
      return staff.filter((user): user is NonNullable<typeof user> => user !== null).slice(0, 500)
    }
    case 'staffAssignment': {
      requireRole(identity, ['platform_administrator'])
      const input = staffAssignmentInputSchema.safeParse(inputPayload)
      if (!input.success) throw new ApiError('invalid-argument', 'Choose a staff account, client, and access change.')
      const [tenant, target] = await Promise.all([
        ensureTenant(input.data.tenantId),
        getAdminAuth().getUser(input.data.staffUid),
      ])
      if (!StaffRoleSchema.safeParse(target.customClaims?.role).success) throw new ApiError('failed-precondition', 'Only an account already provisioned with a staff role can receive client access.')
      const audit = auditRecord(identity.uid, input.data.assigned ? 'staff_client_access_granted' : 'staff_client_access_revoked', input.data.assigned ? 'Staff client access granted' : 'Staff client access revoked', input.data.assigned ? 'Granted' : 'Revoked', { staffUid: input.data.staffUid })
      const updates: Record<string, unknown> = {
        [`staffTenantAssignments/${input.data.staffUid}/${input.data.tenantId}`]: input.data.assigned ? { status: 'active', assignedByUid: identity.uid, updatedAt: Date.now() } : null,
        [`tenants/${input.data.tenantId}/audit/${audit.id}`]: audit.record,
      }
      await database.ref().update(updates)
      return { updated: true, clientName: normalizedText(tenant.displayName, 'Client account') }
    }
  }
}

export async function getClientAssets(identity: DecodedIdToken, rawTenantId: unknown) {
  const member = await requireTenantMember(identity, rawTenantId)
  if (member.role !== 'client_owner' && member.role !== 'client_delegate') throw new ApiError('permission-denied', 'Client asset records are available to account members only.')
  const assets = await getTenantAssets(member.tenantId)
  return assets.filter((asset) => asset.recordStatus === 'active').map(({ tenantId: _tenantId, createdByUid: _createdByUid, ...asset }) => asset)
}
