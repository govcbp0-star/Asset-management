import { getAdminAuth } from './firebase-admin.js'
import { ApiError } from './errors.js'

export async function requireAuthenticatedUser(request: Request) {
  const authorization = request.headers.get('authorization')
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) throw new ApiError('unauthenticated', 'Sign in again to continue.')

  const auth = getAdminAuth()
  try {
    return await auth.verifyIdToken(token, true)
  } catch {
    throw new ApiError('unauthenticated', 'Your sign-in has expired. Sign in again to continue.')
  }
}
