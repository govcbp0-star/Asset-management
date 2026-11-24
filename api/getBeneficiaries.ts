import { getBeneficiaries } from '../server/account-service.js'
import { requireAuthenticatedUser } from '../server/auth.js'
import { errorResponse, methodNotAllowed, readJson, successResponse } from '../server/errors.js'

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return methodNotAllowed()
    try {
      const identity = await requireAuthenticatedUser(request)
      const payload = await readJson(request)
      const tenantId = typeof payload === 'object' && payload !== null
        ? (payload as Record<string, unknown>).tenantId
        : undefined
      return successResponse(await getBeneficiaries(identity, tenantId))
    } catch (error) {
      return errorResponse(error)
    }
  },
}
