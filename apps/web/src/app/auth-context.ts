import { createContext } from 'react'
import type { User } from 'firebase/auth'

export interface Claims {
  tenantId: string | null
  role: string | null
}

export interface AuthContextValue {
  configured: boolean
  loading: boolean
  user: User | null
  claims: Claims
  signIn(email: string, password: string): Promise<void>
  signInWithGoogle(): Promise<void>
  register(email: string, password: string, displayName: string): Promise<void>
  sendVerification(): Promise<void>
  sendReset(email: string): Promise<void>
  completeOnboarding(payload: unknown): Promise<string>
  refreshIdentity(): Promise<Claims>
  logOut(): Promise<void>
  errorMessage(error: unknown): string
}

export const AuthContext = createContext<AuthContextValue | null>(null)
