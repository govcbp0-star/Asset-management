import {
  CreateTenantInputSchema,
  PortalDashboardSchema,
  type UserRole,
} from '@pwarpi/shared'
import { ApiError } from './errors'
import { getAdminAuth, getAdminDatabase } from './firebase-admin'
import { requireTenantMember } from './tenant-access'
import type { DecodedIdToken } from 'firebase-admin/auth'

export async function createClientTenant(uid: string, rawInput: unknown) {
  const input = CreateTenantInputSchema.safeParse(rawInput)
  if (!input.success) {
    throw new ApiError('invalid-argument', 'Check your account details and notice acknowledgment, then try again.')
  }

  const auth = getAdminAuth()
  const database = getAdminDatabase()
  const user = await auth.getUser(uid)
  const existingRole = user.customClaims?.role
  if (existingRole && existingRole !== 'client_owner') {
    throw new ApiError('permission-denied', 'This account is managed as a staff account.')
  }

  const existingIndex = await database.ref(`userTenantIndex/${uid}`).get()
  if (existingIndex.exists()) {
    const existing = existingIndex.val() as Record<string, { role?: string; status?: string }>
    const [tenantId, membership] = Object.entries(existing)[0] ?? []
    if (!tenantId || membership?.role !== 'client_owner' || membership.status !== 'active') {
      throw new ApiError('failed-precondition', 'Existing account access needs staff assistance.')
    }
    await auth.setCustomUserClaims(uid, {
      ...user.customClaims,
      tenantId,
      role: 'client_owner',
      membershipVersion: 1,
    })
    return { tenantId, role: 'client_owner' as const }
  }

  const proposedTenantRef = database.ref('tenants').push()
  const proposedTenantId = proposedTenantRef.key
  const proposedEntityId = proposedTenantRef.child('entities').push().key
  const proposedAuditId = proposedTenantRef.child('audit').push().key
  if (!proposedTenantId || !proposedEntityId || !proposedAuditId) {
    throw new ApiError('internal', 'The account could not be created.')
  }

  const proposal = {
    tenantId: proposedTenantId,
    entityId: proposedEntityId,
    auditId: proposedAuditId,
    displayName: input.data.displayName,
    tenantType: input.data.tenantType,
    noticeVersion: input.data.noticeVersion,
    privacyNoticeVersion: input.data.privacyNoticeVersion,
  }
  const lock = await database.ref(`tenantProvisioning/${uid}`).transaction((current) => current ?? proposal)
  const provisioning = lock.snapshot.val() as typeof proposal | null
  if (!lock.committed || !provisioning?.tenantId || !provisioning.entityId || !provisioning.auditId) {
    throw new ApiError('aborted', 'Account setup is already being processed. Wait a moment, then try again.')
  }

  const { tenantId, entityId, auditId } = provisioning
  const existingProfile = await database.ref(`tenants/${tenantId}/profile`).get()
  const tenantName = provisioning.displayName
  const tenantType = provisioning.tenantType
  const tenantStatus = 'onboarding'
  const updates: Record<string, unknown> = {
    [`tenants/${tenantId}/profile`]: {
      id: tenantId,
      displayName: tenantName,
      kind: tenantType,
      status: tenantStatus,
      onboardingStatus: 'pending_review',
      developmentNoticeAcknowledgedAt: { '.sv': 'timestamp' },
      noticeVersion: provisioning.noticeVersion,
      privacyNoticeVersion: provisioning.privacyNoticeVersion,
      createdAt: { '.sv': 'timestamp' },
    },
    [`tenants/${tenantId}/members/${uid}`]: {
      role: 'client_owner',
      status: 'active',
      entityScopes: ['*'],
      createdAt: { '.sv': 'timestamp' },
    },
    [`tenants/${tenantId}/entities/${entityId}`]: {
      id: entityId,
      name: tenantName,
      type: tenantType,
      relationship: 'primary_client',
      status: 'active',
      createdAt: { '.sv': 'timestamp' },
    },
    [`tenants/${tenantId}/readModels/clientOverview/${uid}`]: {
      tenantName,
      tenantType,
      tenantStatus,
      onboardingStatus: 'pending_review',
      reportingCurrency: 'USD',
      asOf: Date.now(),
      grossRegisteredValueMinor: null,
      counts: { totalAssets: 0, evidenceReviewed: 0, pendingReview: 0, disputed: 0, staleValuations: 0 },
      allocations: [],
      recentActivity: [],
    },
    [`tenants/${tenantId}/audit/${auditId}`]: {
      action: 'client_account_created',
      actorUid: uid,
      occurredAt: { '.sv': 'timestamp' },
      metadata: { noticeVersion: provisioning.noticeVersion, privacyNoticeVersion: provisioning.privacyNoticeVersion },
    },
    [`userProfiles/${uid}`]: {
      displayName: user.displayName ?? tenantName,
      createdAt: { '.sv': 'timestamp' },
    },
    [`userTenantIndex/${uid}/${tenantId}`]: { role: 'client_owner', status: 'active' },
  }

  if (!existingProfile.exists()) await database.ref().update(updates)
  await auth.setCustomUserClaims(uid, {
    ...user.customClaims,
    tenantId,
    role: 'client_owner',
    membershipVersion: 1,
  })

  return { tenantId, role: 'client_owner' as const satisfies UserRole }
}

export async function getPortalDashboard(identity: DecodedIdToken, rawTenantId: unknown) {
  const member = await requireTenantMember(identity, rawTenantId)
  const isClient = member.role === 'client_owner' || member.role === 'client_delegate'
  const database = getAdminDatabase()
  const [tenantSnapshot, overviewSnapshot] = await Promise.all([
    database.ref(`tenants/${member.tenantId}/profile`).get(),
    database.ref(`tenants/${member.tenantId}/readModels/${isClient ? 'clientOverview' : 'staffOverview'}/${member.uid}`).get(),
  ])
  const tenant = tenantSnapshot.val() as { displayName?: string; kind?: string; status?: string; onboardingStatus?: string } | null
  if (!tenant) throw new ApiError('not-found', 'Account not found.')

  const model = overviewSnapshot.val() as Record<string, unknown> | null
  const dashboard = PortalDashboardSchema.safeParse({
    tenantId: member.tenantId,
    tenantName: model?.tenantName ?? tenant.displayName ?? 'Private account',
    tenantType: model?.tenantType ?? tenant.kind,
    tenantStatus: model?.tenantStatus ?? tenant.status,
    role: member.role,
    onboardingStatus: model?.onboardingStatus ?? tenant.onboardingStatus,
    reportingCurrency: model?.reportingCurrency ?? 'USD',
    asOf: model?.asOf ?? 0,
    grossRegisteredValueMinor: model?.grossRegisteredValueMinor ?? null,
    counts: model?.counts ?? { totalAssets: 0, evidenceReviewed: 0, pendingReview: 0, disputed: 0, staleValuations: 0 },
    allocations: model?.allocations ?? [],
    recentActivity: model?.recentActivity ?? [],
  })
  if (!dashboard.success) {
    throw new ApiError('data-loss', 'The account dashboard is not available yet.')
  }
  return dashboard.data
}
