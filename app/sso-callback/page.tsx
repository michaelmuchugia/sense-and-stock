'use client'

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'

/**
 * Lands here mid-OAuth. Clerk completes the handshake and redirects to the
 * `redirectUrlComplete` passed in `authenticateWithRedirect` (we use /account).
 */
export default function SSOCallbackPage() {
  return (
    <>
      <div className="auth-callback">
        <div className="auth-spinner" />
        <div>Completing sign-in...</div>
      </div>
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/account"
        signUpForceRedirectUrl="/account"
      />
    </>
  )
}
