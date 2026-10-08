/**
 * Production load for the Sense&Stock analyst calls.
 *
 * Replaces the placeholder analysts with the source-backed people, joint-author
 * groups and research teams, loads all 189 calls as dated targets (ratings
 * preserved, date precision kept, latest per analyst+stock marked current),
 * computes accuracy under a 12-month window labelled as Sense&Stock's chosen
 * methodology, and writes coverage and per-analyst performance. Momentum is not
 * touched here; it comes from prices.
 *
 *   npx tsx scripts/ingest-calls.ts --dry-run   (compute + report, no writes)
 *   npx tsx scripts/ingest-calls.ts             (production load)
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'csv-parse/sync'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { sql, eq } from 'drizzle-orm'
import * as schema from '../lib/db/schema'

const DRY = process.argv.includes('--dry-run')
const CALLS = 'C:/Users/user/Desktop/nse/SenseAndStock_calls'
const PRICES_DIR = 'C:/Users/user/Desktop/nse/nse data2015todate/nse_prices'
const ASOF = '2026-10-05'
const WINDOW_MONTHS = 12
const METHODOLOGY = '12-month window (Sense&Stock)'
const MATURED_MIN = 10                         // minimum matured Buy calls to publish a hit rate
const PRICE_FILE_MAP: Record<string, string> = { HFCK: 'HFCB' }
const BONUS_EXCLUDE = new Set(['KAPC', 'WTK'])

const client = neon(process.env.DATABASE_URL!)
const db = drizzle(client, { schema })

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let err: unknown
  for (let a = 1; a <= 3; a++) {
    try { return await fn() } catch (e) { err = e; console.warn(`  retry ${a}/3 ${label}: ${(e as Error).message}`); await new Promise(r => setTimeout(r, 400 * a)) }
  }
  throw err
}

function addMonths(iso: string, m: number): string {
  const [y, mo, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, mo - 1 + m, d)).toISOString().slice(0, 10)
}
function titleRating(raw: string): string {
  const r = (raw ?? '').trim().toUpperCase()
  return r === 'BUY' ? 'Buy' : r === 'HOLD' ? 'Hold' : r === 'SELL' ? 'Sell' : r === 'TAKE PROFIT' ? 'Take Profit' : (raw ?? '').trim()
}
function effectiveDate(row: Record<string, string>): { date: string | null; precision: 'day' | 'month' | 'unknown' } {
  const ref = (row['price_reference_date'] ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(ref)) return { date: ref, precision: 'day' }
  const pub = (row['publication_date'] ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(pub)) return { date: pub, precision: 'day' }
  if (/^\d{4}-\d{2}$/.test(pub)) return { date: pub + '-01', precision: 'month' }
  return { date: null, precision: 'unknown' }
}
function initials(name: string): string {
  const parts = name.replace(/&/g, ' ').split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase().slice(0, 10) || 'NA'
}

type Series = { date: string; close: number }[]
const cache = new Map<string, Series | null>()
function series(ticker: string): Series | null {
  if (cache.has(ticker)) return cache.get(ticker)!
  const path = join(PRICES_DIR, (PRICE_FILE_MAP[ticker] ?? ticker) + '.csv')
  if (!existsSync(path)) { cache.set(ticker, null); return null }
  const recs = parse(readFileSync(path, 'utf8'), { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[]
  const s: Series = []
  for (const r of recs) { const c = Number(r['Close']); const d = (r['Date'] ?? '').slice(0, 10); if (Number.isFinite(c) && /^\d{4}-\d{2}-\d{2}$/.test(d)) s.push({ date: d, close: c }) }
  s.sort((a, b) => (a.date < b.date ? -1 : 1)); cache.set(ticker, s); return s
}
function firstReach(s: Series, target: number, from: string, to: string): string | null {
  for (const p of s) { if (p.date < from) continue; if (p.date > to) break; if (p.close >= target) return p.date }
  return null
}
function priceAsOf(s: Series, date: string): number | null {
  let v: number | null = null
  for (const p of s) { if (p.date <= date) v = p.close; else break }
  return v
}
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000)
}

interface Call {
  callId: string; ticker: string; analystName: string; firm: string; attribution: string
  rating: string; target: number; refPrice: number | null; date: string | null; precision: 'day' | 'month' | 'unknown'
  actionType: string; sourceUrl: string; verification: string; targetType: string
  // computed
  eligible: boolean; exclusion: string; matured: boolean; hit: boolean; daysToHit: number | null; reachedToDate: boolean
  realizedRet: number | null
}

function main() {
  const rows = parse(readFileSync(CALLS, 'utf8'), { columns: true, skip_empty_lines: true, trim: true, bom: true }) as Record<string, string>[]
  const calls: Call[] = []

  for (const r of rows) {
    const ticker = (r['ticker'] ?? '').trim().toUpperCase()
    const { date, precision } = effectiveDate(r)
    const rating = titleRating(r['original_rating'] ?? '')
    const target = Number(r['target_price'])
    const refPrice = r['reference_price'] ? Number(r['reference_price']) : null
    const c: Call = {
      callId: (r['call_id'] ?? '').trim(), ticker, analystName: (r['analyst_name'] ?? '').trim(), firm: (r['firm'] ?? '').trim(),
      attribution: (r['attribution_type'] ?? '').split('(')[0].trim(), rating, target,
      refPrice: Number.isFinite(refPrice as number) ? refPrice : null, date, precision,
      actionType: (r['action_type'] ?? '').trim(), sourceUrl: (r['source_url'] ?? '').trim(),
      verification: (r['verification_status'] ?? '').trim().replace(/\u2014/g, '-'), targetType: (r['target_type'] ?? '').trim(),
      eligible: false, exclusion: '', matured: false, hit: false, daysToHit: null, reachedToDate: false, realizedRet: null,
    }
    // eligibility for Buy-target accuracy
    if (c.rating !== 'Buy') c.exclusion = 'not a Buy rating'
    else if (BONUS_EXCLUDE.has(ticker)) c.exclusion = 'bonus-adjustment unverified'
    else if (c.precision !== 'day' || !c.date) c.exclusion = 'date uncertain'
    else {
      const s = series(ticker)
      if (!s || !s.length) c.exclusion = 'no price series'
      else {
        c.eligible = true
        const windowEnd = addMonths(c.date, WINDOW_MONTHS)
        const rtd = firstReach(s, c.target, c.date, ASOF)
        c.reachedToDate = !!rtd
        if (windowEnd <= ASOF) {
          c.matured = true
          const h = firstReach(s, c.target, c.date, windowEnd)
          if (h) { c.hit = true; c.daysToHit = daysBetween(c.date, h) }
        } else c.exclusion = 'window not matured'
        const endPx = priceAsOf(s, windowEnd <= ASOF ? windowEnd : ASOF)
        if (endPx !== null && c.refPrice && c.refPrice > 0) c.realizedRet = (endPx - c.refPrice) / c.refPrice * 100
      }
    }
    calls.push(c)
  }

  // analysts
  const analystMap = new Map<string, { name: string; firm: string; attribution: string; calls: Call[] }>()
  for (const c of calls) {
    const k = `${c.analystName} | ${c.firm}`
    const a = analystMap.get(k) ?? { name: c.analystName, firm: c.firm, attribution: c.attribution, calls: [] }
    a.calls.push(c); analystMap.set(k, a)
  }
  const analystList = [...analystMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))

  // current target per (analyst, stock): latest dated call
  function isCurrentCall(c: Call, group: Call[]): boolean {
    const dated = group.filter(g => g.date).sort((a, b) => (a.date! < b.date! ? 1 : -1))
    return dated.length > 0 && dated[0] === c
  }
  const byAnalystStock = new Map<string, Call[]>()
  for (const c of calls) { const k = `${c.analystName} | ${c.firm}@@${c.ticker}`; byAnalystStock.set(k, [...(byAnalystStock.get(k) ?? []), c]) }

  // per-analyst performance
  interface Perf { maturedBuy: number; hits: number; eligibleBuy: number; reached: number; avgDays: number | null; avgRet: number | null; hitRatio: number | null }
  const perf = new Map<string, Perf>()
  for (const [k, a] of analystMap) {
    const elig = a.calls.filter(c => c.eligible)
    const mat = elig.filter(c => c.matured)
    const hits = mat.filter(c => c.hit)
    const reached = elig.filter(c => c.reachedToDate)
    const days = hits.map(c => c.daysToHit!).filter(n => Number.isFinite(n))
    const rets = elig.map(c => c.realizedRet).filter((n): n is number => n !== null)
    perf.set(k, {
      maturedBuy: mat.length, hits: hits.length, eligibleBuy: elig.length, reached: reached.length,
      avgDays: days.length ? Math.round(days.reduce((s, n) => s + n, 0) / days.length) : null,
      avgRet: rets.length ? rets.reduce((s, n) => s + n, 0) / rets.length : null,
      hitRatio: mat.length >= MATURED_MIN ? (hits.length / mat.length) * 100 : null,
    })
  }

  // ---- report ----
  console.log(`CALLS LOAD ${DRY ? '(DRY RUN)' : '(PRODUCTION)'} — methodology: ${METHODOLOGY}, as-of ${ASOF}`)
  console.log(`Analysts: ${analystList.length}   Calls: ${calls.length}`)
  for (const [k, a] of analystList) {
    const p = perf.get(k)!
    const ratio = p.hitRatio === null ? 'Insufficient history' : `${p.hitRatio.toFixed(0)}% (N=${p.maturedBuy})`
    console.log(`  ${a.name} / ${a.firm}  calls ${a.calls.length}  matured ${p.maturedBuy}  hit ${p.hits}  reached ${p.reached}/${p.eligibleBuy}  acc ${ratio}`)
  }

  if (DRY) { console.log('\nDRY RUN. No writes.'); return Promise.resolve() }

  return load(calls, analystMap, analystList, perf, byAnalystStock, isCurrentCall)
}

async function load(
  calls: Call[],
  analystMap: Map<string, { name: string; firm: string; attribution: string; calls: Call[] }>,
  analystList: [string, { name: string; firm: string; attribution: string; calls: Call[] }][],
  perf: Map<string, { maturedBuy: number; hits: number; eligibleBuy: number; reached: number; avgDays: number | null; avgRet: number | null; hitRatio: number | null }>,
  byAnalystStock: Map<string, Call[]>,
  isCurrentCall: (c: Call, g: Call[]) => boolean,
) {
  const t0 = Date.now()
  // stock id map
  const stockRows = await withRetry(() => db.select({ id: schema.stocks.id, ticker: schema.stocks.ticker }).from(schema.stocks), 'load stocks')
  const stockId = new Map(stockRows.map(s => [s.ticker, s.id]))

  // clear placeholder analysts (cascades targets + coverage)
  await withRetry(() => db.delete(schema.analysts), 'clear analysts')

  // insert analysts
  const analystId = new Map<string, number>()
  let ext = 1
  for (const [k, a] of analystList) {
    const p = perf.get(k)!
    const bio = `${a.attribution}. ${a.firm}. Accuracy on a ${METHODOLOGY}; ` +
      (p.hitRatio === null ? `insufficient matured calls (${p.maturedBuy}) to publish a hit rate.` : `${p.hitRatio.toFixed(0)}% of ${p.maturedBuy} matured Buy targets reached.`)
    const [ins] = await withRetry(() => db.insert(schema.analysts).values({
      externalId: ext++, name: a.name, initials: initials(a.name), firm: a.firm,
      hitRatio: p.hitRatio === null ? null : p.hitRatio.toFixed(4),
      avgReturn: p.avgRet === null ? null : p.avgRet.toFixed(4),
      avgDays: p.avgDays, perfScore: p.hitRatio === null ? null : p.hitRatio.toFixed(4),
      totalTargets: a.calls.length, bio, isActive: true,
    }).returning({ id: schema.analysts.id }), `insert analyst ${a.name}`)
    analystId.set(k, ins.id)
  }

  // insert targets
  const targetRows: (typeof schema.analystTargets.$inferInsert)[] = []
  let skippedNoStock = 0
  for (const c of calls) {
    const sid = stockId.get(c.ticker); const aid = analystId.get(`${c.analystName} | ${c.firm}`)
    if (!sid || !aid || !c.date) { if (!sid) skippedNoStock++; if (!c.date) continue; if (!sid) continue }
    const group = byAnalystStock.get(`${c.analystName} | ${c.firm}@@${c.ticker}`)!
    const note =
      `${c.actionType} | ref ${c.date} @ KES ${c.refPrice ?? '?'} | ${c.precision}-precision date | ${c.verification} | ` +
      `horizon assumed ${METHODOLOGY}` +
      (c.eligible ? (c.matured ? ` | matured: ${c.hit ? 'target reached' : 'not reached'}` : ' | pending (window open)') : ` | excluded: ${c.exclusion}`) +
      (c.reachedToDate ? ' | reached target on a daily close to date' : '')
    targetRows.push({
      analystId: aid!, stockId: sid!, targetPrice: c.target.toFixed(4), rating: c.rating,
      issuedDate: c.date!, reportSource: c.sourceUrl || 'Analyst report',
      notes: note.slice(0, 2000), isCurrent: isCurrentCall(c, group),
    })
  }
  for (let i = 0; i < targetRows.length; i += 200) {
    await withRetry(() => db.insert(schema.analystTargets).values(targetRows.slice(i, i + 200)), `targets ${i}`)
  }

  // coverage per (analyst, stock): totalCalls, and the analyst's published hit rate (null if insufficient)
  const covRows: (typeof schema.analystCoverage.$inferInsert)[] = []
  for (const [k, g] of byAnalystStock) {
    const akey = k.split('@@')[0]; const ticker = k.split('@@')[1]
    const aid = analystId.get(akey); const sid = stockId.get(ticker)
    if (!aid || !sid) continue
    const p = perf.get(akey)!
    covRows.push({
      analystId: aid, stockId: sid,
      hitRatio: p.hitRatio === null ? null : p.hitRatio.toFixed(4),
      avgReturn: p.avgRet === null ? null : p.avgRet.toFixed(4),
      avgDays: p.avgDays, totalCalls: g.length,
    })
  }
  for (let i = 0; i < covRows.length; i += 200) {
    await withRetry(() => db.insert(schema.analystCoverage).values(covRows.slice(i, i + 200)), `coverage ${i}`)
  }

  await withRetry(() => db.insert(schema.ingestionLog).values({
    source: 'analyst-calls-load', stocksUpdated: new Set(calls.map(c => c.ticker)).size, status: 'success', durationMs: Date.now() - t0,
  }), 'log')

  console.log(`\nDone. ${analystList.length} analysts, ${targetRows.length} targets, ${covRows.length} coverage rows in ${((Date.now() - t0) / 1000).toFixed(1)}s.`)
  if (skippedNoStock) console.log(`  (skipped ${skippedNoStock} rows with no matching stock)`)
}

main().catch(err => { console.error(err); process.exit(1) })
