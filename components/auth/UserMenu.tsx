'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import { SignInButton } from './SignInButton'

function initials(name: string | null | undefined, email: string | undefined): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/)
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'U'
  }
  return (email?.[0] ?? 'U').toUpperCase()
}

export function UserMenu() {
  const { isLoaded, isSignedIn, user } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [])

  // Avoid layout shift / hydration flash: render nothing until Clerk loads.
  if (!isLoaded) return <div className="um-skel" aria-hidden />
  if (!isSignedIn) return <SignInButton />

  const email = user.primaryEmailAddress?.emailAddress
  const name = user.fullName
  const img = user.hasImage ? user.imageUrl : null

  async function handleSignOut() {
    setOpen(false)
    await signOut()
    router.push('/')
  }

  return (
    <div className="um" ref={ref}>
      <button type="button" className="um-trigger" onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open}>
        {img
          ? <img src={img} alt="" className="um-avatar" />
          : <span className="um-avatar um-avatar-fallback">{initials(name, email)}</span>}
      </button>
      {open && (
        <div className="um-dropdown" role="menu">
          <div className="um-head">
            <div className="um-name">{name || 'Your account'}</div>
            <div className="um-email">{email}</div>
          </div>
          <Link href="/account" className="um-item" role="menuitem" onClick={() => setOpen(false)}>Profile</Link>
          <Link href="/account?tab=sessions" className="um-item" role="menuitem" onClick={() => setOpen(false)}>Sessions</Link>
          <Link href="/account?tab=activity" className="um-item" role="menuitem" onClick={() => setOpen(false)}>Activity</Link>
          <Link href="/account?tab=danger" className="um-item" role="menuitem" onClick={() => setOpen(false)}>Danger Zone</Link>
          <button type="button" className="um-item um-signout" role="menuitem" onClick={handleSignOut}>Sign out</button>
        </div>
      )}
    </div>
  )
}
