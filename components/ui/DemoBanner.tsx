'use client'

import { useState } from 'react'

// The sample-data notice only appears while the app runs on fixture data.
// Set NEXT_PUBLIC_DEMO_DATA to "true" in dev/preview; leave it unset in
// production once validated records are ingested, and the notice stays off.
const SHOW_DEMO =
  process.env.NEXT_PUBLIC_DEMO_DATA === 'true' || process.env.NEXT_PUBLIC_DEMO_DATA === '1'

export function DemoBanner() {
  const [hidden, setHidden] = useState(false)
  if (!SHOW_DEMO || hidden) return null
  return (
    <div
      style={{
        background: 'rgba(74,158,255,0.07)',
        borderBottom: '1px solid rgba(74,158,255,0.15)',
        padding: '6px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 14,
        color: 'var(--txd)',
        fontFamily: 'var(--fm)',
      }}
    >
      <span
        style={{
          background: 'rgba(74,158,255,.15)',
          color: 'var(--blue)',
          border: '1px solid rgba(74,158,255,.25)',
          padding: '1px 7px',
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        Demo data
      </span>
      For illustration only &middot; Prices &amp; signals are prototype data, not real-time
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setHidden(true)}
        style={{
          marginLeft: 'auto',
          cursor: 'pointer',
          color: 'var(--txdd)',
          background: 'none',
          border: 'none',
          fontSize: 14,
          fontFamily: 'var(--fb)',
        }}
      >
        ×
      </button>
    </div>
  )
}
