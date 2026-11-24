import { requireAuthenticatedUser } from '../server/auth'
import { createClientTenant } from '../server/account-service'
import { errorResponse, methodNotAllowed, readJson, successResponse } from '../server/errors'

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
