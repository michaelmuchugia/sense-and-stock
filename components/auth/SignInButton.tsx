'use client'

import Link from 'next/link'

export function SignInButton() {
  return (
    <Link href="/sign-in" className="ab" style={{ textDecoration: 'none' }}>
      Sign in
    </Link>
  )
}
