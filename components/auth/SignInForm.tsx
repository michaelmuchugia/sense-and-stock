'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSignIn } from '@clerk/nextjs/legacy'
import { GoogleIcon } from './GoogleIcon'

function clerkErrorMessage(err: unknown): string {
  // Clerk errors carry an `errors` array with human-readable `longMessage`.
  const e = err as { errors?: Array<{ longMessage?: string; message?: string }> }
  const first = e?.errors?.[0]
  return first?.longMessage ?? first?.message ?? 'Something went wrong. Please try again.'
}

export function SignInForm() {
  const { isLoaded, signIn, setActive } = useSignIn()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault()
    if (!isLoaded || submitting) return
    setError(null)
    setSubmitting(true)
    try {
      const result = await signIn.create({ identifier: email.trim(), password })
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        router.push('/account')
      } else {
        // e.g. needs_second_factor — out of scope for Phase 4 UI
        setError('Additional verification is required. Please use the email link or contact support.')
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
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/account',
      })
    } catch (err) {
      setError(clerkErrorMessage(err))
      setGoogleLoading(false)
    }
  }

  return (
    <>
      {error && <div className="auth-error" role="alert">{error}</div>}

      <button type="button" className="auth-google" onClick={handleGoogle} disabled={googleLoading || !isLoaded}>
        <GoogleIcon />
        {googleLoading ? 'Redirecting...' : 'Continue with Google'}
      </button>

      <div className="auth-divider">or</div>

      <form onSubmit={handleEmailSignIn}>
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
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Your password"
            required
          />
        </div>
        {/* Clerk's CAPTCHA mounts here when needed */}
        <div id="clerk-captcha" />
        <button type="submit" className="auth-submit" disabled={submitting || !isLoaded}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div className="auth-switch">
        New to Sense&Stock? <Link href="/sign-up">Create an account</Link>
      </div>
    </>
  )
}
