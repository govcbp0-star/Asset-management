import { requireAuthenticatedUser } from '../server/auth.js'
import { adminPortal } from '../server/admin-service.js'
import { errorResponse, methodNotAllowed, readJson, successResponse } from '../server/errors.js'

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return methodNotAllowed()
    try {
      const identity = await requireAuthenticatedUser(request)
      return successResponse(await adminPortal(identity, await readJson(request)))
    } catch (error) {
      return errorResponse(error)
    }
  },
}
