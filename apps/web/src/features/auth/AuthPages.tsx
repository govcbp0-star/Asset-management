import { useEffect, useState, type ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { RoleHomePath, type UserRole } from '@pwarpi/shared'
import { z } from 'zod'
import { useAuth } from '../../app/useAuth'
import { Brand } from '../../components/Brand'
import { Notice } from '../../components/Notice'
import { firebaseAuth } from '../../lib/firebase'

function accountPath(emailVerified: boolean, claims: { tenantId: string | null; role: string | null }) {
  if (!claims.tenantId) return '/register'
  if (!emailVerified) return '/auth/verify-email'
  return claims.role && claims.role in RoleHomePath ? RoleHomePath[claims.role as UserRole] : '/access-denied'
}

function AuthFrame({ eyebrow, title, description, children }: {
  eyebrow: string; title: string; description: string; children: ReactNode
}) {
  return <main className="auth-frame"><section className="auth-panel"><Brand /><p className="eyebrow auth-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="auth-description">{description}</p>{children}<p className="auth-back"><Link to="/"><ArrowLeft size={14} /> Back to Aurelius Registry</Link></p></section><aside className="auth-aside"><div className="auth-aside-inner"><span className="auth-aside-index">PRIVATE CLIENT ACCESS · 01</span><div className="auth-quote-mark">“</div><p>Your portfolio deserves a record that is as considered as the decisions behind it.</p><div className="auth-aside-rule" /><span>PRIVATE ASSET RECORDKEEPING</span></div></aside></main>
}

function FirebaseSetupNotice() {
  return <Notice tone="info">Firebase is not configured yet. Add your Firebase Web app settings to the repository root <code>.env.local</code>, then restart the development server.</Notice>
}

function GoogleSignInButton({ busy, configured, onClick }: { busy: boolean; configured: boolean; onClick: () => void }) {
  return <button className="button button-outline button-full google-signin" type="button" onClick={onClick} disabled={busy || !configured}>
    <svg aria-hidden="true" viewBox="0 0 48 48" width="18" height="18">
      <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.7h11c-.5 2.5-2 4.6-4.2 6v5h6.8c4-3.7 6-9 6-14.6z" />
      <path fill="#34A853" d="M24 44c5.5 0 10.2-1.8 13.6-4.9l-6.8-5c-1.8 1.2-4 1.9-6.8 1.9-5.2 0-9.6-3.5-11.2-8.3H5.7v5.2C9.1 39.5 16 44 24 44z" />
      <path fill="#FBBC05" d="M12.8 27.7a12 12 0 0 1 0-7.4v-5.2H5.7a20 20 0 0 0 0 17.8z" />
      <path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 6 29.4 4 24 4 16 4 9.1 8.5 5.7 15.1l7.1 5.2c1.6-4.8 6-8.2 11.2-8.2z" />
    </svg>
    Continue with Google
  </button>
}

const LoginSchema = z.object({ email: z.email(), password: z.string().min(1, 'Enter your password.') })
type LoginFields = z.infer<typeof LoginSchema>

export function LoginPage() {
  const { configured, signIn, signInWithGoogle, refreshIdentity, errorMessage, user, claims } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFields>({ resolver: zodResolver(LoginSchema) })

  if (user) return <Navigate to={accountPath(user.emailVerified, claims)} replace />

  async function submit(values: LoginFields) {
    setBusy(true); setError('')
    try {
      await signIn(values.email, values.password)
      navigate(accountPath(firebaseAuth?.currentUser?.emailVerified ?? false, await refreshIdentity()))
    } catch (cause) { setError(errorMessage(cause)) } finally { setBusy(false) }
  }

  async function submitGoogle() {
    setBusy(true); setError('')
    try {
      await signInWithGoogle()
      navigate(accountPath(firebaseAuth?.currentUser?.emailVerified ?? false, await refreshIdentity()))
    } catch (cause) { setError(errorMessage(cause)) } finally { setBusy(false) }
  }

  return <AuthFrame eyebrow="CLIENT & STAFF PORTAL" title="Welcome back." description="Sign in to your private account.">
    {!configured && <FirebaseSetupNotice />}
    {error && <Notice tone="error">{error}</Notice>}
    <form className="auth-form" onSubmit={handleSubmit(submit)}>
      <GoogleSignInButton busy={busy} configured={configured} onClick={submitGoogle} />
      <div className="auth-divider"><span>or sign in with email</span></div>
      <label htmlFor="login-email">Email address</label><div className="input-icon"><Mail size={16} /><input id="login-email" type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} /></div>{errors.email && <small className="field-error">{errors.email.message}</small>}
      <div className="form-label-row"><label htmlFor="login-password">Password</label><Link to="/reset-password">Forgot password?</Link></div><div className="input-icon"><LockKeyhole size={16} /><input id="login-password" type={passwordVisible ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" {...register('password')} /><button type="button" className="reveal-button" onClick={() => setPasswordVisible((visible) => !visible)} aria-label={passwordVisible ? 'Hide password' : 'Show password'}>{passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>{errors.password && <small className="field-error">{errors.password.message}</small>}
      <button className="button button-dark button-full" type="submit" disabled={busy || !configured}>{busy ? 'Signing in…' : 'Sign in securely'} <ArrowRight size={15} /></button>
      <p className="auth-switch">New to Aurelius? <Link to="/register">Create an account</Link></p>
    </form>
  </AuthFrame>
}

const RegisterSchema = z.object({
  displayName: z.string().trim().max(80).optional(),
  email: z.string().optional(),
  password: z.string().optional(),
  tenantType: z.enum(['individual', 'company', 'family_office']),
  acceptedNotices: z.boolean().refine((value) => value, 'Acknowledge the development notices to continue.'),
})
type RegisterFields = z.infer<typeof RegisterSchema>

export function RegisterPage() {
  const { configured, register: createAccount, signInWithGoogle, completeOnboarding, sendVerification, refreshIdentity, errorMessage, user, claims } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { register, handleSubmit, getValues, setValue, setError: setFieldError, formState: { errors } } = useForm<RegisterFields>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { tenantType: 'individual', acceptedNotices: false },
  })
  const signedInUser = user ?? firebaseAuth?.currentUser ?? null

  useEffect(() => {
    if (!user) return
    if (!getValues('displayName') && user.displayName) setValue('displayName', user.displayName)
    if (!getValues('email') && user.email) setValue('email', user.email)
  }, [user, getValues, setValue])

  if (signedInUser && claims.tenantId) return <Navigate to={accountPath(signedInUser.emailVerified, claims)} replace />

  async function submit(values: RegisterFields) {
    setBusy(true); setError('')
    try {
      let currentUser = firebaseAuth?.currentUser
      let displayName = currentUser?.displayName?.trim() || values.displayName?.trim() || ''
      if (!displayName || displayName.length < 2) {
        setFieldError('displayName', { type: 'validate', message: 'Enter your name.' })
        return
      }
      if (!currentUser) {
        const email = values.email?.trim() ?? ''
        if (!z.email().safeParse(email).success) {
          setFieldError('email', { type: 'validate', message: 'Enter a valid email address.' })
          return
        }
        if (!values.password || values.password.length < 8) {
          setFieldError('password', { type: 'validate', message: 'Use at least 8 characters.' })
          return
        }
        await createAccount(email, values.password, displayName)
        currentUser = firebaseAuth?.currentUser
      }
      if (!currentUser) throw new Error('Your sign-in could not be started. Try again.')
      displayName = currentUser.displayName?.trim() || displayName
      await completeOnboarding({
        displayName,
        tenantType: values.tenantType,
        acceptedNotices: values.acceptedNotices,
        noticeVersion: 'dev-v1',
        privacyNoticeVersion: 'dev-v1',
      })
      const nextClaims = await refreshIdentity()
      if (firebaseAuth?.currentUser?.emailVerified) {
        navigate(accountPath(true, nextClaims), { replace: true })
      } else {
        await sendVerification()
        navigate('/auth/verify-email', { replace: true })
      }
    } catch (cause) { setError(errorMessage(cause)) } finally { setBusy(false) }
  }

  async function submitGoogle() {
    setBusy(true); setError('')
    try {
      await signInWithGoogle()
    } catch (cause) { setError(errorMessage(cause)) } finally { setBusy(false) }
  }

  return <AuthFrame eyebrow="PRIVATE CLIENT ACCESS" title={signedInUser ? 'Finish creating your account.' : 'Begin with a clear record.'} description={signedInUser ? 'Choose your account type to finish setup. We will send a verification link after your account is ready.' : 'Create your account and choose its type. We will send a verification link after your account is set up.'}>
    {!configured && <FirebaseSetupNotice />}{error && <Notice tone="error">{error}</Notice>}
    <form className="auth-form" onSubmit={handleSubmit(submit)}>
      {!signedInUser && <><GoogleSignInButton busy={busy} configured={configured} onClick={submitGoogle} /><div className="auth-divider"><span>or sign up with email</span></div></>}
      {signedInUser && <div className="account-summary"><strong>{signedInUser.displayName || 'Your account'}</strong><span>{signedInUser.email}</span></div>}
      {(!signedInUser || !signedInUser.displayName) && <><label htmlFor="register-name">Your name</label><input id="register-name" autoComplete="name" placeholder="Full name" {...register('displayName')} />{errors.displayName && <small className="field-error">{errors.displayName.message}</small>}</>}
      {!signedInUser && <><label htmlFor="register-email">Email address</label><input id="register-email" type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />{errors.email && <small className="field-error">{errors.email.message}</small>}
      <label htmlFor="register-password">Password</label><input id="register-password" type="password" autoComplete="new-password" placeholder="At least 8 characters" {...register('password')} />{errors.password && <small className="field-error">{errors.password.message}</small>}</>}
      <label htmlFor="register-account-type">Account type</label><select id="register-account-type" {...register('tenantType')}><option value="individual">Individual</option><option value="company">Company</option><option value="family_office">Family office</option></select>
      <Notice tone="info">This development build does not have final production service terms. Do not add real identity documents or financial information.</Notice>
      <label className="check-row"><input type="checkbox" {...register('acceptedNotices')} /><span>I acknowledge the development privacy and service notices. This is not a production service agreement.</span></label>{errors.acceptedNotices && <small className="field-error">Please acknowledge the development notices to continue.</small>}
      <p className="form-footnote"><LockKeyhole size={14} /> Your sign-in uses Firebase Authentication. Sensitive portfolio data is not collected on this page.</p>
      <button className="button button-dark button-full" disabled={busy || !configured}>{busy ? 'Creating account…' : 'Create account'} <ArrowRight size={15} /></button>
      <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
    </form>
  </AuthFrame>
}

export function VerifyEmailPage() {
  const { user, claims, sendVerification, refreshIdentity, errorMessage, logOut } = useAuth()
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    let checking = false
    const checkVerification = async () => {
      if (checking || !firebaseAuth?.currentUser) return
      checking = true
      try {
        const nextClaims = await refreshIdentity()
        if (active && firebaseAuth?.currentUser?.emailVerified) navigate(accountPath(true, nextClaims), { replace: true })
      } catch { /* Keep checking while the account owner verifies their email. */ }
      finally { checking = false }
    }
    const interval = window.setInterval(() => { void checkVerification() }, 5000)
    window.addEventListener('focus', checkVerification)
    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('focus', checkVerification)
    }
  }, [navigate, refreshIdentity])

  if (!user) return <Navigate to="/login" replace />
  if (user.emailVerified) return <Navigate to={accountPath(true, claims)} replace />

  async function resend() {
    setBusy(true); setError(''); setMessage('')
    try { await sendVerification(); setMessage('A fresh verification email has been sent.') }
    catch (cause) { setError(errorMessage(cause)) } finally { setBusy(false) }
  }
  return <AuthFrame eyebrow="VERIFY YOUR EMAIL" title="One more step." description={`Your account is ready. Verify ${user.email ?? 'your email address'}, then return here to continue to your dashboard.`}>
    {message && <Notice tone="success">{message}</Notice>}{error && <Notice tone="error">{error}</Notice>}
    <div className="verification-symbol"><Mail size={22} /></div><div className="auth-form"><p className="verification-wait">This page will continue to your dashboard automatically after you verify your email.</p><button className="plain-button" onClick={resend} disabled={busy}>Resend verification email</button><button className="plain-button" onClick={async () => { await logOut(); navigate('/login') }}>Sign out</button></div>
  </AuthFrame>
}

export function OnboardingPage() { return <Navigate to="/register" replace /> }

const ResetSchema = z.object({ email: z.email() })
type ResetFields = z.infer<typeof ResetSchema>
export function ResetPasswordPage() {
  const { configured, sendReset, errorMessage } = useAuth()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<ResetFields>({ resolver: zodResolver(ResetSchema) })
  async function submit(values: ResetFields) {
    setBusy(true); setError(''); setMessage('')
    try { await sendReset(values.email); setMessage('If an account matches that email, password-reset instructions have been sent.') }
    catch (cause) { setError(errorMessage(cause)) } finally { setBusy(false) }
  }
  return <AuthFrame eyebrow="ACCOUNT RECOVERY" title="Reset your password." description="We will send secure password-reset instructions to your account email.">
    {!configured && <FirebaseSetupNotice />}{message && <Notice tone="success">{message}</Notice>}{error && <Notice tone="error">{error}</Notice>}
    <form className="auth-form" onSubmit={handleSubmit(submit)}><label htmlFor="reset-email">Email address</label><input id="reset-email" type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />{errors.email && <small className="field-error">{errors.email.message}</small>}<button className="button button-dark button-full" disabled={busy || !configured}>{busy ? 'Sending…' : 'Send reset instructions'} <ArrowRight size={15} /></button></form>
  </AuthFrame>
}
