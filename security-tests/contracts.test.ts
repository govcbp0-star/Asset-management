import { describe, expect, it } from 'vitest'
import {
  CreateTenantInputSchema,
  DEVELOPMENT_NOTICE_VERSION,
  PortalDashboardSchema,
  RoleHomePath,
  StaffRoles,
  UserRoleSchema,
} from '@pwarpi/shared'

describe('shared authorization and data contracts', () => {
  it('keeps the client onboarding contract fixed to development notice versions', () => {
    const valid = {
      displayName: 'Northshore Household',
      tenantType: 'family_office',
      acceptedNotices: true,
      noticeVersion: DEVELOPMENT_NOTICE_VERSION,
      privacyNoticeVersion: DEVELOPMENT_NOTICE_VERSION,
    }
    expect(CreateTenantInputSchema.safeParse(valid).success).toBe(true)
    expect(CreateTenantInputSchema.safeParse({ ...valid, acceptedNotices: false }).success).toBe(false)
    expect(CreateTenantInputSchema.safeParse({ ...valid, role: 'platform_administrator' }).success).toBe(false)
    expect(CreateTenantInputSchema.safeParse({ ...valid, noticeVersion: 'client-selected' }).success).toBe(false)
  })

  it('defines an explicit home route for every role, while client provisioning grants no staff role', () => {
    const roles = UserRoleSchema.options
    expect(Object.keys(RoleHomePath).sort()).toEqual([...roles].sort())
    expect(StaffRoles).not.toContain('client_owner')
    expect(StaffRoles).not.toContain('client_delegate')
  })

  it('keeps evidence and valuation states as separate dashboard fields', () => {
    const dashboard = {
      tenantId: 'tenant_12345678', tenantName: 'Example', tenantType: 'individual',
      tenantStatus: 'onboarding', role: 'client_owner', onboardingStatus: 'pending_review',
      reportingCurrency: 'USD', asOf: 0, grossRegisteredValueMinor: null,
      counts: { totalAssets: 0, evidenceReviewed: 0, pendingReview: 0, disputed: 0, staleValuations: 0 },
      allocations: [], recentActivity: [],
    }
    expect(PortalDashboardSchema.safeParse(dashboard).success).toBe(true)
    expect(PortalDashboardSchema.safeParse({ ...dashboard, recordStatus: 'verified' }).success).toBe(false)
  })
})
