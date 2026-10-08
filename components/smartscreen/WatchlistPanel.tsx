'use client'

import type { Stock } from '@/lib/types/stock'

interface WatchlistPanelProps {
  open: boolean
  onClose: () => void
  watchlist: string[]
  stocks: Stock[]
  onRemove: (sym: string) => void
}

export function WatchlistPanel({ open, onClose, watchlist, stocks, onRemove }: WatchlistPanelProps) {
  if (!open) return null

  return (
    <div className="wl-panel">
      <div className="wl-panel-ttl">
        <span>My Watchlist</span>
        <button type="button" className="bg" style={{ fontSize: 11, padding: '4px 10px' }} onClick={onClose}>
          Close
        </button>
      </div>
      {watchlist.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--txd)', textAlign: 'center', padding: '16px 0' }}>
          Your watchlist is empty. Click ☆ on any stock to save it.
        </div>
      ) : (
        watchlist.map(sym => {
          const s = stocks.find(x => x.s === sym)
          if (!s) return null
          return (
            <div key={sym} className="wl-item">
              <span className="pill">{sym}</span>
              <span style={{ flex: 1, fontSize: 13 }}>{s.n}</span>
              <span style={{ fontFamily: 'var(--fm)', fontSize: 12.5 }}>KES {s.p.toFixed(2)}</span>
              <button type="button" className="wl-rm" onClick={() => onRemove(sym)}>×</button>
            </div>
          )
        })
      )}
    </div>
  )
}
