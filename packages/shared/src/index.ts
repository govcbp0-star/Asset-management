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

export const AssetCategorySchema = z.enum([
  'real_estate',
  'cash_and_deposits',
  'investments',
  'business_interests',
  'vehicles',
  'art_and_collectibles',
  'other',
])
export type AssetCategory = z.infer<typeof AssetCategorySchema>
const CurrencyCodeSchema = z.string().regex(/^[A-Z]{3}$/).refine((value) => {
  try { new Intl.NumberFormat('en', { style: 'currency', currency: value }); return true } catch { return false }
}, 'Enter a supported currency code.')

export const AdminClientSchema = z.object({
  tenantId: z.string(),
  displayName: z.string(),
  email: z.string().nullable(),
  tenantType: TenantTypeSchema,
  status: z.enum(['onboarding', 'active', 'suspended']),
  onboardingStatus: z.enum(['pending_review', 'active', 'action_required']),
  createdAt: z.number().int().nonnegative(),
  assetCount: z.number().int().nonnegative(),
}).strict()
export type AdminClient = z.infer<typeof AdminClientSchema>
export const AdminClientsSchema = z.array(AdminClientSchema).max(500)

export const AdminAssetSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  legalOwnerEntityId: z.string(),
  ownerEntityName: z.string(),
  name: z.string(),
  category: AssetCategorySchema,
  description: z.string(),
  location: z.string(),
  recordStatus: z.enum(['active', 'archived']),
  ownershipEvidenceStatus: z.enum(['pending_review', 'evidence_reviewed', 'disputed']),
  evidenceRationale: z.string(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  createdByUid: z.string(),
  latestValuation: z.object({
    amountMinor: z.string().regex(/^\d+$/),
    currency: CurrencyCodeSchema,
    asOfDate: z.string(),
    methodology: z.string(),
    sourceType: z.string(),
  }).strict().nullable(),
}).strict()
export type AdminAsset = z.infer<typeof AdminAssetSchema>
export const AdminAssetsSchema = z.array(AdminAssetSchema).max(500)

export const AdminClientDetailSchema = z.object({
  client: AdminClientSchema,
  assets: z.array(AdminAssetSchema).max(500),
  entities: z.array(z.object({ id: z.string(), name: z.string() }).strict()).max(100),
}).strict()
export type AdminClientDetail = z.infer<typeof AdminClientDetailSchema>

export const ClientAssetSchema = AdminAssetSchema.omit({ tenantId: true, createdByUid: true })
export type ClientAsset = z.infer<typeof ClientAssetSchema>
export const ClientAssetsSchema = z.array(ClientAssetSchema).max(500)

export const CreateAdminAssetInputSchema = z.object({
  tenantId: z.string().regex(/^[A-Za-z0-9_-]{8,80}$/),
  legalOwnerEntityId: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
  name: z.string().trim().min(2).max(120),
  category: AssetCategorySchema,
  description: z.string().trim().max(1000).default(''),
  location: z.string().trim().max(160).default(''),
}).strict()
export type CreateAdminAssetInput = z.infer<typeof CreateAdminAssetInputSchema>

export const ReviewAdminAssetInputSchema = z.object({
  tenantId: z.string().regex(/^[A-Za-z0-9_-]{8,80}$/),
  assetId: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
  decision: z.enum(['evidence_reviewed', 'disputed']),
  rationale: z.string().trim().min(5).max(1000),
}).strict()
export type ReviewAdminAssetInput = z.infer<typeof ReviewAdminAssetInputSchema>

export const RecordAdminValuationInputSchema = z.object({
  tenantId: z.string().regex(/^[A-Za-z0-9_-]{8,80}$/),
  assetId: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
  amountMinor: z.string().regex(/^\d{1,18}$/),
  currency: CurrencyCodeSchema,
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`)
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  }),
  sourceType: z.string().trim().min(2).max(80),
  methodology: z.string().trim().min(2).max(120),
}).strict()
export type RecordAdminValuationInput = z.infer<typeof RecordAdminValuationInputSchema>

export const UpdateAdminOnboardingInputSchema = z.object({
  tenantId: z.string().regex(/^[A-Za-z0-9_-]{8,80}$/),
  status: z.enum(['active', 'action_required']),
  note: z.string().trim().max(1000).default(''),
}).strict()
export type UpdateAdminOnboardingInput = z.infer<typeof UpdateAdminOnboardingInputSchema>

export const AdminOverviewSchema = z.object({
  clients: z.number().int().nonnegative(),
  onboardingPending: z.number().int().nonnegative(),
  assets: z.number().int().nonnegative(),
  evidencePending: z.number().int().nonnegative(),
  disputed: z.number().int().nonnegative(),
  asOf: z.number().int().nonnegative(),
}).strict()
export type AdminOverview = z.infer<typeof AdminOverviewSchema>

export const AdminStaffUserSchema = z.object({
  uid: z.string(),
  email: z.string().nullable(),
  displayName: z.string(),
  role: StaffRoleSchema,
  assignedTenantIds: z.array(z.string()).max(500),
}).strict()
export type AdminStaffUser = z.infer<typeof AdminStaffUserSchema>
export const AdminStaffUsersSchema = z.array(AdminStaffUserSchema).max(500)

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
