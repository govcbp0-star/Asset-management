import { createHmac } from 'node:crypto'
import { PublicEnquiryInputSchema } from '@pwarpi/shared'
import { getAdminDatabase } from './firebase-admin.js'
import { ApiError } from './errors.js'

const maxBodyBytes = 8 * 1024
const rateWindowMs = 15 * 60 * 1000
const maxSubmissionsPerWindow = 5

async function readLimitedJson(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get('content-length') ?? 0)
  if (declaredLength > maxBodyBytes) throw new ApiError('invalid-argument', 'The enquiry is too large. Shorten your message and try again.')
  if (!request.body) throw new ApiError('invalid-argument', 'Add your enquiry details and try again.')

  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let body = ''
  let bytesRead = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    bytesRead += value.byteLength
    if (bytesRead > maxBodyBytes) {
      await reader.cancel()
      throw new ApiError('invalid-argument', 'The enquiry is too large. Shorten your message and try again.')
    }
    body += decoder.decode(value, { stream: true })
  }
  body += decoder.decode()
  try {
    return JSON.parse(body) as unknown
  } catch {
    throw new ApiError('invalid-argument', 'Send valid enquiry details and try again.')
  }
}

function rateLimitSecret() {
  const explicitSecret = process.env.CONTACT_RATE_LIMIT_SECRET?.trim()
  if (explicitSecret) return explicitSecret
  try {
    const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? '') as { private_key?: unknown }
    if (typeof credentials.private_key === 'string' && credentials.private_key.length > 0) return credentials.private_key
  } catch { /* Local development may use application default credentials. */ }
  return process.env.VITE_FIREBASE_PROJECT_ID?.trim() || 'local-contact-rate-limit'
}

function requesterKey(request: Request) {
  const forwarded = request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for') ?? 'unknown'
  const address = forwarded.split(',')[0].trim().slice(0, 100) || 'unknown'
  return createHmac('sha256', rateLimitSecret()).update(address).digest('hex')
}

async function enforceRateLimit(request: Request, now: number) {
  const key = requesterKey(request)
  const reference = getAdminDatabase().ref(`contactRateLimits/${key}`)
  const transaction = await reference.transaction((raw: unknown) => {
    const previous = raw && typeof raw === 'object' && !Array.isArray(raw)
      ? raw as { windowStartedAt?: unknown; count?: unknown }
      : {}
    const startedAt = typeof previous.windowStartedAt === 'number' ? previous.windowStartedAt : 0
    const count = typeof previous.count === 'number' ? previous.count : 0
    if (now - startedAt < rateWindowMs) {
      if (count >= maxSubmissionsPerWindow) return
      return { windowStartedAt: startedAt, count: count + 1 }
    }
    return { windowStartedAt: now, count: 1 }
  })
  if (!transaction.committed) throw new ApiError('resource-exhausted', 'Too many enquiries were sent from this connection. Please try again in 15 minutes.')
}

export async function submitPublicEnquiry(request: Request) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) throw new ApiError('permission-denied', 'This enquiry could not be accepted from this site.')
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) throw new ApiError('invalid-argument', 'Send the enquiry as JSON and try again.')

  const parsed = PublicEnquiryInputSchema.safeParse(await readLimitedJson(request))
  if (!parsed.success) throw new ApiError('invalid-argument', 'Check your name, email address, and message, then try again.')
  if (parsed.data.website.trim()) return { received: true }

  const now = Date.now()
  await enforceRateLimit(request, now)
  const database = getAdminDatabase()
  const reference = database.ref('publicEnquiries').push()
  if (!reference.key) throw new ApiError('internal', 'The enquiry could not be saved. Please try again.')
  await reference.set({
    name: parsed.data.name.trim(),
    email: parsed.data.email.trim().toLowerCase(),
    message: parsed.data.message.trim(),
    receivedAt: now,
    updatedAt: now,
    status: 'new',
  })
  return { received: true }
}
