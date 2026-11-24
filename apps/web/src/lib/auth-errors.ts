import { FirebaseError } from '@firebase/app'

const messages: Record<string, string> = {
  'auth/invalid-credential': 'The email or password is incorrect.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled for this Firebase project. Check Firebase Authentication settings.',
  'auth/multi-factor-auth-required': 'This Firebase project still requires a second sign-in step. Turn off multi-factor enforcement and remove any enrolled factors to use password-only sign-in.',
  'auth/unauthorized-domain': 'This website domain is not authorized for Firebase sign-in.',
  'auth/popup-closed-by-user': 'The Google sign-in window was closed before sign-in finished.',
  'auth/popup-blocked': 'Your browser blocked the Google sign-in window. Allow popups and try again.',
  'auth/account-exists-with-different-credential': 'An account with this email already uses another sign-in method. Sign in with that method first.',
  'auth/email-already-in-use': 'An account already uses this email address.',
  'auth/weak-password': 'Choose a stronger password with at least 8 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/network-request-failed': 'The service could not be reached. Check your connection and try again.',
  'auth/invalid-phone-number': 'Enter a valid phone number with its country code.',
  'auth/invalid-verification-code': 'That code is not valid. Check it and try again.',
  'auth/code-expired': 'That code has expired. Request a new one.',
}

export function friendlyError(error: unknown): string {
  if (error instanceof FirebaseError && messages[error.code]) return messages[error.code]
  if (error instanceof Error && error.message) return error.message
  return 'The request could not be completed. Please try again.'
}
