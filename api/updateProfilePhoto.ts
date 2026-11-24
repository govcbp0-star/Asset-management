import { requireAuthenticatedUser } from '../server/auth.js'
import { getAdminStorageBucket } from '../server/firebase-admin.js'
import { ApiError, errorResponse, methodNotAllowed, successResponse } from '../server/errors.js'

const MAX_PHOTO_BYTES = 1_500_000
const photoPath = (uid: string) => `accountProfilePhotos/${uid}/avatar`

function detectedImageType(bytes: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return 'image/png'
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp'
  return null
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return methodNotAllowed()
    try {
      const identity = await requireAuthenticatedUser(request)
      if (identity.email_verified !== true) {
        throw new ApiError('permission-denied', 'Verify your email before changing account settings.')
      }
      const contentLength = Number(request.headers.get('content-length'))
      if (Number.isFinite(contentLength) && contentLength > MAX_PHOTO_BYTES + 32_768) {
        throw new ApiError('invalid-argument', 'Choose an image smaller than 1.5 MB.')
      }

      let form: FormData
      try { form = await request.formData() }
      catch { throw new ApiError('invalid-argument', 'Choose a JPG, PNG, or WebP image and try again.') }
      const keys = [...form.keys()]
      const photo = form.get('photo')
      if (keys.length !== 1 || keys[0] !== 'photo' || !(photo instanceof File)) {
        throw new ApiError('invalid-argument', 'Choose a JPG, PNG, or WebP image and try again.')
      }
      if (photo.size < 1 || photo.size > MAX_PHOTO_BYTES) {
        throw new ApiError('invalid-argument', 'Choose an image smaller than 1.5 MB.')
      }

      const bytes = new Uint8Array(await photo.arrayBuffer())
      const contentType = detectedImageType(bytes)
      if (!contentType || (photo.type && photo.type !== contentType)) {
        throw new ApiError('invalid-argument', 'Choose a valid JPG, PNG, or WebP image.')
      }

      await getAdminStorageBucket().file(photoPath(identity.uid)).save(Buffer.from(bytes), {
        resumable: false,
        metadata: {
          contentType,
          cacheControl: 'private, no-store',
          metadata: { ownerUid: identity.uid },
        },
      })
      return successResponse({ saved: true })
    } catch (error) {
      return errorResponse(error)
    }
  },
}
