import type { Metadata } from 'next'
import { SignInForm } from '@/components/auth/SignInForm'

export const metadata: Metadata = {
  title: 'Sign in to Sense&Stock',
}

export default function SignInPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo"><img src="/ss-logo-dark.png" alt="Sense and Stock" className="auth-logo-img" width={183} height={54} /></div>
        <h1>Welcome back</h1>
        <div className="auth-sub">Sign in to track analyst signals and your watchlist.</div>
        <SignInForm />
      </div>
    </div>
  )
}
