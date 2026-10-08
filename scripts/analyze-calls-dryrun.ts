/**
 * Read-only dry run for the Sense&Stock analyst calls import.
 *
 * Reads the calls CSV and the per-ticker price CSVs. Classifies revisions,
 * preserves ratings and date precision, determines the current view by
 * chronology, and computes two separate figures: "target reached on a daily
 * close to date" and "completed 12-month-window accuracy". Writes nothing.
 *
 *   npx tsx scripts/analyze-calls-dryrun.ts
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'csv-parse/sync'

const CALLS = 'C:/Users/user/Desktop/nse/SenseAndStock_calls'
const PRICES_DIR = 'C:/Users/user/Desktop/nse/nse data2015todate/nse_prices'
const ASOF = '2026-10-05'              // evaluation date
const WINDOW_MONTHS = 12               // Sense&Stock chosen methodology
const PRICE_FILE_MAP: Record<string, string> = { HFCK: 'HFCB' } // our ticker -> price filename
const BONUS_EXCLUDE = new Set(['KAPC', 'WTK']) // bonus-adjustment not yet verified

function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1 + months, d))
  return dt.toISOString().slice(0, 10)
}

function titleRating(raw: string): string {
  const r = raw.trim().toUpperCase()
  if (r === 'BUY') return 'Buy'
  if (r === 'HOLD') return 'Hold'
  if (r === 'SELL') return 'Sell'
  if (r === 'TAKE PROFIT') return 'Take Profit'
  return raw.trim()
}

// --- effective date + precision ----------------------------------------------
function effectiveDate(row: Record<string, string>): { date: string | null; precision: 'day' | 'month' | 'unknown' } {
  const ref = (row['price_reference_date'] ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(ref)) return { date: ref, precision: 'day' }
  const pub = (row['publication_date'] ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(pub)) return { date: pub, precision: 'day' }
  if (/^\d{4}-\d{2}$/.test(pub)) return { date: pub + '-01', precision: 'month' }
  return { date: null, precision: 'unknown' }
}

// --- price series ------------------------------------------------------------
type Series = { date: string; close: number }[]
const seriesCache = new Map<string, Series | null>()
function loadSeries(ticker: string): Series | null {
  if (seriesCache.has(ticker)) return seriesCache.get(ticker)!
  const fileTicker = PRICE_FILE_MAP[ticker] ?? ticker
  const path = join(PRICES_DIR, fileTicker + '.csv')
  if (!existsSync(path)) { seriesCache.set(ticker, null); return null }
  const recs = parse(readFileSync(path, 'utf8'), { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[]
  const s: Series = []
  for (const r of recs) {
    const c = Number(r['Close']); const date = (r['Date'] ?? '').slice(0, 10)
    if (Number.isFinite(c) && /^\d{4}-\d{2}-\d{2}$/.test(date)) s.push({ date, close: c })
  }
  s.sort((a, b) => (a.date < b.date ? -1 : 1))
  seriesCache.set(ticker, s)
  return s
}

// did any daily close reach the Buy target within [from, to]?
function reachedBuy(series: Series, target: number, from: string, to: string): { hit: boolean; date: string | null } {
  for (const p of series) {
    if (p.date < from) continue
    if (p.date > to) break
    if (p.close >= target) return { hit: true, date: p.date }
  }
  return { hit: false, date: null }
}

function main() {
  const rows = parse(readFileSync(CALLS, 'utf8'), { columns: true, skip_empty_lines: true, trim: true, bom: true }) as Record<string, string>[]

  const byRating = new Map<string, number>()
  const byFirm = new Map<string, number>()
  const analystKeys = new Map<string, { firm: string; attribution: string; calls: number }>()
  let first = 0, reiter = 0, revision = 0
  const precisionCount = { day: 0, month: 0, unknown: 0 }

  interface Call { ticker: string; analystKey: string; firm: string; rating: string; target: number; date: string | null; precision: 'day' | 'month' | 'unknown' }
  const calls: Call[] = []

  for (const r of rows) {
    const rating = titleRating(r['original_rating'] ?? '')
    byRating.set(rating, (byRating.get(rating) ?? 0) + 1)
    const firm = (r['firm'] ?? '').trim()
    byFirm.set(firm, (byFirm.get(firm) ?? 0) + 1)
    const analyst = (r['analyst_name'] ?? '').trim()
    const key = `${analyst} | ${firm}`
    const ak = analystKeys.get(key) ?? { firm, attribution: (r['attribution_type'] ?? '').split('(')[0].trim(), calls: 0 }
    ak.calls++; analystKeys.set(key, ak)

    const action = (r['action_type'] ?? '').toLowerCase()
    if (action.startsWith('first call')) first++
    else if (action.startsWith('reiteration')) reiter++
    else revision++

    const { date, precision } = effectiveDate(r)
    precisionCount[precision]++
    calls.push({ ticker: (r['ticker'] ?? '').trim().toUpperCase(), analystKey: key, firm, rating, target: Number(r['target_price']), date, precision })
  }

  // current view: latest call per (analystKey, ticker) by date; flag ambiguous
  const groups = new Map<string, Call[]>()
  for (const c of calls) groups.set(`${c.analystKey}@@${c.ticker}`, [...(groups.get(`${c.analystKey}@@${c.ticker}`) ?? []), c])
  let currentTargets = 0, ambiguousOrdering = 0
  for (const [, g] of groups) {
    currentTargets++
    const dated = g.filter(c => c.date).sort((a, b) => (a.date! < b.date! ? 1 : -1)) // newest first
    if (dated.length >= 2 && dated[0].date === dated[1].date) ambiguousOrdering++
  }

  // accuracy: Buy calls only, day-precision, not bonus-excluded, with price data
  let eligibleBuy = 0, matured = 0, hitWithinWindow = 0, reachedToDate = 0
  const excl = { bonus: 0, dateUncertain: 0, notBuy: 0, noPrices: 0, notMatured: 0 }
  const perAnalyst = new Map<string, { calls: number; current: number; eligibleBuy: number; matured: number; hit: number; reached: number }>()

  for (const [key, ak] of analystKeys) perAnalyst.set(key, { calls: ak.calls, current: 0, eligibleBuy: 0, matured: 0, hit: 0, reached: 0 })
  for (const [gk, g] of groups) { const akey = gk.split('@@')[0]; const pa = perAnalyst.get(akey); if (pa) pa.current++ }

  for (const c of calls) {
    const pa = perAnalyst.get(c.analystKey)!
    if (c.rating !== 'Buy') { excl.notBuy++; continue }
    if (BONUS_EXCLUDE.has(c.ticker)) { excl.bonus++; continue }
    if (c.precision !== 'day' || !c.date) { excl.dateUncertain++; continue }
    const series = loadSeries(c.ticker)
    if (!series || !series.length) { excl.noPrices++; continue }
    eligibleBuy++; pa.eligibleBuy++
    const windowEnd = addMonths(c.date, WINDOW_MONTHS)
    // reached to date
    const rtd = reachedBuy(series, c.target, c.date, ASOF)
    if (rtd.hit) { reachedToDate++; pa.reached++ }
    // completed window
    if (windowEnd <= ASOF) {
      matured++; pa.matured++
      const inWin = reachedBuy(series, c.target, c.date, windowEnd)
      if (inWin.hit) { hitWithinWindow++; pa.hit++ }
    } else {
      excl.notMatured++
    }
  }

  // ---- report ----
  const L = (s = '') => console.log(s)
  L('SENSE&STOCK CALLS IMPORT — DRY RUN (no database writes)')
  L(`Methodology: ${WINDOW_MONTHS}-month assessment window (Sense&Stock chosen; no horizon stated in reports). As-of ${ASOF}.`)
  L('')
  L(`Total calls: ${rows.length}`)
  L(`By firm: ${[...byFirm].map(([f, n]) => `${f} ${n}`).join('  |  ')}`)
  L(`By rating (preserved): ${[...byRating].map(([r, n]) => `${r} ${n}`).join('  ')}`)
  L('')
  L('Analysts to create (replacing placeholders):')
  for (const [k, v] of [...analystKeys].sort((a, b) => b[1].calls - a[1].calls)) L(`  ${k.padEnd(52)} ${String(v.calls).padStart(3)} calls   [${v.attribution}]`)
  L('')
  L('Revision reconciliation (from action_type):')
  L(`  first calls: ${first}   reiterations: ${reiter}   genuine revisions: ${revision}   (sum ${first + reiter + revision})`)
  L('')
  L('Date precision:')
  L(`  exact day: ${precisionCount.day}   month-only: ${precisionCount.month}   unknown: ${precisionCount.unknown}`)
  L('')
  L(`Current targets (latest per analyst+stock): ${currentTargets}   ambiguous ordering flagged: ${ambiguousOrdering}`)
  L('')
  L('--- Accuracy figures (Buy targets only) ---')
  L(`Eligible Buy calls (day-dated, priced, not bonus-excluded): ${eligibleBuy}`)
  L(`  A) Target reached on a daily close, to date: ${reachedToDate} of ${eligibleBuy}` + (eligibleBuy ? ` (${(reachedToDate / eligibleBuy * 100).toFixed(0)}%)` : ''))
  L(`  B) Completed 12-month window (matured): ${matured} eligible`)
  L(`     of which target hit within window: ${hitWithinWindow}` + (matured ? ` (${(hitWithinWindow / matured * 100).toFixed(0)}% matured hit-rate, N=${matured})` : ' (N=0, Insufficient history)'))
  L('')
  L('Exclusions with reasons:')
  L(`  not a Buy rating (Hold/Sell/Take Profit): ${excl.notBuy}`)
  L(`  Kapchorua/Williamson bonus-adjustment unverified: ${excl.bonus}`)
  L(`  date uncertain (month-only/unknown): ${excl.dateUncertain}`)
  L(`  no price series: ${excl.noPrices}`)
  L(`  Buy but window not yet matured (pending): ${excl.notMatured}`)
  L('')
  L('Per-analyst (calls / current / eligibleBuy / matured / hit / reachedToDate):')
  for (const [k, v] of [...perAnalyst].sort((a, b) => b[1].calls - a[1].calls)) {
    L(`  ${k.padEnd(52)} ${v.calls}/${v.current}/${v.eligibleBuy}/${v.matured}/${v.hit}/${v.reached}`)
  }
  L('')
  L('No rows written. Review before production load.')
}

main()
