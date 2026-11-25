import { errorResponse, methodNotAllowed, successResponse } from '../server/errors.js'
import { submitPublicEnquiry } from '../server/contact-service.js'

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return methodNotAllowed()
    try {
      return successResponse(await submitPublicEnquiry(request))
    } catch (error) {
      return errorResponse(error)
    }
  },
}
