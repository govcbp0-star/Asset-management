import { requireAuthenticatedUser } from '../server/auth'
import { getPortalDashboard } from '../server/account-service'
import { errorResponse, methodNotAllowed, readJson, successResponse } from '../server/errors'

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return methodNotAllowed()
    try {
      const identity = await requireAuthenticatedUser(request)
      const payload = await readJson(request)
      const tenantId = typeof payload === 'object' && payload !== null
        ? (payload as Record<string, unknown>).tenantId
        : undefined
      const result = await getPortalDashboard(identity, tenantId)
      return successResponse(result)
    } catch (error) {
      return errorResponse(error)
    }
  },
}
