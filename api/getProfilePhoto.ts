import { requireAuthenticatedUser } from '../server/auth.js'
import { getAdminStorageBucket } from '../server/firebase-admin.js'
import { ApiError, errorResponse, methodNotAllowed } from '../server/errors.js'

const photoPath = (uid: string) => `accountProfilePhotos/${uid}/avatar`

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return methodNotAllowed()
    try {
      const identity = await requireAuthenticatedUser(request)
      if (identity.email_verified !== true) {
        throw new ApiError('permission-denied', 'Verify your email before accessing account settings.')
      }
      const file = getAdminStorageBucket().file(photoPath(identity.uid))
      const [exists] = await file.exists()
      if (!exists) throw new ApiError('not-found', 'No profile photo has been set.')

      const [metadata] = await file.getMetadata()
      const contentType = metadata.contentType
      if (contentType !== 'image/jpeg' && contentType !== 'image/png' && contentType !== 'image/webp') {
        throw new ApiError('data-loss', 'The saved profile photo could not be displayed.')
      }
      const photoSize = Number(metadata.size)
      if (metadata.metadata?.ownerUid !== identity.uid || !Number.isFinite(photoSize) || photoSize < 1 || photoSize > 1_500_000) {
        throw new ApiError('data-loss', 'The saved profile photo could not be displayed.')
      }

      const [bytes] = await file.download()
      const responseBody = new Uint8Array(bytes.byteLength)
      responseBody.set(bytes)

      return new Response(responseBody.buffer, {
        headers: {
          'Cache-Control': 'private, no-store',
          'Content-Length': String(responseBody.byteLength),
          'Content-Security-Policy': "default-src 'none'; sandbox",
          'Content-Type': contentType,
          'X-Content-Type-Options': 'nosniff',
        },
      })
    } catch (error) {
      return errorResponse(error)
    }
  },
}
