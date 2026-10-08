/**
 * Scores resolver — reads the precomputed `stock_scores` table.
 *
 * Phase 2's `recomputeAllScores` ensures every active stock has a row.
 * Server components NEVER call `calcScore` at request time — they read
 * the precomputed values from here.
 *
 * If a stock unexpectedly lacks a row (it shouldn't), the resolver
 * returns null and the caller is responsible for either falling back
 * to a default rendering or computing on-the-fly via the engine.
 */

import '@/lib/internal/server-only'

import { cache } from 'react'
import { db, schema, withDbRetry } from '@/lib/db'
import { eq } from 'drizzle-orm'
import type { AQScore, Confidence, SignalClass } from '@/lib/types/signal'

interface ScoreRow {
  stockId: number
  score: number
  signal: string | null
  sigClass: string | null
  confidence: string | null
  upsidePct: string | null
  pillarConfidence: number | null
  pillarAccuracy: number | null
  pillarUpside: number | null
  pillarMomentum: number | null
}

function rowToAQ(r: ScoreRow): AQScore {
  return {
    score:      r.score,
    signal:     r.signal ?? 'No Data',
    sigClass:   (r.sigClass as SignalClass | null) ?? 'ne',
    conf:       (r.confidence as Confidence | null) ?? 'low',
    upside_pct: r.upsidePct !== null ? Number(r.upsidePct) : 0,
    pillars: {
      confidence: r.pillarConfidence ?? 0,
      accuracy:   r.pillarAccuracy   ?? 0,
      upside:     r.pillarUpside     ?? 0,
      momentum:   r.pillarMomentum   ?? 0,
    },
  }
}

/**
 * Map from ticker -> AQScore. Used by list pages that score many stocks.
 * React `cache()` shares the result across components within one render.
 */
export const getScoresMap = cache(_getScoresMap)

async function _getScoresMap(): Promise<Map<string, AQScore>> {
  const rows = await withDbRetry(() => db
    .select({
      ticker:           schema.stocks.ticker,
      stockId:          schema.stockScores.stockId,
      score:            schema.stockScores.score,
      signal:           schema.stockScores.signal,
      sigClass:         schema.stockScores.sigClass,
      confidence:       schema.stockScores.confidence,
      upsidePct:        schema.stockScores.upsidePct,
      pillarConfidence: schema.stockScores.pillarConfidence,
      pillarAccuracy:   schema.stockScores.pillarAccuracy,
      pillarUpside:     schema.stockScores.pillarUpside,
      pillarMomentum:   schema.stockScores.pillarMomentum,
    })
    .from(schema.stockScores)
    .innerJoin(schema.stocks, eq(schema.stocks.id, schema.stockScores.stockId)))

  const map = new Map<string, AQScore>()
  for (const r of rows) {
    map.set(r.ticker, rowToAQ(r))
  }
  return map
}

/**
 * Single-stock score lookup by ticker.
 */
export async function getScoreByTicker(ticker: string): Promise<AQScore | null> {
  const clean = ticker.trim().toUpperCase()
  if (!clean) return null
  const rows = await db
    .select({
      stockId:          schema.stockScores.stockId,
      score:            schema.stockScores.score,
      signal:           schema.stockScores.signal,
      sigClass:         schema.stockScores.sigClass,
      confidence:       schema.stockScores.confidence,
      upsidePct:        schema.stockScores.upsidePct,
      pillarConfidence: schema.stockScores.pillarConfidence,
      pillarAccuracy:   schema.stockScores.pillarAccuracy,
      pillarUpside:     schema.stockScores.pillarUpside,
      pillarMomentum:   schema.stockScores.pillarMomentum,
    })
    .from(schema.stockScores)
    .innerJoin(schema.stocks, eq(schema.stocks.id, schema.stockScores.stockId))
    .where(eq(schema.stocks.ticker, clean))
    .limit(1)
  if (rows.length === 0) return null
  return rowToAQ(rows[0])
}
