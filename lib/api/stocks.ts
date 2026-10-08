/**
 * Stocks resolver — DB first, prototype mock as per-field fallback.
 *
 * Reads three DB sources and blends them with the mock `STOCKS` array:
 *   1. `stocks` table       — ticker, name, sector, profile  (always DB; seeded)
 *   2. `analyst_coverage`   — a (count), hit, days, pts      (always DB; seeded)
 *   3. `stock_prices`       — p, c, h52, l52, vol            (DB if row exists)
 *   4. `analyst_targets`    — avgPT, buy, hold, sell         (DB if current rows exist)
 *
 * `_provenance` is computed from the price source and the target source.
 * Coverage and metadata are always DB, so they don't factor in.
 */

import '@/lib/internal/server-only'

import { cache } from 'react'
import { db, schema, withDbRetry } from '@/lib/db'
import { and, eq, sql } from 'drizzle-orm'
import { STOCKS as MOCK_STOCKS } from '@/lib/data/stocks'
import type { Stock } from '@/lib/types/stock'
import { resolveProvenance, type Provenance, fallbackDebug } from './meta'

export interface ResolvedStock extends Stock {
  _provenance: Provenance
}

interface PriceRow {
  stockId: number
  close: string
  changePct: string | null
  high52w: string | null
  low52w: string | null
  volume: number | null
}

interface CoverageAgg {
  stockId: number
  analystCount: number
  avgHit: number
  avgDays: number | null
  totalCalls: number
}

interface TargetAgg {
  stockId: number
  avgTarget: number
  buyPct: number
  holdPct: number
  sellPct: number
}

const MOCK_BY_TICKER = new Map(MOCK_STOCKS.map(s => [s.s, s]))

function num(v: string | null | undefined, fallback = 0): number {
  if (v === null || v === undefined || v === '') return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function formatVolume(v: number | null): string | null {
  if (v === null || v === undefined) return null
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(0) + 'K'
  return String(v)
}

async function loadLatestPrices(): Promise<Map<number, PriceRow>> {
  // Postgres subquery: get the most recent date per stockId, then join back.
  const maxDates = db
    .select({
      stockId: schema.stockPrices.stockId,
      maxDate: sql<string>`max(${schema.stockPrices.date})`.as('max_date'),
    })
    .from(schema.stockPrices)
    .groupBy(schema.stockPrices.stockId)
    .as('max_dates')

  const rows = await db
    .select({
      stockId:    schema.stockPrices.stockId,
      close:      schema.stockPrices.close,
      changePct:  schema.stockPrices.changePct,
      high52w:    schema.stockPrices.high52w,
      low52w:     schema.stockPrices.low52w,
      volume:     schema.stockPrices.volume,
    })
    .from(schema.stockPrices)
    .innerJoin(
      maxDates,
      and(
        eq(schema.stockPrices.stockId, maxDates.stockId),
        eq(schema.stockPrices.date, maxDates.maxDate),
      ),
    )

  return new Map(rows.map(r => [r.stockId, r]))
}

async function loadCoverageAgg(): Promise<Map<number, CoverageAgg>> {
  const rows = await db
    .select({
      stockId:       schema.analystCoverage.stockId,
      analystCount:  sql<number>`count(distinct ${schema.analystCoverage.analystId})::int`,
      avgHit:        sql<number>`coalesce(avg(${schema.analystCoverage.hitRatio}), 0)::float`,
      avgDays:       sql<number>`coalesce(avg(${schema.analystCoverage.avgDays}), 0)::int`,
      totalCalls:    sql<number>`coalesce(sum(${schema.analystCoverage.totalCalls}), 0)::int`,
    })
    .from(schema.analystCoverage)
    .groupBy(schema.analystCoverage.stockId)

  return new Map(rows.map(r => [r.stockId, r]))
}

async function loadCurrentTargetsAgg(): Promise<Map<number, TargetAgg>> {
  const rows = await db
    .select({
      stockId:    schema.analystTargets.stockId,
      total:      sql<number>`count(*)::int`,
      avgTarget:  sql<number>`avg(${schema.analystTargets.targetPrice})::float`,
      buyCount:   sql<number>`count(*) filter (where ${schema.analystTargets.rating} = 'Buy')::int`,
      holdCount:  sql<number>`count(*) filter (where ${schema.analystTargets.rating} = 'Hold')::int`,
      sellCount:  sql<number>`count(*) filter (where ${schema.analystTargets.rating} = 'Sell')::int`,
    })
    .from(schema.analystTargets)
    .where(eq(schema.analystTargets.isCurrent, true))
    .groupBy(schema.analystTargets.stockId)

  const map = new Map<number, TargetAgg>()
  for (const r of rows) {
    if (r.total === 0) continue
    const pct = (n: number) => Math.round((n / r.total) * 100)
    map.set(r.stockId, {
      stockId:  r.stockId,
      avgTarget: Number(r.avgTarget) || 0,
      buyPct:   pct(r.buyCount),
      holdPct:  pct(r.holdCount),
      sellPct:  pct(r.sellCount),
    })
  }
  return map
}

interface DbStockRow {
  id: number
  ticker: string
  name: string
  sector: string | null
  profile: string | null
}

function buildResolved(
  row: DbStockRow,
  prices: Map<number, PriceRow>,
  coverage: Map<number, CoverageAgg>,
  targets: Map<number, TargetAgg>,
): ResolvedStock {
  const mock = MOCK_BY_TICKER.get(row.ticker)
  const price = prices.get(row.id)
  const cov = coverage.get(row.id)
  const tgt = targets.get(row.id)

  const priceFromDb = price !== undefined
  const targetFromDb = tgt !== undefined

  const resolved: ResolvedStock = {
    s:     row.ticker,
    n:     row.name,
    sec:   row.sector ?? mock?.sec ?? '',
    prof:  row.profile ?? mock?.prof ?? '',

    // Coverage is real-only. No fixture fallback, so a stock with no analyst
    // calls in our dataset reads as uncovered (0) rather than borrowing sample
    // named-analyst numbers.
    a:     cov?.analystCount  ?? 0,
    hit:   cov?.avgHit        ?? 0,
    days:  cov?.avgDays       ?? 0,
    pts:   cov?.totalCalls    ?? 0,

    // Price: DB when present, mock only as a last resort for the handful of
    // suspended or unlisted tickers with no price series.
    p:     priceFromDb ? num(price!.close)     : (mock?.p   ?? 0),
    c:     priceFromDb ? num(price!.changePct) : (mock?.c   ?? 0),
    h52:   priceFromDb ? num(price!.high52w)   : (mock?.h52 ?? 0),
    l52:   priceFromDb ? num(price!.low52w)    : (mock?.l52 ?? 0),
    vol:   priceFromDb ? (formatVolume(price!.volume) ?? 'N/A') : (mock?.vol ?? 'N/A'),

    // Targets are real-only. No fixture fallback.
    avgPT: targetFromDb ? tgt!.avgTarget : 0,
    buy:   targetFromDb ? tgt!.buyPct    : 0,
    hold:  targetFromDb ? tgt!.holdPct   : 0,
    sell:  targetFromDb ? tgt!.sellPct   : 0,

    _provenance: resolveProvenance(priceFromDb, targetFromDb),
  }

  if (process.env.NODE_ENV === 'development' && !mock && (!priceFromDb || !targetFromDb)) {
    console.debug(
      fallbackDebug('stock', row.ticker, [
        priceFromDb ? null : 'price',
        targetFromDb ? null : 'targets',
      ].filter(Boolean) as string[]),
    )
  }

  return resolved
}

/**
 * Resolve every active stock — used by /stocks, /smartscreen, home page widgets.
 * Wrapped in React's `cache()` so multiple components calling this within
 * a single render share one DB round-trip.
 */
export const getAllStocks = cache(_getAllStocks)

async function _getAllStocks(): Promise<ResolvedStock[]> {
  const [stocksRows, prices, coverage, targets] = await withDbRetry(() => Promise.all([
    db
      .select({
        id:      schema.stocks.id,
        ticker:  schema.stocks.ticker,
        name:    schema.stocks.name,
        sector:  schema.stocks.sector,
        profile: schema.stocks.profile,
      })
      .from(schema.stocks)
      .where(eq(schema.stocks.isActive, true)),
    loadLatestPrices(),
    loadCoverageAgg(),
    loadCurrentTargetsAgg(),
  ]))

  return stocksRows.map(r => buildResolved(r, prices, coverage, targets))
}

/**
 * Resolve a single stock by ticker. Returns null if the ticker isn't in DB.
 *
 * Implementation: loads the full set (one round-trip batch) and filters in
 * memory. For 65 stocks this is faster than four targeted queries.
 */
export async function getStockByTicker(ticker: string): Promise<ResolvedStock | null> {
  const clean = ticker.trim().toUpperCase()
  if (!clean) return null
  const all = await getAllStocks()
  return all.find(s => s.s === clean) ?? null
}

/**
 * Resolve all stock tickers (used by generateStaticParams).
 */
export async function getAllTickers(): Promise<string[]> {
  const rows = await db
    .select({ ticker: schema.stocks.ticker })
    .from(schema.stocks)
    .where(eq(schema.stocks.isActive, true))
  return rows.map(r => r.ticker)
}
