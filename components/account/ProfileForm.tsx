'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'

interface ProfileFormProps {
  initialName: string
  initialPhone: string
  email: string
}

export function ProfileForm({ initialName, initialPhone, email }: ProfileFormProps) {
  const { user } = useUser()
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')
    setError(null)
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed')
      // Reload Clerk user so the navbar name/avatar refresh without a full reload.
      await user?.reload()
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2500)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  return (
    <div className="sv-box" style={{ maxWidth: 480 }}>
      <div className="sv-box-ttl">Profile</div>
      <form onSubmit={handleSubmit}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="name">Display name</label>
          <input id="name" className="auth-input" value={name} onChange={e => setName(e.target.value)} maxLength={80} placeholder="Your name" />
        </div>
        <div className="auth-field">
          <label className="auth-label" htmlFor="email">Email</label>
          <input id="email" className="auth-input" value={email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
          <div className="auth-hint">Email is managed by your sign-in provider.</div>
        </div>
        <div className="auth-field">
          <label className="auth-label" htmlFor="phone">Phone (optional)</label>
          <input id="phone" className="auth-input" value={phone} onChange={e => setPhone(e.target.value)} maxLength={30} placeholder="+254 7XX XXX XXX" inputMode="tel" />
          <div className="auth-hint">Used for SMS signal alerts (coming soon). We never share it.</div>
        </div>
        {error && <div className="auth-error">{error}</div>}
        <button type="submit" className="auth-submit" disabled={status === 'saving'} style={{ width: 'auto', padding: '10px 22px' }}>
          {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
