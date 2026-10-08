'use client'

import { useEffect, useState } from 'react'
import { useUser, useSession } from '@clerk/nextjs'

// Structural shape of the session objects returned by user.getSessions().
// Typed locally so we don't depend on @clerk/types directly.
interface SessionActivity {
  browserName?: string
  deviceType?: string
  isMobile?: boolean
  ipAddress?: string
  city?: string
  country?: string
}
interface SessionWithActivities {
  id: string
  latestActivity?: SessionActivity | null
  revoke: () => Promise<unknown>
}

function deviceLabel(a: SessionActivity | null | undefined): string {
  if (!a) return 'Active session'
  const browser = a.browserName ?? 'Browser'
  const device = a.isMobile ? 'Mobile' : (a.deviceType ?? 'Desktop')
  return `${browser} on ${device}`
}

function locationLabel(a: SessionActivity | null | undefined): string {
  if (!a) return ''
  const loc = [a.city, a.country].filter(Boolean).join(', ')
  const ip = a.ipAddress ? maskIp(a.ipAddress) : ''
  return [loc, ip].filter(Boolean).join(' · ')
}

function maskIp(ip: string): string {
  if (ip.includes('.')) {
    const parts = ip.split('.')
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.×.×`
  }
  return ip.slice(0, 6) + '…'
}

export function SessionsClient() {
  const { user, isLoaded } = useUser()
  const { session: current } = useSession()
  const [sessions, setSessions] = useState<SessionWithActivities[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function load() {
    if (!user) return
    const list = (await user.getSessions()) as unknown as SessionWithActivities[]
    setSessions(list)
  }

  useEffect(() => {
    if (isLoaded && user) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user?.id])

  if (!isLoaded || sessions === null) {
    return <div className="sv-box"><div style={{ color: 'var(--txd)' }}>Loading sessions…</div></div>
  }

  return (
    <div className="sv-box" style={{ maxWidth: 560 }}>
      <div className="sv-box-ttl">Active sessions</div>
      {sessions.map(s => {
        const isCurrent = current?.id === s.id
        return (
          <div key={s.id} className="sess-row">
            <div className="sess-info">
              <div className="sess-device">
                {deviceLabel(s.latestActivity)} {isCurrent && <span className="sess-current">This device</span>}
              </div>
              <div className="sess-meta">{locationLabel(s.latestActivity)}</div>
            </div>
            {!isCurrent && (
              <button
                type="button"
                className="bg"
                style={{ fontSize: 12, padding: '6px 12px' }}
                disabled={busy === s.id}
                onClick={async () => {
                  setBusy(s.id)
                  try { await s.revoke(); await load() } finally { setBusy(null) }
                }}
              >
                {busy === s.id ? 'Signing out…' : 'Sign out'}
              </button>
            )}
          </div>
        )
      })}
      {sessions.length === 0 && <div style={{ color: 'var(--txd)', fontSize: 13 }}>No active sessions.</div>}
    </div>
  )
}
