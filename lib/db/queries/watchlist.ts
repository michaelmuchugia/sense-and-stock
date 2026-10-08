import '@/lib/internal/server-only'

import { db, schema } from '@/lib/db'
import { and, eq, inArray } from 'drizzle-orm'

/**
 * All watchlist mutations are scoped by clerkUserId — the caller (API route)
 * is responsible for supplying the authenticated user's id. These functions
 * never derive identity themselves.
 */

export async function getWatchlistTickers(userId: string): Promise<string[]> {
  const rows = await db
    .select({ ticker: schema.stocks.ticker })
    .from(schema.watchlistItems)
    .innerJoin(schema.stocks, eq(schema.stocks.id, schema.watchlistItems.stockId))
    .where(eq(schema.watchlistItems.userId, userId))
  return rows.map(r => r.ticker)
}

async function stockIdForTicker(ticker: string): Promise<number | null> {
  const rows = await db
    .select({ id: schema.stocks.id })
    .from(schema.stocks)
    .where(eq(schema.stocks.ticker, ticker.toUpperCase()))
    .limit(1)
  return rows[0]?.id ?? null
}

/** Returns { ok, total } — ok=false means the ticker doesn't exist. */
export async function addToWatchlist(userId: string, ticker: string): Promise<{ ok: boolean; total: number }> {
  const stockId = await stockIdForTicker(ticker)
  if (!stockId) return { ok: false, total: (await getWatchlistTickers(userId)).length }
  await db
    .insert(schema.watchlistItems)
    .values({ userId, stockId })
    .onConflictDoNothing({ target: [schema.watchlistItems.userId, schema.watchlistItems.stockId] })
  const total = (await getWatchlistTickers(userId)).length
  return { ok: true, total }
}

export async function removeFromWatchlist(userId: string, ticker: string): Promise<{ ok: boolean; total: number }> {
  const stockId = await stockIdForTicker(ticker)
  if (!stockId) return { ok: false, total: (await getWatchlistTickers(userId)).length }
  await db
    .delete(schema.watchlistItems)
    .where(and(eq(schema.watchlistItems.userId, userId), eq(schema.watchlistItems.stockId, stockId)))
  const total = (await getWatchlistTickers(userId)).length
  return { ok: true, total }
}

/** Bulk import from localStorage migration. Only known tickers are inserted. */
export async function importWatchlist(userId: string, tickers: string[]): Promise<{ imported: number; skipped: number }> {
  const wanted = [...new Set(tickers.map(t => t.toUpperCase()))]
  if (!wanted.length) return { imported: 0, skipped: 0 }

  const known = await db
    .select({ id: schema.stocks.id, ticker: schema.stocks.ticker })
    .from(schema.stocks)
    .where(inArray(schema.stocks.ticker, wanted))

  const knownTickers = new Set(known.map(k => k.ticker))
  const skipped = wanted.filter(t => !knownTickers.has(t)).length

  if (known.length) {
    await db
      .insert(schema.watchlistItems)
      .values(known.map(k => ({ userId, stockId: k.id })))
      .onConflictDoNothing({ target: [schema.watchlistItems.userId, schema.watchlistItems.stockId] })
  }

  return { imported: known.length, skipped }
}
