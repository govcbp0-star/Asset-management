import { PortalDashboardSchema, type PortalDashboard } from '@pwarpi/shared'
import { postApi } from './api'

export async function getPortalDashboard(tenantId: string): Promise<PortalDashboard> {
  const response = await postApi<unknown>('/api/getPortalDashboard', { tenantId })
  return PortalDashboardSchema.parse(response)
}
