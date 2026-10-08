'use client'

import type { ActivityEntry } from '@/lib/types/user'

const ACTION_LABELS: Record<string, string> = {
  signin: 'Signed in',
  signout: 'Signed out',
  user_created: 'Account created',
  profile_update: 'Updated profile',
  email_changed: 'Changed email',
  password_changed: 'Changed password',
  watchlist_add: 'Added to watchlist',
  watchlist_remove: 'Removed from watchlist',
  watchlist_import: 'Imported watchlist',
  account_deletion_initiated: 'Requested account deletion',
}

function maskIp(ip: string | null): string {
  if (!ip) return '—'
  if (ip.includes('.')) {
    const p = ip.split('.')
    if (p.length === 4) return `${p[0]}.${p[1]}.×.×`
  }
  return ip.slice(0, 6) + '…'
}

export function ActivityPanel({ rows }: { rows: ActivityEntry[] }) {
  return (
    <div className="sv-box" style={{ maxWidth: 720 }}>
      <div className="sv-box-ttl">Recent activity</div>
      {rows.length === 0 ? (
        <div style={{ color: 'var(--txd)', fontSize: 13 }}>No activity yet.</div>
      ) : (
        <table className="dt" style={{ fontSize: 12.5 }}>
          <thead>
            <tr><th>When</th><th>Action</th><th>Detail</th><th>IP</th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td style={{ fontFamily: 'var(--fm)', color: 'var(--txd)', whiteSpace: 'nowrap' }}>
                  {new Date(r.createdAt).toISOString().slice(0, 16).replace('T', ' ')}
                </td>
                <td>{ACTION_LABELS[r.action] ?? r.action}</td>
                <td style={{ color: 'var(--txd)' }}>{r.detail ?? '—'}</td>
                <td style={{ fontFamily: 'var(--fm)', color: 'var(--txdd)' }}>{maskIp(r.ip)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
