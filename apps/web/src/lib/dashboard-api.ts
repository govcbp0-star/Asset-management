import { BeneficiariesSchema, PortalDashboardSchema, type PortalDashboard } from '@pwarpi/shared'
import { postApi } from './api'

export async function getPortalDashboard(tenantId: string): Promise<PortalDashboard> {
  const response = await postApi<unknown>('/api/getPortalDashboard', { tenantId })
  return PortalDashboardSchema.parse(response)
}

export async function getBeneficiaries(tenantId: string) {
  const response = await postApi<unknown>('/api/getBeneficiaries', { tenantId })
  return BeneficiariesSchema.parse(response)
}
