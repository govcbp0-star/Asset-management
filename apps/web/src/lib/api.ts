import { firebaseAuth } from './firebase'

interface ApiErrorPayload {
  error?: {
    message?: unknown
  }
}

export async function postApi<T>(path: string, payload: unknown): Promise<T> {
  const user = firebaseAuth?.currentUser
  if (!user) throw new Error('Sign in to continue.')

  const idToken = await user.getIdToken()
  let response: Response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error('The account service could not be reached. Check your connection and try again.')
  }

  const result: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = (result as ApiErrorPayload | null)?.error?.message
    throw new Error(typeof message === 'string'
      ? message
      : 'The account service could not complete this request. Try again, and contact support if it continues.')
  }

  return result as T
}

export async function postPublicApi<T>(path: string, payload: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error('The enquiry service could not be reached. Check your connection and try again.')
  }

  const result: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = (result as ApiErrorPayload | null)?.error?.message
    throw new Error(typeof message === 'string' ? message : 'The enquiry could not be sent. Please try again.')
  }
  return result as T
}

export async function postApiForm<T>(path: string, formData: FormData): Promise<T> {
  const user = firebaseAuth?.currentUser
  if (!user) throw new Error('Sign in to continue.')

  let response: Response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      body: formData,
    })
  } catch {
    throw new Error('The account service could not be reached. Check your connection and try again.')
  }

  const result: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = (result as ApiErrorPayload | null)?.error?.message
    throw new Error(typeof message === 'string'
      ? message
      : 'The account service could not complete this request. Try again, and contact support if it continues.')
  }
  return result as T
}

export async function postApiBlob(path: string): Promise<Blob> {
  const user = firebaseAuth?.currentUser
  if (!user) throw new Error('Sign in to continue.')

  let response: Response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await user.getIdToken()}` },
    })
  } catch {
    throw new Error('The account service could not be reached. Check your connection and try again.')
  }

  if (!response.ok) {
    const result: unknown = await response.json().catch(() => null)
    const message = (result as ApiErrorPayload | null)?.error?.message
    throw new Error(typeof message === 'string'
      ? message
      : 'The account service could not complete this request. Try again, and contact support if it continues.')
  }
  return response.blob()
}
