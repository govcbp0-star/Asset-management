import { CreateTenantInputSchema } from '@pwarpi/shared'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { allowedCallableOrigins } from '../shared/cors.js'
import { adminAuth, adminDatabase } from '../shared/firebase.js'

export const createClientTenant = onCall({
  region: 'us-central1',
  cors: allowedCallableOrigins,
}, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to continue.')
  const input = CreateTenantInputSchema.safeParse(request.data)
  if (!input.success) throw new HttpsError('invalid-argument', 'Check the account details and try again.')

  const user = await adminAuth.getUser(uid)
  const existingRole = user.customClaims?.role
  if (existingRole && existingRole !== 'client_owner') {
    throw new HttpsError('permission-denied', 'This account is managed as a staff account.')
  }

  const existingIndex = await adminDatabase.ref(`userTenantIndex/${uid}`).get()
  if (existingIndex.exists()) {
    const existing = existingIndex.val() as Record<string, { role?: string; status?: string }>
    const [tenantId, membership] = Object.entries(existing)[0] ?? []
    if (!tenantId || membership?.role !== 'client_owner' || membership.status !== 'active') {
      throw new HttpsError('failed-precondition', 'Existing account access needs staff assistance.')
    }
    await adminAuth.setCustomUserClaims(uid, {
      ...user.customClaims,
      tenantId,
      role: 'client_owner',
      membershipVersion: 1,
    })
    return { tenantId, role: 'client_owner' as const }
  }

  const proposedTenantRef = adminDatabase.ref('tenants').push()
  const proposedTenantId = proposedTenantRef.key
  const proposedEntityId = proposedTenantRef.child('entities').push().key
  const proposedAuditId = proposedTenantRef.child('audit').push().key
  if (!proposedTenantId || !proposedEntityId || !proposedAuditId) {
    throw new HttpsError('internal', 'The account could not be created.')
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
  const lock = await adminDatabase.ref(`tenantProvisioning/${uid}`).transaction((current) => current ?? proposal)
  const provisioning = lock.snapshot.val() as typeof proposal | null
  if (!lock.committed || !provisioning?.tenantId || !provisioning.entityId || !provisioning.auditId) {
    throw new HttpsError('aborted', 'Account setup is already in progress. Try again shortly.')
  }
  const { tenantId, entityId, auditId } = provisioning
  const existingProfile = await adminDatabase.ref(`tenants/${tenantId}/profile`).get()

  const now = Date.now()
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
      asOf: now,
      grossRegisteredValueMinor: null,
      counts: { totalAssets: 0, evidenceReviewed: 0, pendingReview: 0, disputed: 0, staleValuations: 0 },
      allocations: [],
      recentActivity: [],
    },
    [`tenants/${tenantId}/audit/${auditId}`]: {
      action: 'client_workspace_created',
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

  if (!existingProfile.exists()) await adminDatabase.ref().update(updates)
  await adminAuth.setCustomUserClaims(uid, {
    ...user.customClaims,
    tenantId,
    role: 'client_owner',
    membershipVersion: 1,
  })

  return { tenantId, role: 'client_owner' as const }
})
