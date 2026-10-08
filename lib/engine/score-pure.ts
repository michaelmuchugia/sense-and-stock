// Pure score engine — no data imports, no DB, no side effects.
// Safe to call from any context (server or client, mock or DB).
// Single source of truth for the Sense&Stock scoring algorithm.

import type { AQScore, SignalClass, Confidence } from '@/lib/types/signal'

export interface ScoreInputs {
  analystCount: number      // a
  averagePriceTarget: number // avgPT
  price: number             // p
  buyPct: number            // buy
  hitRatio: number          // hit
  high52w: number           // h52
  low52w: number            // l52
  dayChangePct: number      // c
  coveringAnalystScores: number[]  // perf_score per covering analyst
}

/**
 * Canonical Sense&Stock Score formula.
 *
 *   Score = (Analyst Confidence * 0.30)
 *         + (Analyst Accuracy   * 0.25)
 *         + (Upside Potential   * 0.20)
 *         + (Momentum           * 0.25)
 *
 * Multiplied by a confidence multiplier based on analyst count:
 *   a >= 3 → 1.00 (high)
 *   a 1-2  → 0.88 (med)
 *   a = 0  → 0.60 (low)
 *
 * Band thresholds:
 *   >=72  → Strong Match (sm)
 *   >=55  → Watch        (wa)
 *   >=38  → Neutral      (ne)
 *   < 38  → Low Match    (lm)
 */
export function calcScoreFromInputs(input: ScoreInputs): AQScore {
  const {
    analystCount: a,
    averagePriceTarget: avgPT,
    price: p,
    buyPct,
    hitRatio,
    high52w: h52,
    low52w: l52,
    dayChangePct: c,
    coveringAnalystScores,
  } = input

  const up = avgPT > 0 && p > 0 ? ((avgPT - p) / p) * 100 : 0

  let confidence = 0
  if (a > 0) {
    const bS = buyPct || 0
    const cS = Math.min((a / 6) * 100, 100)
    confidence = Math.min(bS * 0.65 + cS * 0.35, 100)
  }

  let accuracy = 0
  if (a > 0) {
    const best = coveringAnalystScores.length ? Math.max(...coveringAnalystScores) : 0
    accuracy = Math.min((hitRatio || 0) * 0.70 + Math.min((best / 2.5) * 100, 100) * 0.30, 100)
  }

  let uScore = 0
  if (a > 0 && p > 0) {
    uScore = Math.max(0, Math.min((up / 30) * 100, 100))
  }

  let mom = 40
  if (p > 0 && h52 > 0 && l52 >= 0) {
    const rng = h52 - l52
    if (rng > 0) {
      const pos = ((p - l52) / rng) * 100
      const dn = Math.max(0, Math.min(((c + 5) / 10) * 100, 100))
      mom = Math.round(pos * 0.60 + dn * 0.40)
    }
  }

  const conf: Confidence = a === 0 ? 'low' : a <= 2 ? 'med' : 'high'
  const cm = conf === 'high' ? 1.0 : conf === 'med' ? 0.88 : 0.60
  const raw = confidence * 0.30 + accuracy * 0.25 + uScore * 0.20 + mom * 0.25
  const score = Math.round(Math.min(raw * cm, 100))

  let signal: string
  let sigClass: SignalClass
  if (a === 0) {
    signal = 'No Data'
    sigClass = 'ne'
  } else if (score >= 72) {
    signal = 'Strong Match'
    sigClass = 'sm'
  } else if (score >= 55) {
    signal = 'Watch'
    sigClass = 'wa'
  } else if (score >= 38) {
    signal = 'Neutral'
    sigClass = 'ne'
  } else {
    signal = 'Low Match'
    sigClass = 'lm'
  }

  return {
    score,
    signal,
    sigClass,
    conf,
    upside_pct: up,
    pillars: {
      confidence: Math.round(confidence),
      accuracy: Math.round(accuracy),
      upside: Math.round(uScore),
      momentum: Math.round(mom),
    },
  }
}
