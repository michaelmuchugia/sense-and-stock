'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'

interface DeleteAccountDialogProps {
  email: string
}

export function DeleteAccountDialog({ email }: DeleteAccountDialogProps) {
  const { signOut } = useClerk()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const matches = typed.trim().toLowerCase() === email.toLowerCase()

  async function handleDelete() {
    if (!matches || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirmEmail: typed.trim() }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to delete')
      // Account is gone — sign out locally and go home.
      await signOut()
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account')
      setBusy(false)
    }
  }

  return (
    <div className="sv-box" style={{ maxWidth: 560, border: '1px solid rgba(255,77,106,.22)' }}>
      <div className="sv-box-ttl" style={{ color: '#ff7a8e' }}>Delete account</div>
      <p style={{ fontSize: 13, color: 'var(--txd)', lineHeight: 1.65, marginBottom: 14 }}>
        Permanently deletes your account, watchlist, and activity history. This cannot be undone.
      </p>

      {!open ? (
        <button type="button" className="bg" style={{ borderColor: 'rgba(255,77,106,.3)', color: '#ff7a8e' }} onClick={() => setOpen(true)}>
          Delete my account
        </button>
      ) : (
        <div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="confirm">Type <strong>{email}</strong> to confirm</label>
            <input id="confirm" className="auth-input" value={typed} onChange={e => setTyped(e.target.value)} placeholder={email} autoComplete="off" />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <div style={{ display: 'flex', gap: 9 }}>
            <button
              type="button"
              className="bp"
              style={{ background: matches ? 'var(--r)' : 'var(--bg4)', color: matches ? '#fff' : 'var(--txdd)', cursor: matches ? 'pointer' : 'not-allowed' }}
              disabled={!matches || busy}
              onClick={handleDelete}
            >
              {busy ? 'Deleting…' : 'Permanently delete'}
            </button>
            <button type="button" className="bg" onClick={() => { setOpen(false); setTyped(''); setError(null) }} disabled={busy}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
