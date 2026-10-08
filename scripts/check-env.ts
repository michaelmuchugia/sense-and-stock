import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { getEnv } from '../lib/db/env'
import { neon } from '@neondatabase/serverless'

function mask(v: string | undefined): string {
  if (!v) return '(missing)'
  if (v.length <= 8) return '***'
  return v.slice(0, 4) + '...(' + v.length + ' chars)...' + v.slice(-4)
}

function hostOnly(url: string): string {
  try {
    const u = new URL(url)
    return u.host
  } catch {
    return '(invalid url)'
  }
}

async function main() {
  // 1. Schema validation
  try {
    getEnv()
    console.log('  Zod env schema:        OK')
  } catch (err) {
    console.error('  Zod env schema:        FAIL')
    console.error((err as Error).message)
    process.exit(1)
  }

  // 2. Presence summary (no secrets printed)
  console.log('  DATABASE_URL host:     ', hostOnly(process.env.DATABASE_URL!))
  console.log('  DATABASE_URL_DIRECT:   ',
    process.env.DATABASE_URL_DIRECT
      ? hostOnly(process.env.DATABASE_URL_DIRECT)
      : '(not set — will fall back to DATABASE_URL for migrations)')
  console.log('  CRON_SECRET:           ', mask(process.env.CRON_SECRET))
  console.log('  NODE_ENV:              ', process.env.NODE_ENV)
  console.log('  NEXT_PUBLIC_APP_ENV:   ', process.env.NEXT_PUBLIC_APP_ENV)

  // 3. Live connection test (SELECT 1)
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const result = await sql`SELECT 1 AS ok, current_database() AS db, version() AS pg_version`
    const row = result[0] as { ok: number; db: string; pg_version: string }
    console.log('  Neon connection:       OK')
    console.log('    database:            ', row.db)
    console.log('    pg version:          ', row.pg_version.split(' ').slice(0, 2).join(' '))
  } catch (err) {
    console.error('  Neon connection:       FAIL')
    console.error((err as Error).message)
    process.exit(1)
  }

  // 4. Pooler heuristic — recommended for runtime
  const url = process.env.DATABASE_URL!
  if (!url.includes('-pooler')) {
    console.warn(
      '  WARNING: DATABASE_URL does not look like a pooled connection ' +
      '(no "-pooler" in hostname). For serverless runtime, use the pooled URL ' +
      'from Neon dashboard. Direct connection is fine if you have a Postgres ' +
      'plan that supports it.',
    )
  } else {
    console.log('  DATABASE_URL is pooled: OK')
  }

  console.log('All checks passed.')
  process.exit(0)
}

main().catch(err => {
  console.error('check-env failed:', err)
  process.exit(1)
})
