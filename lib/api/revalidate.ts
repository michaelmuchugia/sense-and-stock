/**
 * Centralised wrappers around Next.js's cache revalidation API.
 *
 * Called by:
 *   - `/api/admin/revalidate` route handler (operator-driven)
 *   - The ingest CLIs when invoked with `--revalidate`
 *
 * Phase 3 uses path-based revalidation only — every page that displays DB
 * data has `export const revalidate = N` so ISR is the upper bound on
 * staleness. `revalidatePath` triggers immediate regeneration on demand.
 *
 * Tag-based revalidation (more granular) is deferred until we add
 * `unstable_cache` wrappers around the resolvers. See `phase3plan.md` Q2.
 */

import '@/lib/internal/server-only'
import { revalidatePath } from 'next/cache'

/**
 * Every route in the app that displays DB-backed data.
 * Used when an operator does a bulk-refresh ("revalidate everything").
 */
export const DB_BACKED_ROUTES = [
  '/',
  '/stocks',
  '/analysts',
  '/leaderboard',
  '/sectors',
  '/dashboard',
  '/smartscreen',
  '/signals',
  '/compare',
] as const

/**
 * Refresh the given list of paths. Falls back to refreshing all
 * DB-backed routes when no paths are provided.
 *
 * Returns the canonical list of paths that were revalidated (useful for
 * the admin endpoint to echo back to the caller).
 */
export function revalidatePaths(paths?: string[]): string[] {
  const targets = paths && paths.length > 0 ? paths : [...DB_BACKED_ROUTES]
  for (const path of targets) {
    revalidatePath(path)
  }
  return targets
}

/**
 * Convenience helpers for specific entities. The ingest CLIs use these so
 * each pipeline only touches the routes it could have affected.
 */

export function revalidateStocks(): string[] {
  return revalidatePaths(['/', '/stocks', '/dashboard', '/smartscreen'])
}

export function revalidateTicker(ticker: string): string[] {
  const clean = ticker.trim().toUpperCase()
  if (!clean) return []
  return revalidatePaths([
    `/stocks/${clean}`,
    '/stocks',
    '/',
    '/dashboard',
    '/smartscreen',
  ])
}

export function revalidateScores(): string[] {
  return revalidatePaths(['/', '/stocks', '/smartscreen', '/dashboard'])
}

export function revalidateAnalysts(): string[] {
  return revalidatePaths(['/analysts', '/leaderboard', '/compare', '/'])
}

export function revalidateAnalyst(id: number): string[] {
  return revalidatePaths([
    `/analysts/${id}`,
    '/analysts',
    '/leaderboard',
    '/compare',
    '/',
  ])
}

export function revalidateSignals(): string[] {
  return revalidatePaths(['/signals'])
}
