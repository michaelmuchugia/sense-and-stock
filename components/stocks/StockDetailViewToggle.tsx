'use client'

import { useState } from 'react'
import clsx from 'clsx'

interface StockDetailViewToggleProps {
  simple: React.ReactNode
  deep: React.ReactNode
}

export function StockDetailViewToggle({ simple, deep }: StockDetailViewToggleProps) {
  const [mode, setMode] = useState<'simple' | 'deep'>('simple')

  return (
    <div className="C pb40">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <div className="view-toggle">
          <button
            type="button"
            className={clsx('vtb', 'sv', { active: mode === 'simple' })}
            aria-pressed={mode === 'simple'}
            onClick={() => setMode('simple')}
          >
            Simple
          </button>
          <button
            type="button"
            className={clsx('vtb', 'dv', { active: mode === 'deep' })}
            aria-pressed={mode === 'deep'}
            onClick={() => setMode('deep')}
          >
            Deep View
          </button>
        </div>
      </div>
      {mode === 'simple' ? (
        <>
          {simple}
          <button type="button" className="deep-hint" onClick={() => setMode('deep')}>
            <span>Want the full analyst breakdown, price targets chart &amp; historical data?</span>
            <strong>&nbsp;Switch to Deep View</strong>
            <span className="dha">→</span>
          </button>
        </>
      ) : (
        deep
      )}
    </div>
  )
}
