import '@/lib/internal/server-only'

import { getAllStocks, type ResolvedStock } from '@/lib/api/stocks'
import { getScoresMap } from '@/lib/api/scores'
import type { Stock } from '@/lib/types/stock'
import type { AQScore, SignalClass } from '@/lib/types/signal'
import { genInsight } from '@/lib/engine/score'
import { calculateHiddenGemScore, calculateRiskLevel, type RiskLevel } from '@/lib/engine/risk'
import type { Provenance } from '@/lib/api/meta'

/**
 * Phase 3 engine wrappers.
 *
 * Everything here reads through `lib/api/*` (DB-first with mock fallback)
 * and uses precomputed scores from `stock_scores`. The pure score formula
 * lives in `lib/engine/score-pure.ts`; we never call it on the request path.
 *
 * `genInsight` is kept as-is (it imports from lib/data/analysts), which is
 * safe because the seeded analysts in DB match those entries 1:1 by id.
 * A future phase can swap it to a DB-backed lookup.
 */

export interface SignalOfTheWeek {
  sym: string
  name: string
  signal: string
  sigClass: SignalClass
  score: number
  risk: RiskLevel
  upside: number
  conf: 'high' | 'med' | 'low'
  insight: string
  price: number
  target: number
  analysts: number
  hit: number
  signalDate: string
  sec: string
  provenance: Provenance
}

export async function getSignalOfTheWeek(): Promise<SignalOfTheWeek | null> {
  const [stocks, scores] = await Promise.all([getAllStocks(), getScoresMap()])
  const ranked = stocks
    .filter(s => s.p > 0 && s.a >= 3)
    .map(s => ({ s, aq: scores.get(s.s) }))
    .filter((x): x is { s: ResolvedStock; aq: AQScore } => x.aq !== undefined)
    .sort((a, b) => b.aq.score - a.aq.score)
  if (!ranked.length) return null
  const { s, aq } = ranked[0]
  return {
    sym:        s.s,
    name:       s.n,
    signal:     aq.signal,
    sigClass:   aq.sigClass,
    score:      aq.score,
    risk:       calculateRiskLevel(s),
    upside:     aq.upside_pct,
    conf:       aq.conf,
    insight:    genInsight(s, aq),
    price:      s.p,
    target:     s.avgPT,
    analysts:   s.a,
    hit:        s.hit,
    signalDate: '21 Apr 2026',
    sec:        s.sec,
    provenance: s._provenance,
  }
}

export interface HiddenOpportunity {
  s: Stock
  aq: AQScore
  upside: number
  gemScore: number
  provenance: Provenance
}

export async function getHiddenOpportunities(): Promise<HiddenOpportunity[]> {
  const [stocks, scores] = await Promise.all([getAllStocks(), getScoresMap()])
  return stocks
    .filter(s => {
      if (!s.p || s.p <= 0) return false
      if (s.a > 2) return false
      const upside = s.avgPT > 0 ? ((s.avgPT - s.p) / s.p) * 100 : 0
      if (upside < 20) return false
      const pos52 = s.h52 > s.l52 ? (s.p - s.l52) / (s.h52 - s.l52) : 0.5
      return s.c > 0 || pos52 > 0.45
    })
    .map(resolved => {
      const aq = scores.get(resolved.s)
      if (!aq) return null
      const upside = resolved.avgPT > 0 ? ((resolved.avgPT - resolved.p) / resolved.p) * 100 : 0
      const { _provenance, ...stock } = resolved
      return {
        s:          stock,
        aq,
        upside,
        gemScore:   calculateHiddenGemScore(stock),
        provenance: _provenance,
      }
    })
    .filter((x): x is HiddenOpportunity => x !== null)
    .sort((a, b) => b.gemScore - a.gemScore)
    .slice(0, 6)
}

export interface TopOpportunity {
  s: Stock
  aq: AQScore
  provenance: Provenance
}

export async function getTopOpportunities(limit = 8): Promise<TopOpportunity[]> {
  const [stocks, scores] = await Promise.all([getAllStocks(), getScoresMap()])
  return stocks
    .filter(s => s.p > 0 && s.a > 0)
    .map(resolved => {
      const aq = scores.get(resolved.s)
      if (!aq) return null
      const { _provenance, ...stock } = resolved
      return { s: stock, aq, provenance: _provenance }
    })
    .filter((x): x is TopOpportunity => x !== null)
    .sort((a, b) => b.aq.score - a.aq.score)
    .slice(0, limit)
}

/**
 * Score-map helpers — used by /smartscreen, /dashboard, etc.
 * (Async wrappers around getScoresMap for backward-compat with the prior
 *  sync engine signature.)
 */
export async function scoreAllStocks(): Promise<Map<string, AQScore>> {
  return getScoresMap()
}

export async function scoreAllStocksRecord(): Promise<Record<string, AQScore>> {
  const map = await getScoresMap()
  const rec: Record<string, AQScore> = {}
  for (const [k, v] of map) rec[k] = v
  return rec
}
