import { requireAuthenticatedUser } from '../server/auth.js'
import { createClientTenant } from '../server/account-service.js'
import { errorResponse, methodNotAllowed, readJson, successResponse } from '../server/errors.js'

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return methodNotAllowed()
    try {
      const identity = await requireAuthenticatedUser(request)
      const result = await createClientTenant(identity.uid, await readJson(request))
      return successResponse(result)
    } catch (error) {
      return errorResponse(error)
    }
  },
}
