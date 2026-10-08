'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'

const STORAGE_KEY = 'aq.watchlist'

function read(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string') : []
  } catch {
    return []
  }
}

function write(list: string[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // localStorage unavailable — silently no-op
  }
}

function clearStorage() {
  if (typeof window === 'undefined') return
  try { window.localStorage.removeItem(STORAGE_KEY) } catch { /* no-op */ }
}

/**
 * Watchlist hook. Public API (toggle/add/remove/has/watchlist/hydrated) is
 * unchanged from Phase 0-3 — components don't know whether they're backed by
 * localStorage or the database.
 *
 * - Signed out: localStorage, exactly as before.
 * - Signed in: server-backed via /api/watchlist with optimistic local state.
 * - On first sign-in with leftover localStorage items, `pendingMigration`
 *   exposes those tickers so the UI can prompt an import.
 */
export function useWatchlist() {
  const { isLoaded, isSignedIn } = useAuth()
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [pendingMigration, setPendingMigration] = useState<string[]>([])
  const loadedForSignedIn = useRef(false)

  // Signed-out: read localStorage + listen for cross-tab changes.
  useEffect(() => {
    if (!isLoaded) return
    if (isSignedIn) return
    setWatchlist(read())
    setHydrated(true)
    loadedForSignedIn.current = false
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setWatchlist(read())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [isLoaded, isSignedIn])

  // Signed-in: fetch server watchlist once, and surface any localStorage
  // items as a pending migration.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || loadedForSignedIn.current) return
    loadedForSignedIn.current = true
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/watchlist', { cache: 'no-store' })
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as { tickers: string[] }
        if (cancelled) return
        setWatchlist(data.tickers)
        const local = read()
        const toMigrate = local.filter(t => !data.tickers.includes(t))
        if (toMigrate.length > 0) setPendingMigration(toMigrate)
      } catch {
        if (!cancelled) setWatchlist([])
      } finally {
        if (!cancelled) setHydrated(true)
      }
    })()
    return () => { cancelled = true }
  }, [isLoaded, isSignedIn])

  const toggle = useCallback((sym: string): boolean => {
    const willAdd = !watchlist.includes(sym)
    const next = willAdd ? [...watchlist, sym] : watchlist.filter(s => s !== sym)
    setWatchlist(next) // optimistic
    if (isSignedIn) {
      fetch(`/api/watchlist/${encodeURIComponent(sym)}`, { method: willAdd ? 'POST' : 'DELETE' })
        .then(res => { if (!res.ok) setWatchlist(watchlist) }) // revert on failure
        .catch(() => setWatchlist(watchlist))
    } else {
      write(next)
    }
    return willAdd
  }, [watchlist, isSignedIn])

  const add = useCallback((sym: string) => {
    if (watchlist.includes(sym)) return
    const next = [...watchlist, sym]
    setWatchlist(next)
    if (isSignedIn) {
      fetch(`/api/watchlist/${encodeURIComponent(sym)}`, { method: 'POST' })
        .then(res => { if (!res.ok) setWatchlist(watchlist) })
        .catch(() => setWatchlist(watchlist))
    } else {
      write(next)
    }
  }, [watchlist, isSignedIn])

  const remove = useCallback((sym: string) => {
    const next = watchlist.filter(s => s !== sym)
    setWatchlist(next)
    if (isSignedIn) {
      fetch(`/api/watchlist/${encodeURIComponent(sym)}`, { method: 'DELETE' })
        .then(res => { if (!res.ok) setWatchlist(watchlist) })
        .catch(() => setWatchlist(watchlist))
    } else {
      write(next)
    }
  }, [watchlist, isSignedIn])

  const has = useCallback((sym: string) => watchlist.includes(sym), [watchlist])

  // Migration actions for <WatchlistMigrationPrompt />.
  const confirmMigration = useCallback(async () => {
    const tickers = pendingMigration
    setPendingMigration([])
    try {
      const res = await fetch('/api/watchlist/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tickers }),
      })
      if (res.ok) {
        clearStorage()
        const list = await fetch('/api/watchlist', { cache: 'no-store' })
        if (list.ok) {
          const data = (await list.json()) as { tickers: string[] }
          setWatchlist(data.tickers)
        }
      }
    } catch {
      // leave localStorage intact so the user can retry next session
    }
  }, [pendingMigration])

  const dismissMigration = useCallback((opts: { clear: boolean }) => {
    if (opts.clear) clearStorage()
    setPendingMigration([])
  }, [])

  return {
    watchlist,
    toggle,
    add,
    remove,
    has,
    hydrated,
    pendingMigration,
    confirmMigration,
    dismissMigration,
  }
}
