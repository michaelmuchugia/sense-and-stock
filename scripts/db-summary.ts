import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { sql } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'
import * as schema from '../lib/db/schema'

const client = neon(process.env.DATABASE_URL!)
const db = drizzle(client, { schema })

async function main() {
  const tables: Array<[string, PgTable]> = [
    ['stocks', schema.stocks],
    ['analysts', schema.analysts],
    ['analyst_coverage', schema.analystCoverage],
    ['analyst_targets', schema.analystTargets],
    ['stock_prices', schema.stockPrices],
    ['stock_scores', schema.stockScores],
    ['signal_snapshots', schema.signalSnapshots],
    ['signal_snapshot_entries', schema.signalSnapshotEntries],
    ['ingestion_log', schema.ingestionLog],
  ]

  console.log('row counts:')
  for (const [name, table] of tables) {
    const result = await db.select({ n: sql<number>`count(*)::int` }).from(table)
    console.log(`  ${name.padEnd(28)} ${String(result[0].n).padStart(5)}`)
  }

  console.log('\nstock_scores distribution by sigClass:')
  const dist = await db
    .select({
      sigClass: schema.stockScores.sigClass,
      n: sql<number>`count(*)::int`,
    })
    .from(schema.stockScores)
    .groupBy(schema.stockScores.sigClass)
  for (const row of dist) {
    console.log(`  ${(row.sigClass ?? '(null)').padEnd(10)} ${row.n}`)
  }

  console.log('\nrecent ingestion_log entries:')
  const runs = await db
    .select({
      source: schema.ingestionLog.source,
      status: schema.ingestionLog.status,
      stocksUpdated: schema.ingestionLog.stocksUpdated,
      durationMs: schema.ingestionLog.durationMs,
      runAt: schema.ingestionLog.runAt,
    })
    .from(schema.ingestionLog)
    .orderBy(sql`run_at desc`)
    .limit(10)
  for (const r of runs) {
    console.log(`  ${r.runAt?.toISOString() ?? ''}  ${r.source?.padEnd(45)}  ${r.status?.padEnd(8)}  ${String(r.stocksUpdated).padStart(3)}  ${r.durationMs}ms`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
