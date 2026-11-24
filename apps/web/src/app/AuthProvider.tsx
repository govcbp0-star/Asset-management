import {
  useCallback, useEffect, useMemo, useRef, useState,
  type PropsWithChildren,
} from 'react'
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  getIdTokenResult,
  onIdTokenChanged,
  reauthenticateWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from '@firebase/auth'
import { z } from 'zod'
import { friendlyError } from '../lib/auth-errors'
import { postApi, postApiBlob, postApiForm } from '../lib/api'
import { firebaseAuth, firebaseConfigured } from '../lib/firebase'
import { AuthContext, type AuthContextValue, type Claims } from './auth-context'

const emptyClaims: Claims = { tenantId: null, role: null }

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null)
  const [profilePhotoVersion, setProfilePhotoVersion] = useState(0)
  const [claims, setClaims] = useState<Claims>(emptyClaims)
  const [loading, setLoading] = useState(firebaseConfigured)
  const activeUserId = useRef<string | null>(null)

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

  const userId = user?.uid ?? null
  useEffect(() => {
    let active = true
    let objectUrl: string | null = null
    if (!userId) return () => { active = false }

    void postApiBlob('/api/getProfilePhoto').then((blob) => {
      if (!active) return
      objectUrl = URL.createObjectURL(blob)
      setProfilePhotoUrl(objectUrl)
    }).catch(() => {
      if (active) setProfilePhotoUrl(null)
    })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [userId, profilePhotoVersion])

  useEffect(() => {
    if (!firebaseAuth) return
    let mounted = true
    const unsubscribe = onIdTokenChanged(firebaseAuth, async (nextUser) => {
      const nextUserId = nextUser?.uid ?? null
      if (activeUserId.current !== nextUserId) {
        activeUserId.current = nextUserId
        setProfilePhotoUrl(null)
      }
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

  const updateAccountName = useCallback(async (displayName: string) => {
    const currentUser = firebaseAuth?.currentUser
    const normalizedName = displayName.trim()
    if (!currentUser) throw new Error('Sign in to continue.')
    if (normalizedName.length < 2 || normalizedName.length > 80) {
      throw new Error('Enter an account name between 2 and 80 characters.')
    }
    await updateProfile(currentUser, { displayName: normalizedName })
    await currentUser.reload()
    setUser(currentUser)
  }, [])

  const changePassword = useCallback(async (currentPassword: string | null, newPassword: string) => {
    const currentUser = firebaseAuth?.currentUser
    if (!currentUser?.email) throw new Error('Sign in with an email account to change your password.')
    const providerIds = currentUser.providerData.map((provider) => provider.providerId)
    if (providerIds.includes('password')) {
      if (!currentPassword) throw new Error('Enter your current password to continue.')
      await reauthenticateWithCredential(
        currentUser,
        EmailAuthProvider.credential(currentUser.email, currentPassword),
      )
    } else if (providerIds.includes('google.com')) {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await reauthenticateWithPopup(currentUser, provider)
    } else {
      throw new Error('This sign-in method cannot confirm password changes here. Use account recovery to set a password.')
    }
    await updatePassword(currentUser, newPassword)
  }, [])

  const uploadProfilePhoto = useCallback(async (file: File) => {
    if (!firebaseAuth?.currentUser) throw new Error('Sign in to continue.')
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!supportedTypes.includes(file.type) || file.size < 1 || file.size > 1_500_000) {
      throw new Error('Choose a JPG, PNG, or WebP image smaller than 1.5 MB.')
    }
    const formData = new FormData()
    formData.append('photo', file)
    await postApiForm('/api/updateProfilePhoto', formData)
    setProfilePhotoUrl(null)
    setProfilePhotoVersion((version) => version + 1)
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
    profilePhotoUrl,
    claims,
    signIn,
    signInWithGoogle,
    register,
    sendVerification,
    sendReset,
    updateAccountName,
    changePassword,
    uploadProfilePhoto,
    completeOnboarding,
    refreshIdentity,
    logOut,
    errorMessage: friendlyError,
  }), [loading, user, profilePhotoUrl, claims, signIn, signInWithGoogle, register, sendVerification, sendReset, updateAccountName, changePassword, uploadProfilePhoto, completeOnboarding, refreshIdentity, logOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
