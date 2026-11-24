import {
  useCallback, useEffect, useMemo, useState,
  type PropsWithChildren,
} from 'react'
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  getIdTokenResult,
  onIdTokenChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from '@firebase/auth'
import { z } from 'zod'
import { friendlyError } from '../lib/auth-errors'
import { postApi } from '../lib/api'
import { firebaseAuth, firebaseConfigured } from '../lib/firebase'
import { AuthContext, type AuthContextValue, type Claims } from './auth-context'

const emptyClaims: Claims = { tenantId: null, role: null }

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [claims, setClaims] = useState<Claims>(emptyClaims)
  const [loading, setLoading] = useState(firebaseConfigured)

  const refreshIdentity = useCallback(async (): Promise<Claims> => {
    if (!firebaseAuth?.currentUser) {
      setUser(null)
      setClaims(emptyClaims)
      return emptyClaims
    }
    const current = firebaseAuth.currentUser
    await current.reload()
    const token = await getIdTokenResult(current, true)
    const next = {
      tenantId: typeof token.claims.tenantId === 'string' ? token.claims.tenantId : null,
      role: typeof token.claims.role === 'string' ? token.claims.role : null,
    }
    setUser(firebaseAuth.currentUser)
    setClaims(next)
    return next
  }, [])

  useEffect(() => {
    if (!firebaseAuth) return
    let mounted = true
    const unsubscribe = onIdTokenChanged(firebaseAuth, async (nextUser) => {
      if (!nextUser) {
        if (mounted) {
          setUser(null)
          setClaims(emptyClaims)
          setLoading(false)
        }
        return
      }
      try {
        const token = await getIdTokenResult(nextUser)
        if (mounted) {
          setUser(nextUser)
          setClaims({
            tenantId: typeof token.claims.tenantId === 'string' ? token.claims.tenantId : null,
            role: typeof token.claims.role === 'string' ? token.claims.role : null,
          })
        }
      } catch {
        if (mounted) { setUser(nextUser); setClaims(emptyClaims) }
      } finally {
        if (mounted) setLoading(false)
      }
    })
    return () => { mounted = false; unsubscribe() }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!firebaseAuth) throw new Error('Firebase is not configured.')
    await signInWithEmailAndPassword(firebaseAuth, email, password)
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!firebaseAuth) throw new Error('Firebase is not configured.')
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    await signInWithPopup(firebaseAuth, provider)
    await refreshIdentity()
  }, [refreshIdentity])

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    if (!firebaseAuth) throw new Error('Firebase is not configured.')
    const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password)
    await updateProfile(credential.user, { displayName })
    await refreshIdentity()
  }, [refreshIdentity])

  const sendVerification = useCallback(async () => {
    if (!firebaseAuth?.currentUser) throw new Error('Sign in to request a verification email.')
    await sendEmailVerification(firebaseAuth.currentUser)
  }, [])

  const sendReset = useCallback(async (email: string) => {
    if (!firebaseAuth) throw new Error('Firebase is not configured.')
    await sendPasswordResetEmail(firebaseAuth, email)
  }, [])

  const completeOnboarding = useCallback(async (payload: unknown) => {
    const parsed = z.object({
      tenantId: z.string(),
      role: z.string(),
    }).parse(await postApi<unknown>('/api/createClientTenant', payload))
    return parsed.tenantId
  }, [])

  const logOut = useCallback(async () => {
    if (firebaseAuth) await signOut(firebaseAuth)
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    configured: firebaseConfigured,
    loading,
    user,
    claims,
    signIn,
    signInWithGoogle,
    register,
    sendVerification,
    sendReset,
    completeOnboarding,
    refreshIdentity,
    logOut,
    errorMessage: friendlyError,
  }), [loading, user, claims, signIn, signInWithGoogle, register, sendVerification, sendReset, completeOnboarding, refreshIdentity, logOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
