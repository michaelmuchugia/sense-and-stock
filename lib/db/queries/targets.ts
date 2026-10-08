import 'server-only'

import { db } from '../index'
import { analystTargets } from '../schema'
import { and, eq } from 'drizzle-orm'

export interface NewTargetInput {
  analystId: number
  stockId: number
  targetPrice: string
  rating: 'Buy' | 'Hold' | 'Sell'
  issuedDate: string
  reportSource?: string
  notes?: string
}

/**
 * Mark any current targets for (analyst, stock) as not-current, then insert
 * the new one as current. Two statements; no transaction (Neon HTTP doesn't
 * support them). The interleave window is acceptable: a concurrent reader at
 * worst sees zero current rows for that pair for a few ms.
 */
export async function supersedeCurrentTarget(input: NewTargetInput) {
  await db
    .update(analystTargets)
    .set({ isCurrent: false })
    .where(and(
      eq(analystTargets.analystId, input.analystId),
      eq(analystTargets.stockId, input.stockId),
      eq(analystTargets.isCurrent, true),
    ))

  return db
    .insert(analystTargets)
    .values({
      analystId:    input.analystId,
      stockId:      input.stockId,
      targetPrice:  input.targetPrice,
      rating:       input.rating,
      issuedDate:   input.issuedDate,
      reportSource: input.reportSource,
      notes:        input.notes,
      isCurrent:    true,
    })
    .returning()
}

export async function getCurrentTargetsForStock(stockId: number) {
  return db
    .select()
    .from(analystTargets)
    .where(and(
      eq(analystTargets.stockId, stockId),
      eq(analystTargets.isCurrent, true),
    ))
}
