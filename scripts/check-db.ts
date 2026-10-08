import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { sql } from 'drizzle-orm'
import * as schema from '../lib/db/schema'

const client = neon(process.env.DATABASE_URL!)
const db = drizzle(client, { schema })

async function main() {
  const tables = [
    'stocks',
    'analysts',
    'analyst_coverage',
    'signal_snapshots',
    'signal_snapshot_entries',
    'stock_prices',
    'stock_scores',
    'analyst_targets',
    'watchlist_items',
    'ingestion_log',
  ]
  console.log('Row counts:')
  for (const t of tables) {
    const result = await db.execute(sql.raw(`SELECT COUNT(*)::int AS c FROM ${t}`))
    const row = result.rows[0] as { c: number }
    console.log(`  ${t.padEnd(28)} ${row.c}`)
  }

  // Spot-check: SCOM has 6 analysts in mock data
  const scomCoverage = await db.execute(sql.raw(
    `SELECT COUNT(*)::int AS c FROM analyst_coverage ac
     JOIN stocks s ON s.id = ac.stock_id
     WHERE s.ticker = 'SCOM'`,
  ))
  console.log(`\nSpot check: SCOM coverage rows = ${(scomCoverage.rows[0] as { c: number }).c} (expected ~10 — analysts who include SCOM)`)
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
