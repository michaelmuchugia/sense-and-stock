import type { Metadata } from 'next'
import { SignUpForm } from '@/components/auth/SignUpForm'

export const metadata: Metadata = {
  title: 'Create your Sense&Stock account',
}

export default function SignUpPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo"><img src="/ss-logo-dark.png" alt="Sense and Stock" className="auth-logo-img" width={183} height={54} /></div>
        <h1>Create your account</h1>
        <div className="auth-sub">Join Sense&Stock to save stocks and follow analyst performance.</div>
        <SignUpForm />
      </div>
    </div>
  )
}
