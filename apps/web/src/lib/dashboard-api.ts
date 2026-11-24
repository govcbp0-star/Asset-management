import {
  AdminAssetsSchema,
  AdminClientDetailSchema,
  AdminClientsSchema,
  AdminOverviewSchema,
  AdminStaffUsersSchema,
  BeneficiariesSchema,
  ClientAssetsSchema,
  PortalDashboardSchema,
  type AdminAsset,
  type AdminClient,
  type AdminClientDetail,
  type AdminOverview,
  type AdminStaffUser,
  type ClientAsset,
  type PortalDashboard,
} from '@pwarpi/shared'
import { postApi } from './api'

export async function getPortalDashboard(tenantId: string): Promise<PortalDashboard> {
  const response = await postApi<unknown>('/api/getPortalDashboard', { tenantId })
  return PortalDashboardSchema.parse(response)
}

export async function getBeneficiaries(tenantId: string) {
  const response = await postApi<unknown>('/api/getBeneficiaries', { tenantId })
  return BeneficiariesSchema.parse(response)
}

async function adminAction<T>(action: string, payload: Record<string, unknown> = {}) {
  return postApi<T>('/api/adminPortal', { action, ...payload })
}

export async function getAdminOverview(): Promise<AdminOverview> {
  return AdminOverviewSchema.parse(await adminAction('overview'))
}

export async function getAdminClients(): Promise<AdminClient[]> {
  return AdminClientsSchema.parse(await adminAction('clients'))
}

export async function getAdminTenantOptions(): Promise<AdminClient[]> {
  return AdminClientsSchema.parse(await adminAction('tenantOptions'))
}

export async function getAdminClient(tenantId: string): Promise<AdminClientDetail> {
  return AdminClientDetailSchema.parse(await adminAction('client', { tenantId }))
}

export async function getAdminAssets(tenantId: string): Promise<AdminAsset[]> {
  return AdminAssetsSchema.parse(await adminAction('assets', { tenantId }))
}

export async function createAdminAsset(payload: unknown): Promise<{ id: string }> {
  return adminAction<{ id: string }>('createAsset', payload as Record<string, unknown>)
}

export async function reviewAdminAsset(payload: unknown): Promise<{ updated: boolean }> {
  return adminAction<{ updated: boolean }>('reviewAsset', payload as Record<string, unknown>)
}

export async function recordAdminValuation(payload: unknown): Promise<{ updated: boolean }> {
  return adminAction<{ updated: boolean }>('recordValuation', payload as Record<string, unknown>)
}

export async function updateAdminOnboarding(payload: unknown): Promise<{ updated: boolean }> {
  return adminAction<{ updated: boolean }>('onboarding', payload as Record<string, unknown>)
}

export async function getAdminAudit(tenantId: string): Promise<Array<Record<string, unknown> & { id: string }>> {
  return adminAction<Array<Record<string, unknown> & { id: string }>>('audit', { tenantId })
}

export async function getAdminStaff(): Promise<AdminStaffUser[]> {
  return AdminStaffUsersSchema.parse(await adminAction('staffDirectory'))
}

export async function setAdminStaffAssignment(payload: { staffUid: string; tenantId: string; assigned: boolean }): Promise<{ updated: boolean; clientName: string }> {
  return adminAction<{ updated: boolean; clientName: string }>('staffAssignment', payload)
}

export async function getClientAssets(tenantId: string): Promise<ClientAsset[]> {
  return ClientAssetsSchema.parse(await postApi<unknown>('/api/getClientAssets', { tenantId }))
}
