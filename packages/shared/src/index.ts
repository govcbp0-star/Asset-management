import { z } from 'zod'

export const UserRoleSchema = z.enum([
  'client_owner',
  'client_delegate',
  'registrar',
  'verifier',
  'valuation_specialist',
  'compliance_officer',
  'platform_administrator',
  'auditor',
])
export type UserRole = z.infer<typeof UserRoleSchema>

export const StaffRoleSchema = z.enum([
  'registrar',
  'verifier',
  'valuation_specialist',
  'compliance_officer',
  'platform_administrator',
  'auditor',
])
export type StaffRole = z.infer<typeof StaffRoleSchema>

export const TenantTypeSchema = z.enum(['individual', 'company', 'family_office'])
export type TenantType = z.infer<typeof TenantTypeSchema>

export const DEVELOPMENT_NOTICE_VERSION = 'dev-v1'
export const CreateTenantInputSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  tenantType: TenantTypeSchema,
  acceptedNotices: z.literal(true),
  noticeVersion: z.literal(DEVELOPMENT_NOTICE_VERSION),
  privacyNoticeVersion: z.literal(DEVELOPMENT_NOTICE_VERSION),
}).strict()
export type CreateTenantInput = z.infer<typeof CreateTenantInputSchema>

export const DashboardCountsSchema = z.object({
  totalAssets: z.number().int().nonnegative(),
  evidenceReviewed: z.number().int().nonnegative(),
  pendingReview: z.number().int().nonnegative(),
  disputed: z.number().int().nonnegative(),
  staleValuations: z.number().int().nonnegative(),
})

export const DashboardAllocationSchema = z.object({
  category: z.string(),
  label: z.string(),
  amountMinor: z.string().regex(/^\d+$/),
  currency: z.string().length(3),
})

export const DashboardActivitySchema = z.object({
  id: z.string(),
  label: z.string(),
  occurredAt: z.number().int().nonnegative(),
  status: z.string(),
})

export const PortalDashboardSchema = z.object({
  tenantId: z.string(),
  tenantName: z.string(),
  tenantType: TenantTypeSchema,
  tenantStatus: z.enum(['onboarding', 'active', 'suspended']),
  role: UserRoleSchema,
  onboardingStatus: z.enum(['pending_review', 'active', 'action_required']),
  reportingCurrency: z.string().length(3),
  asOf: z.number().int().nonnegative(),
  grossRegisteredValueMinor: z.string().regex(/^\d+$/).nullable(),
  counts: DashboardCountsSchema,
  allocations: z.array(DashboardAllocationSchema).max(12),
  recentActivity: z.array(DashboardActivitySchema).max(10),
}).strict()
export type PortalDashboard = z.infer<typeof PortalDashboardSchema>

export const BeneficiarySchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
  name: z.string().trim().min(2).max(100),
  relationship: z.string().trim().min(1).max(60),
  type: z.enum(['beneficiary', 'next_of_kin']),
}).strict()
export type Beneficiary = z.infer<typeof BeneficiarySchema>

export const BeneficiariesSchema = z.array(BeneficiarySchema).max(100)

export const RoleHomePath: Record<UserRole, string> = {
  client_owner: '/app/overview',
  client_delegate: '/app/overview',
  registrar: '/admin/overview',
  verifier: '/reviewer/queue',
  valuation_specialist: '/admin/valuations',
  compliance_officer: '/admin/onboarding',
  platform_administrator: '/admin/overview',
  auditor: '/admin/audit',
}

export const StaffRoles = StaffRoleSchema.options
