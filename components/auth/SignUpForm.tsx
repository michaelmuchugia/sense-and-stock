'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSignUp } from '@clerk/nextjs/legacy'
import { GoogleIcon } from './GoogleIcon'

function clerkErrorMessage(err: unknown): string {
  const e = err as { errors?: Array<{ longMessage?: string; message?: string }> }
  const first = e?.errors?.[0]
  return first?.longMessage ?? first?.message ?? 'Something went wrong. Please try again.'
}

export function SignUpForm() {
  const { isLoaded, signUp, setActive } = useSignUp()
  const router = useRouter()
  const [step, setStep] = useState<'form' | 'verify'>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isLoaded || submitting) return
    setError(null)
    setSubmitting(true)
    try {
      await signUp.create({ emailAddress: email.trim(), password })
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setStep('verify')
    } catch (err) {
      setError(clerkErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!isLoaded || submitting) return
    setError(null)
    setSubmitting(true)
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: code.trim() })
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        router.push('/account')
      } else {
        setError('Verification incomplete. Please re-check the code.')
      }
    } catch (err) {
      setError(clerkErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogle() {
    if (!isLoaded || googleLoading) return
    setError(null)
    setGoogleLoading(true)
    try {
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/account',
      })
    } catch (err) {
      setError(clerkErrorMessage(err))
      setGoogleLoading(false)
    }
  }

  if (step === 'verify') {
    return (
      <>
        {error && <div className="auth-error" role="alert">{error}</div>}
        <p className="auth-sub">We sent a 6-digit code to <strong>{email}</strong>. Enter it below to finish.</p>
        <form onSubmit={handleVerify}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="code">Verification code</label>
            <input
              id="code"
              className="auth-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="123456"
              required
            />
          </div>
          <button type="submit" className="auth-submit" disabled={submitting || !isLoaded}>
            {submitting ? 'Verifying...' : 'Verify email'}
          </button>
        </form>
        <div className="auth-switch">
          Wrong email?{' '}
          <button
            type="button"
            onClick={() => { setStep('form'); setCode(''); setError(null) }}
            style={{ background: 'none', border: 'none', color: 'var(--g)', cursor: 'pointer', fontFamily: 'var(--fb)', fontSize: 12.5 }}
          >
            Go back
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      {error && <div className="auth-error" role="alert">{error}</div>}

      <button type="button" className="auth-google" onClick={handleGoogle} disabled={googleLoading || !isLoaded}>
        <GoogleIcon />
        {googleLoading ? 'Redirecting...' : 'Continue with Google'}
      </button>

      <div className="auth-divider">or</div>

      <form onSubmit={handleSubmit}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="email">Email</label>
          <input
            id="email"
            className="auth-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="auth-field">
          <label className="auth-label" htmlFor="password">Password</label>
          <input
            id="password"
            className="auth-input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
          />
          <div className="auth-hint">Use 8+ characters with a mix of letters and numbers.</div>
        </div>
        <div id="clerk-captcha" />
        <button type="submit" className="auth-submit" disabled={submitting || !isLoaded}>
          {submitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <div className="auth-switch">
        Already have an account? <Link href="/sign-in">Sign in</Link>
      </div>
    </>
  )
}
