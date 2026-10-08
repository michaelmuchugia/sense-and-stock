/**
 * One-time price-history backfill for the Sense&Stock NSE dataset.
 *
 * Reads the per-ticker CSVs (Date, Open, High, Low, Close, Adj Close, Volume,
 * ticker), maps a couple of tickers to the app's symbols, computes day change
 * from the prior close and a rolling 52-week high/low, and upserts into
 * stock_prices keyed on (stock_id, date).
 *
 *   npx tsx scripts/ingest-price-history.ts --dry-run     (no DB writes)
 *   npx tsx scripts/ingest-price-history.ts               (live load)
 *   npx tsx scripts/ingest-price-history.ts --dir="C:\\path\\to\\nse_prices"
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'csv-parse/sync'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { sql } from 'drizzle-orm'
import * as schema from '../lib/db/schema'

const DRY = process.argv.includes('--dry-run')
const DATA_DIR =
  process.argv.find(a => a.startsWith('--dir='))?.slice(6) ??
  'C:/Users/user/Desktop/nse/nse data2015todate/nse_prices'

// Map data tickers to the app's existing stock symbols.
const TICKER_MAP: Record<string, string> = { HFCB: 'HFCK' }
// Skip these data tickers for now.
const SKIP = new Set<string>(['TRFC'])
// Tickers in the data that are not yet stocks; created before the load.
const NEW_STOCKS = [{ ticker: 'FMLY', name: 'Family Bank Group', sector: 'Banking' }]
const NEW_TICKERS = new Set(NEW_STOCKS.map(s => s.ticker))
const WINDOW = 252 // about 52 trading weeks

const client = neon(process.env.DATABASE_URL!)
const db = drizzle(client, { schema })

interface Row { date: string; open: number | null; high: number | null; low: number | null; close: number; volume: number | null }
interface DerivedRow extends Row { changePct: number | null; high52w: number | null; low52w: number | null }

function num(v: string | undefined): number | null {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function parseFile(path: string): Row[] {
  const raw = readFileSync(path, 'utf8')
  const recs = parse(raw, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[]
  const rows: Row[] = []
  for (const r of recs) {
    const close = Number(r['Close'])
    if (!Number.isFinite(close)) continue
    const date = (r['Date'] ?? '').slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    const vol = num(r['Volume'])
    rows.push({ date, open: num(r['Open']), high: num(r['High']), low: num(r['Low']), close, volume: vol === null ? null : Math.trunc(vol) })
  }
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  return rows
}

function derive(rows: Row[]): DerivedRow[] {
  return rows.map((row, i) => {
    const prev = i > 0 ? rows[i - 1].close : null
    const changePct = prev && prev > 0 ? ((row.close - prev) / prev) * 100 : null
    const start = Math.max(0, i - WINDOW + 1)
    let hi = -Infinity, lo = Infinity
    for (let j = start; j <= i; j++) {
      const h = rows[j].high ?? rows[j].close
      const l = rows[j].low ?? rows[j].close
      if (h > hi) hi = h
      if (l < lo) lo = l
    }
    return { ...row, changePct, high52w: Number.isFinite(hi) ? hi : null, low52w: Number.isFinite(lo) ? lo : null }
  })
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= 3; attempt++) {
    try { return await fn() } catch (err) {
      lastErr = err
      console.warn(`  retry ${attempt}/3 for ${label}: ${(err as Error).message}`)
      await new Promise(r => setTimeout(r, 400 * attempt))
    }
  }
  throw lastErr
}

async function main() {
  const t0 = Date.now()

  if (!DRY) {
    for (const ns of NEW_STOCKS) {
      await withRetry(() => db.insert(schema.stocks).values({ ticker: ns.ticker, name: ns.name, sector: ns.sector })
        .onConflictDoNothing({ target: schema.stocks.ticker }), `add ${ns.ticker}`)
    }
  }

  const stockRows = await withRetry(
    () => db.select({ id: schema.stocks.id, ticker: schema.stocks.ticker }).from(schema.stocks),
    'load stocks',
  )
  const idByTicker = new Map(stockRows.map(s => [s.ticker, s.id]))

  const files = readdirSync(DATA_DIR).filter(f => f.toLowerCase().endsWith('.csv')).sort()
  const insertRows: (typeof schema.stockPrices.$inferInsert)[] = []
  const report: string[] = []
  const skipped: string[] = []
  const unmatched: string[] = []
  const willAdd: string[] = []
  let totalFiles = 0, totalRows = 0

  for (const f of files) {
    const fileTicker = f.replace(/\.csv$/i, '').toUpperCase()
    if (SKIP.has(fileTicker)) { skipped.push(fileTicker); continue }
    const ticker = TICKER_MAP[fileTicker] ?? fileTicker
    const rows = derive(parseFile(join(DATA_DIR, f)))
    if (!rows.length) continue
    const stockId = idByTicker.get(ticker)
    const mapNote = ticker !== fileTicker ? `->${ticker}` : '   '

    if (stockId === undefined) {
      if (NEW_TICKERS.has(ticker)) { willAdd.push(ticker) } // created on live run
      else { unmatched.push(`${fileTicker}${ticker !== fileTicker ? mapNote : ''}`); continue }
    }

    const last = rows[rows.length - 1]
    report.push(
      `${fileTicker.padEnd(6)}${mapNote} ${String(rows.length).padStart(5)} rows  ${rows[0].date}..${last.date}  ` +
      `close ${last.close.toFixed(2).padStart(9)}  chg ${(last.changePct ?? 0).toFixed(2).padStart(7)}%  ` +
      `52w ${(last.low52w ?? 0).toFixed(2)}/${(last.high52w ?? 0).toFixed(2)}`,
    )
    totalFiles++; totalRows += rows.length

    if (stockId !== undefined) {
      for (const r of rows) {
        insertRows.push({
          stockId, date: r.date,
          open: r.open?.toString(), high: r.high?.toString(), low: r.low?.toString(),
          close: r.close.toString(), volume: r.volume,
          changePct: r.changePct?.toString(), high52w: r.high52w?.toString(), low52w: r.low52w?.toString(),
        })
      }
    }
  }

  console.log(report.join('\n'))
  console.log(`\nTickers loaded: ${totalFiles}   Price rows: ${totalRows}`)
  console.log(`Skipped: ${skipped.join(', ') || 'none'}`)
  console.log(`Mapped: HFCB->HFCK`)
  console.log(`New stock to add: ${willAdd.join(', ') || (DRY ? 'FMLY (on live run)' : 'none')}`)
  console.log(`Unmatched (no DB stock, not loaded): ${unmatched.join(', ') || 'none'}`)

  if (DRY) { console.log('\nDRY RUN. No database writes.'); process.exit(0) }

  const BATCH = 500
  let done = 0
  for (let i = 0; i < insertRows.length; i += BATCH) {
    const chunk = insertRows.slice(i, i + BATCH)
    await withRetry(() => db.insert(schema.stockPrices).values(chunk).onConflictDoUpdate({
      target: [schema.stockPrices.stockId, schema.stockPrices.date],
      set: {
        open: sql`excluded.open`, high: sql`excluded.high`, low: sql`excluded.low`,
        close: sql`excluded.close`, volume: sql`excluded.volume`,
        changePct: sql`excluded.change_pct`, high52w: sql`excluded.high_52w`, low52w: sql`excluded.low_52w`,
      },
    }), `batch ${i}`)
    done += chunk.length
    if (done % 10000 < BATCH) console.log(`  upserted ${done}/${insertRows.length}`)
  }

  await db.insert(schema.ingestionLog).values({
    source: 'price-history-backfill', stocksUpdated: totalFiles, status: 'success', durationMs: Date.now() - t0,
  })

  console.log(`\nDone. Upserted ${done} price rows across ${totalFiles} tickers in ${((Date.now() - t0) / 1000).toFixed(1)}s.`)
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
