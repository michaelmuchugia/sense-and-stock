import 'server-only'

import { db } from '@/lib/db'
import {
  stocks,
  analysts,
  analystCoverage,
  analystTargets,
  stockPrices,
  stockScores,
} from '@/lib/db/schema'
import { eq, and, sql, desc, inArray } from 'drizzle-orm'
import { calcScoreFromInputs } from '@/lib/engine/score-pure'
import { sanitizeError } from './utils'

export interface RecomputeResult {
  updated: number
  failed: { ticker: string; reason: string }[]
  durationMs: number
}

interface ScoringContext {
  stockRows: { id: number; ticker: string }[]
  targetsByStock: Map<number, { rating: string | null; targetPrice: string }[]>
  coverageByStock: Map<number, { hitRatio: string | null; perfScore: string | null }[]>
  latestPriceByStock: Map<number, {
    close: string
    changePct: string | null
    high52w: string | null
    low52w: string | null
  }>
}

async function loadScoringContext(tickerFilter?: string[]): Promise<ScoringContext> {
  // 1. Stocks (optionally filtered)
  const stockRows = tickerFilter && tickerFilter.length
    ? await db
        .select({ id: stocks.id, ticker: stocks.ticker })
        .from(stocks)
        .where(and(eq(stocks.isActive, true), inArray(stocks.ticker, tickerFilter)))
    : await db
        .select({ id: stocks.id, ticker: stocks.ticker })
        .from(stocks)
        .where(eq(stocks.isActive, true))

  const stockIds = stockRows.map(s => s.id)
  if (!stockIds.length) {
    return {
      stockRows: [],
      targetsByStock: new Map(),
      coverageByStock: new Map(),
      latestPriceByStock: new Map(),
    }
  }

  // 2. Current targets, only for in-scope stocks
  const targetRows = await db
    .select({
      stockId: analystTargets.stockId,
      rating: analystTargets.rating,
      targetPrice: analystTargets.targetPrice,
    })
    .from(analystTargets)
    .where(and(
      eq(analystTargets.isCurrent, true),
      inArray(analystTargets.stockId, stockIds),
    ))

  const targetsByStock = new Map<number, { rating: string | null; targetPrice: string }[]>()
  for (const t of targetRows) {
    if (!targetsByStock.has(t.stockId)) targetsByStock.set(t.stockId, [])
    targetsByStock.get(t.stockId)!.push({ rating: t.rating, targetPrice: t.targetPrice })
  }

  // 3. Coverage joined to analysts to get perf_score
  const coverageRows = await db
    .select({
      stockId: analystCoverage.stockId,
      hitRatio: analystCoverage.hitRatio,
      perfScore: analysts.perfScore,
    })
    .from(analystCoverage)
    .innerJoin(analysts, eq(analysts.id, analystCoverage.analystId))
    .where(inArray(analystCoverage.stockId, stockIds))

  const coverageByStock = new Map<number, { hitRatio: string | null; perfScore: string | null }[]>()
  for (const c of coverageRows) {
    if (!coverageByStock.has(c.stockId)) coverageByStock.set(c.stockId, [])
    coverageByStock.get(c.stockId)!.push({ hitRatio: c.hitRatio, perfScore: c.perfScore })
  }

  // 4. Latest price per stock. Postgres DISTINCT ON would be cleanest;
  // Drizzle exposes it but the neon-http driver works fine with a sorted
  // fetch + in-memory dedupe given our scale (~65 stocks, ~365 prices/year).
  const priceRows = await db
    .select({
      stockId: stockPrices.stockId,
      close: stockPrices.close,
      changePct: stockPrices.changePct,
      high52w: stockPrices.high52w,
      low52w: stockPrices.low52w,
      date: stockPrices.date,
    })
    .from(stockPrices)
    .where(inArray(stockPrices.stockId, stockIds))
    .orderBy(desc(stockPrices.date))

  const latestPriceByStock = new Map<number, ScoringContext['latestPriceByStock'] extends Map<number, infer V> ? V : never>()
  for (const p of priceRows) {
    if (!latestPriceByStock.has(p.stockId)) {
      latestPriceByStock.set(p.stockId, {
        close: p.close,
        changePct: p.changePct,
        high52w: p.high52w,
        low52w: p.low52w,
      })
    }
  }

  return { stockRows, targetsByStock, coverageByStock, latestPriceByStock }
}

function toNumberOrZero(v: string | null | undefined): number {
  if (v === null || v === undefined) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

async function recompute(tickerFilter?: string[]): Promise<RecomputeResult> {
  const start = Date.now()
  const ctx = await loadScoringContext(tickerFilter)

  const upsertRows: typeof stockScores.$inferInsert[] = []
  const failed: { ticker: string; reason: string }[] = []
  const now = new Date()

  for (const stock of ctx.stockRows) {
    try {
      const targets = ctx.targetsByStock.get(stock.id) ?? []
      const coverage = ctx.coverageByStock.get(stock.id) ?? []
      const price = ctx.latestPriceByStock.get(stock.id)

      const analystCount = coverage.length
      const targetPrices = targets.map(t => toNumberOrZero(t.targetPrice)).filter(p => p > 0)
      const averagePriceTarget = targetPrices.length
        ? targetPrices.reduce((s, x) => s + x, 0) / targetPrices.length
        : 0

      const total = targets.length
      const buyPct = total > 0
        ? (targets.filter(t => t.rating === 'Buy').length / total) * 100
        : 0

      const hitRatios = coverage
        .map(c => toNumberOrZero(c.hitRatio))
        .filter(r => r > 0)
      const hitRatio = hitRatios.length
        ? hitRatios.reduce((s, x) => s + x, 0) / hitRatios.length
        : 0

      const coveringAnalystScores = coverage
        .map(c => toNumberOrZero(c.perfScore))
        .filter(s => s > 0)

      const result = calcScoreFromInputs({
        analystCount,
        averagePriceTarget,
        price:        toNumberOrZero(price?.close),
        buyPct,
        hitRatio,
        high52w:      toNumberOrZero(price?.high52w),
        low52w:       toNumberOrZero(price?.low52w),
        dayChangePct: toNumberOrZero(price?.changePct),
        coveringAnalystScores,
      })

      upsertRows.push({
        stockId:          stock.id,
        score:            result.score,
        signal:           result.signal,
        sigClass:         result.sigClass,
        confidence:       result.conf,
        upsidePct:        result.upside_pct.toString(),
        pillarConfidence: result.pillars.confidence,
        pillarAccuracy:   result.pillars.accuracy,
        pillarUpside:     result.pillars.upside,
        pillarMomentum:   result.pillars.momentum,
        calculatedAt:     now,
      })
    } catch (err) {
      failed.push({ ticker: stock.ticker, reason: sanitizeError(err, 200) })
    }
  }

  if (upsertRows.length) {
    await db
      .insert(stockScores)
      .values(upsertRows)
      .onConflictDoUpdate({
        target: stockScores.stockId,
        set: {
          score:            sql`excluded.score`,
          signal:           sql`excluded.signal`,
          sigClass:         sql`excluded.sig_class`,
          confidence:       sql`excluded.confidence`,
          upsidePct:        sql`excluded.upside_pct`,
          pillarConfidence: sql`excluded.pillar_confidence`,
          pillarAccuracy:   sql`excluded.pillar_accuracy`,
          pillarUpside:     sql`excluded.pillar_upside`,
          pillarMomentum:   sql`excluded.pillar_momentum`,
          calculatedAt:     sql`excluded.calculated_at`,
        },
      })
  }

  return {
    updated: upsertRows.length,
    failed,
    durationMs: Date.now() - start,
  }
}

export async function recomputeAllScores(): Promise<RecomputeResult> {
  return recompute()
}

export async function recomputeScoresForTickers(tickers: string[]): Promise<RecomputeResult> {
  if (!tickers.length) {
    return { updated: 0, failed: [], durationMs: 0 }
  }
  return recompute(tickers)
}
