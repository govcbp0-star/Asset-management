import { PortalDashboardSchema } from '@pwarpi/shared'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { requireTenantMember } from '../shared/authz.js'
import { allowedCallableOrigins } from '../shared/cors.js'
import { adminDatabase } from '../shared/firebase.js'

export const getPortalDashboard = onCall({
  region: 'us-central1',
  cors: allowedCallableOrigins,
}, async (request) => {
  const member = await requireTenantMember(request, request.data?.tenantId)
  const isClient = member.role === 'client_owner' || member.role === 'client_delegate'
  const [tenantSnapshot, overviewSnapshot] = await Promise.all([
    adminDatabase.ref(`tenants/${member.tenantId}/profile`).get(),
    adminDatabase.ref(`tenants/${member.tenantId}/readModels/${isClient ? 'clientOverview' : 'staffOverview'}/${member.uid}`).get(),
  ])
  const tenant = tenantSnapshot.val() as { displayName?: string; kind?: string; status?: string; onboardingStatus?: string } | null
  if (!tenant) throw new HttpsError('not-found', 'Account not found.')
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
    throw new HttpsError('data-loss', 'The account dashboard is not available yet.')
  }
  return dashboard.data
})
