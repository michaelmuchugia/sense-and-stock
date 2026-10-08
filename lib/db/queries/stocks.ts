import 'server-only'

import { db } from '../index'
import { stocks } from '../schema'
import { eq } from 'drizzle-orm'

export async function getAllStocks() {
  return db.select().from(stocks).where(eq(stocks.isActive, true))
}

export async function getStockByTicker(ticker: string) {
  const normalized = ticker.trim().toUpperCase()
  if (!normalized) return null
  const result = await db
    .select()
    .from(stocks)
    .where(eq(stocks.ticker, normalized))
    .limit(1)
  return result[0] ?? null
}

export async function upsertStock(data: {
  ticker: string
  name: string
  sector?: string
  profile?: string
}) {
  return db
    .insert(stocks)
    .values({
      ticker:  data.ticker,
      name:    data.name,
      sector:  data.sector,
      profile: data.profile,
    })
    .onConflictDoUpdate({
      target: stocks.ticker,
      set: {
        name:      data.name,
        sector:    data.sector,
        profile:   data.profile,
        updatedAt: new Date(),
      },
    })
    .returning()
}
