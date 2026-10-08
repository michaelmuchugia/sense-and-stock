/**
 * Shared client for CLI scripts that want to ping the local app's
 * /api/admin/revalidate endpoint after a successful ingest.
 *
 * Usage: pass `--revalidate` to any CLI; if the dev server (or a deployed
 * URL) is reachable, the script will flush the relevant ISR caches. If the
 * endpoint isn't reachable, the script logs and continues — it never
 * fails the ingest because of a revalidation issue.
 *
 * Configuration:
 *   APP_BASE_URL  — defaults to http://localhost:3000
 *   ADMIN_SECRET  — required to authenticate (loaded from .env.local)
 */

const DEFAULT_BASE_URL = 'http://localhost:3000'

export function cliWantsRevalidate(argv: string[]): boolean {
  return argv.includes('--revalidate') || argv.includes('-r')
}

export async function pingRevalidate(paths?: string[]): Promise<boolean> {
  const baseUrl = process.env.APP_BASE_URL ?? DEFAULT_BASE_URL
  const secret  = process.env.ADMIN_SECRET
  if (!secret) {
    console.warn('  [revalidate] skipped: ADMIN_SECRET is not set')
    return false
  }
  const url = `${baseUrl.replace(/\/$/, '')}/api/admin/revalidate`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secret}`,
        'content-type': 'application/json',
      },
      body: paths && paths.length > 0 ? JSON.stringify({ paths }) : '{}',
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      console.warn(`  [revalidate] HTTP ${res.status}: ${(await res.text()).slice(0, 120)}`)
      return false
    }
    const body = (await res.json()) as { revalidated?: string[]; count?: number }
    console.log(`  [revalidate] flushed ${body.count ?? 0} path(s): ${(body.revalidated ?? []).join(', ')}`)
    return true
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`  [revalidate] failed: ${msg} (is the dev server running?)`)
    return false
  }
}

/**
 * Pre-baked path lists for each pipeline. The CLI helper picks one of
 * these so the operator doesn't have to enumerate routes manually.
 */
export const REVALIDATE_PRESETS = {
  // After price ingest: every page that consumes price data
  prices: ['/', '/stocks', '/smartscreen', '/dashboard'],
  // After research ingest: every page that consumes target data
  research: ['/', '/stocks', '/smartscreen', '/analysts'],
  // After analyst ingest: every page that lists analysts
  analysts: ['/analysts', '/leaderboard', '/compare', '/'],
  // After explicit recompute: same as prices
  scores: ['/', '/stocks', '/smartscreen', '/dashboard'],
  // No preset → revalidate everything
  all: undefined as string[] | undefined,
} as const
