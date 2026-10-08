import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { sql } from 'drizzle-orm'
import * as schema from '../lib/db/schema'
import { STOCKS } from '../lib/data/stocks'
import { ANALYSTS } from '../lib/data/analysts'
import { SIG_SNAPSHOTS } from '../lib/data/snapshots'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to .env.local.')
  process.exit(1)
}

const client = neon(process.env.DATABASE_URL)
const db = drizzle(client, { schema })

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`  retry ${i}/${attempts} for ${label}: ${msg}`)
      await new Promise(r => setTimeout(r, 500 * i))
    }
  }
  throw lastErr
}

async function seed() {
  console.log('Starting AfriQuant database seed...')
  const startTime = Date.now()

  // 1. Stocks — one batch insert
  console.log(`Seeding ${STOCKS.length} stocks...`)
  await withRetry('insert stocks', () =>
    db
      .insert(schema.stocks)
      .values(STOCKS.map(s => ({
        ticker:  s.s,
        name:    s.n,
        sector:  s.sec,
        profile: s.prof,
      })))
      .onConflictDoUpdate({
        target: schema.stocks.ticker,
        set: {
          name:      sql`excluded.name`,
          sector:    sql`excluded.sector`,
          profile:   sql`excluded.profile`,
          updatedAt: new Date(),
        },
      }),
  )
  console.log('  done')

  // 2. Analysts — one batch insert
  console.log(`Seeding ${ANALYSTS.length} analysts...`)
  await withRetry('insert analysts', () =>
    db
      .insert(schema.analysts)
      .values(ANALYSTS.map(a => ({
        externalId:   a.id,
        name:         a.nm,
        initials:     a.ini,
        firm:         a.firm,
        sinceYear:    parseInt(a.since, 10) || null,
        hitRatio:     a.hit.toString(),
        avgReturn:    a.ret.toString(),
        avgDays:      a.days,
        perfScore:    a.score.toString(),
        totalTargets: a.targets,
        bio:          a.bio,
      })))
      .onConflictDoUpdate({
        target: schema.analysts.externalId,
        set: {
          name:         sql`excluded.name`,
          initials:     sql`excluded.initials`,
          firm:         sql`excluded.firm`,
          sinceYear:    sql`excluded.since_year`,
          hitRatio:     sql`excluded.hit_ratio`,
          avgReturn:    sql`excluded.avg_return`,
          avgDays:      sql`excluded.avg_days`,
          perfScore:    sql`excluded.perf_score`,
          totalTargets: sql`excluded.total_targets`,
          bio:          sql`excluded.bio`,
          updatedAt:    new Date(),
        },
      }),
  )
  console.log('  done')

  // 3. Build in-memory FK lookup maps (avoids round-tripping per child row)
  console.log('Loading id maps for coverage and signals...')
  const dbStocks  = await withRetry('load stocks', () => db.select().from(schema.stocks))
  const dbAnalysts = await withRetry('load analysts', () => db.select().from(schema.analysts))
  const stockIdByTicker = new Map(dbStocks.map(s => [s.ticker, s.id]))
  const analystIdByExternal = new Map(
    dbAnalysts.filter(a => a.externalId !== null).map(a => [a.externalId as number, a.id]),
  )
  console.log(`  ${stockIdByTicker.size} stocks, ${analystIdByExternal.size} analysts`)

  // 4. Analyst coverage — one batch insert
  console.log('Seeding analyst coverage...')
  const coverageRows: typeof schema.analystCoverage.$inferInsert[] = []
  for (const analyst of ANALYSTS) {
    const analystId = analystIdByExternal.get(analyst.id)
    if (!analystId) continue
    for (const ticker of analyst.stocks) {
      const stockId = stockIdByTicker.get(ticker)
      if (!stockId) continue
      coverageRows.push({
        analystId,
        stockId,
        hitRatio:   analyst.hit.toString(),
        avgReturn:  analyst.ret.toString(),
        avgDays:    analyst.days,
        totalCalls: analyst.targets,
      })
    }
  }
  if (coverageRows.length) {
    await withRetry('insert coverage', () =>
      db
        .insert(schema.analystCoverage)
        .values(coverageRows)
        .onConflictDoUpdate({
          target: [schema.analystCoverage.analystId, schema.analystCoverage.stockId],
          set: {
            hitRatio:   sql`excluded.hit_ratio`,
            avgReturn:  sql`excluded.avg_return`,
            avgDays:    sql`excluded.avg_days`,
            totalCalls: sql`excluded.total_calls`,
            updatedAt:  new Date(),
          },
        }),
    )
  }
  console.log(`  ${coverageRows.length} rows`)

  // 5. Signal snapshots — batch, then entries batch
  console.log(`Seeding ${SIG_SNAPSHOTS.length} signal snapshots...`)
  const insertedSnaps = await withRetry('insert snapshots', () =>
    db
      .insert(schema.signalSnapshots)
      .values(SIG_SNAPSHOTS.map(s => ({
        month:   s.month,
        label:   s.label,
        naseRet: s.naseRet.toString(),
      })))
      .onConflictDoUpdate({
        target: schema.signalSnapshots.month,
        set: {
          label:   sql`excluded.label`,
          naseRet: sql`excluded.nase_ret`,
        },
      })
      .returning(),
  )
  const snapIdByMonth = new Map(insertedSnaps.map(s => [s.month, s.id]))

  const entryRows: typeof schema.signalSnapshotEntries.$inferInsert[] = []
  for (const snap of SIG_SNAPSHOTS) {
    const snapId = snapIdByMonth.get(snap.month)
    if (!snapId) continue
    for (let i = 0; i < snap.signals.length; i++) {
      const sig = snap.signals[i]
      const stockId = stockIdByTicker.get(sig.sym)
      if (!stockId) continue
      entryRows.push({
        snapshotId:    snapId,
        stockId,
        entryPrice:    sig.entryPx.toString(),
        scoreAtSignal: sig.score,
        note:          sig.note,
        rank:          i + 1,
      })
    }
  }
  if (entryRows.length) {
    await withRetry('insert snapshot entries', () =>
      db
        .insert(schema.signalSnapshotEntries)
        .values(entryRows)
        .onConflictDoUpdate({
          target: [schema.signalSnapshotEntries.snapshotId, schema.signalSnapshotEntries.stockId],
          set: {
            entryPrice:    sql`excluded.entry_price`,
            scoreAtSignal: sql`excluded.score_at_signal`,
            note:          sql`excluded.note`,
            rank:          sql`excluded.rank`,
          },
        }),
    )
  }
  console.log(`  ${entryRows.length} entries`)

  const duration = Date.now() - startTime
  console.log(`Seed complete in ${duration}ms`)
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
