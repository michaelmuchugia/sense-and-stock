'use client'

import { useWatchlist } from '@/hooks/useWatchlist'

/**
 * Mounted once globally (in the root layout). Renders nothing unless the
 * watchlist hook has detected localStorage items left over from a signed-out
 * session that aren't yet in the user's DB watchlist.
 */
export function WatchlistMigrationPrompt() {
  const { pendingMigration, confirmMigration, dismissMigration } = useWatchlist()

  if (pendingMigration.length === 0) return null
  const n = pendingMigration.length

  return (
    <div className="wmp" role="dialog" aria-label="Import watchlist">
      <div className="wmp-body">
        <div className="wmp-title">Import your saved stocks?</div>
        <div className="wmp-text">
          You have {n} stock{n === 1 ? '' : 's'} saved on this device
          ({pendingMigration.slice(0, 5).join(', ')}{n > 5 ? '…' : ''}).
          Add {n === 1 ? 'it' : 'them'} to your account?
        </div>
      </div>
      <div className="wmp-actions">
        <button type="button" className="bp" style={{ fontSize: 12.5, padding: '7px 14px' }} onClick={confirmMigration}>
          Import
        </button>
        <button type="button" className="bg" style={{ fontSize: 12.5, padding: '7px 14px' }} onClick={() => dismissMigration({ clear: false })}>
          Not now
        </button>
        <button
          type="button"
          className="wmp-discard"
          onClick={() => dismissMigration({ clear: true })}
        >
          Discard
        </button>
      </div>
    </div>
  )
}
