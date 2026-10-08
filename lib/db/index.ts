import 'server-only'

import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'
import * as schema from './schema'

type Schema = typeof schema
type DrizzleDb = NeonHttpDatabase<Schema>

let cachedDb: DrizzleDb | null = null
let cachedClient: NeonQueryFunction<false, false> | null = null

function buildDb(): DrizzleDb {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Configure it in .env.local for local dev or in Vercel Environment Variables for production.',
    )
  }
  if (!cachedClient) {
    cachedClient = neon(url)
  }
  return drizzle(cachedClient, { schema })
}

export function getDb(): DrizzleDb {
  if (!cachedDb) {
    cachedDb = buildDb()
  }
  return cachedDb
}

// Proxy so importing { db } works lazily — never throws at module load
export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_target, prop) {
    const real = getDb()
    const value = (real as unknown as Record<string | symbol, unknown>)[prop as string]
    return typeof value === 'function' ? value.bind(real) : value
  },
})

export type DB = DrizzleDb
export { schema }

const TRANSIENT_RE =
  /fetch failed|ECONNRESET|ETIMEDOUT|ConnectTimeout|EAI_AGAIN|terminating connection|Connection terminated|socket hang up|network|timeout/i

/**
 * Wrap a DB query with retry-on-transient-failure. Neon's serverless HTTP
 * driver occasionally cold-times-out the first request after idle; the retry
 * almost always succeeds. Only transient connection/fetch errors are retried —
 * genuine query errors (bad SQL, constraint violations) throw immediately.
 */
export async function withDbRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const msg = err instanceof Error ? (err.message + ' ' + ((err as { cause?: unknown }).cause ?? '')) : String(err)
      if (!TRANSIENT_RE.test(msg)) throw err
      if (i < attempts - 1) await new Promise(r => setTimeout(r, 150 * (i + 1)))
    }
  }
  throw lastErr
}
