export type ApiErrorCode =
  | 'unauthenticated'
  | 'invalid-argument'
  | 'permission-denied'
  | 'failed-precondition'
  | 'aborted'
  | 'resource-exhausted'
  | 'not-found'
  | 'data-loss'
  | 'internal'

const statusByCode: Record<ApiErrorCode, number> = {
  unauthenticated: 401,
  'invalid-argument': 400,
  'permission-denied': 403,
  'failed-precondition': 412,
  aborted: 409,
  'resource-exhausted': 429,
  'not-found': 404,
  'data-loss': 500,
  internal: 500,
}

export class ApiError extends Error {
  readonly status: number

  constructor(readonly code: ApiErrorCode, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = statusByCode[code]
  }
}

export function methodNotAllowed(): Response {
  return Response.json(
    { error: { code: 'invalid-argument', message: 'Use a POST request for this endpoint.' } },
    { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' } },
  )
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new ApiError('invalid-argument', 'Send valid JSON account details and try again.')
  }
}

export function errorResponse(error: unknown): Response {
  if (!(error instanceof ApiError)) {
    const details = error && typeof error === 'object'
      ? error as { code?: unknown }
      : undefined
    const message = error instanceof Error ? error.message : String(error)
    const safeMessage = message
      .replace(/-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/g, '[redacted private key]')
      .replace(/[A-Za-z0-9+/_=-]{80,}/g, '[redacted value]')
      .slice(0, 400)

    console.error('[api] Unhandled request error', {
      name: error instanceof Error ? error.name : 'UnknownError',
      code: typeof details?.code === 'string' ? details.code.slice(0, 100) : undefined,
      message: safeMessage,
    })
  }

  const safeError = error instanceof ApiError
    ? error
    : new ApiError('internal', 'The account service could not complete this request. Try again, and contact support if it continues.')

  return Response.json(
    { error: { code: safeError.code, message: safeError.message } },
    { status: safeError.status, headers: { 'Cache-Control': 'no-store' } },
  )
}

export function successResponse(data: unknown): Response {
  return Response.json(data, { headers: { 'Cache-Control': 'no-store' } })
}
