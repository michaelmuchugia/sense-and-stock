import 'server-only'

import { db } from '../index'
import { stockScores } from '../schema'
import { eq } from 'drizzle-orm'
import type { AQScore } from '@/lib/types/signal'

export async function upsertScore(stockId: number, score: AQScore) {
  const payload = {
    stockId,
    score:              score.score,
    signal:             score.signal,
    sigClass:           score.sigClass,
    confidence:         score.conf,
    upsidePct:          score.upside_pct.toString(),
    pillarConfidence:   score.pillars.confidence,
    pillarAccuracy:     score.pillars.accuracy,
    pillarUpside:       score.pillars.upside,
    pillarMomentum:     score.pillars.momentum,
    calculatedAt:       new Date(),
  }

  return db
    .insert(stockScores)
    .values(payload)
    .onConflictDoUpdate({
      target: stockScores.stockId,
      set: {
        score:              payload.score,
        signal:             payload.signal,
        sigClass:           payload.sigClass,
        confidence:         payload.confidence,
        upsidePct:          payload.upsidePct,
        pillarConfidence:   payload.pillarConfidence,
        pillarAccuracy:     payload.pillarAccuracy,
        pillarUpside:       payload.pillarUpside,
        pillarMomentum:     payload.pillarMomentum,
        calculatedAt:       payload.calculatedAt,
      },
    })
    .returning()
}

export async function getScoreByStockId(stockId: number) {
  const result = await db
    .select()
    .from(stockScores)
    .where(eq(stockScores.stockId, stockId))
    .limit(1)
  return result[0] ?? null
}

export async function getAllScores() {
  return db.select().from(stockScores)
}
