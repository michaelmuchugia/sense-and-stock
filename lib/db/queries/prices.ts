import 'server-only'

import { db } from '../index'
import { stockPrices } from '../schema'
import { desc, eq } from 'drizzle-orm'

export interface PriceInput {
  stockId: number
  date: string
  close: string
  open?: string
  high?: string
  low?: string
  volume?: number
  changePct?: string
  high52w?: string
  low52w?: string
}

export async function upsertPrice(data: PriceInput) {
  return db
    .insert(stockPrices)
    .values(data)
    .onConflictDoUpdate({
      target: [stockPrices.stockId, stockPrices.date],
      set: {
        close:     data.close,
        open:      data.open,
        high:      data.high,
        low:       data.low,
        volume:    data.volume,
        changePct: data.changePct,
        high52w:   data.high52w,
        low52w:    data.low52w,
      },
    })
    .returning()
}

export async function upsertPricesBatch(rows: PriceInput[]) {
  let count = 0
  for (const row of rows) {
    await upsertPrice(row)
    count++
  }
  return count
}

export async function getLatestPrice(stockId: number) {
  const result = await db
    .select()
    .from(stockPrices)
    .where(eq(stockPrices.stockId, stockId))
    .orderBy(desc(stockPrices.date))
    .limit(1)
  return result[0] ?? null
}

export async function getPriceHistory(stockId: number, limit = 365) {
  return db
    .select()
    .from(stockPrices)
    .where(eq(stockPrices.stockId, stockId))
    .orderBy(desc(stockPrices.date))
    .limit(limit)
}
