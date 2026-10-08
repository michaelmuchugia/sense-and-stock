import 'server-only'

import { readFile } from 'node:fs/promises'
import { parse } from 'csv-parse/sync'
import { db } from '@/lib/db'
import { stocks, stockPrices } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { PriceCsvRowSchema, type MatchedPriceRow } from '@/lib/types/price-csv'
import { matchNseNameToTicker } from './nse-name-map'
import { parseFilenameDate, sanitizeError } from './utils'

export interface PriceFileResult {
  ok: boolean
  filePath: string
  date: string | null
  rowsParsed: number
  rowsMatched: number
  rowsInserted: number
  unmatchedNames: string[]
  affectedTickers: string[]
  error?: string
}

/**
 * Normalize a CSV column header into the canonical key we use internally.
 * Operator may receive headers like "52WK HIGH", "VWAP", "VOLUME" etc.
 */
function normalizeHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

const HEADER_ALIASES: Record<string, string> = {
  '52wkhigh':       'high52w',
  '52whigh':        'high52w',
  'high52w':        'high52w',
  '52wklow':        'low52w',
  '52wlow':         'low52w',
  'low52w':         'low52w',
  'name':           'name',
  'company':        'name',
  'companyname':    'name',
  'isincode':       'isin',
  'isin':           'isin',
  'tradingstatus':  'status',
  'status':         'status',
  'high':           'high',
  'low':            'low',
  'vwap':           'vwap',
  'previousprice':  'previous',
  'previous':       'previous',
  'previousclose':  'previous',
  'volume':         'volume',
}

function parseNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null
  const s = String(raw).trim().replace(/,/g, '')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function parseInteger(raw: unknown): number | null {
  const n = parseNumber(raw)
  if (n === null) return null
  return Math.trunc(n)
}

function isSectorHeaderRow(record: Record<string, string>): boolean {
  // NSE sector header rows have only the name cell filled in (e.g. "BANKING")
  // and everything else empty. Detect that pattern.
  const values = Object.entries(record)
    .filter(([k]) => k !== 'name')
    .map(([, v]) => (v ?? '').trim())
  const allOthersEmpty = values.every(v => v === '')
  const nameHasOnlyLetters = /^[A-Z\s&]+$/.test((record.name ?? '').trim())
  return allOthersEmpty && nameHasOnlyLetters
}

/**
 * Parse + validate + match a single NSE-export CSV file. Does NOT touch the
 * database. Returns the matched rows ready for upsert.
 */
export async function parsePriceCsv(filePath: string): Promise<{
  date: string
  matched: MatchedPriceRow[]
  unmatchedNames: string[]
  rowsParsed: number
}> {
  const date = parseFilenameDate(filePath)
  if (!date) {
    throw new Error(
      `Filename must start with YYYY-MM-DD (e.g. 2026-05-21.csv). ` +
      `Got: ${filePath}`,
    )
  }

  const raw = await readFile(filePath, 'utf8')
  const records = parse(raw, {
    columns: (header: string[]) =>
      header.map(h => HEADER_ALIASES[normalizeHeader(h)] ?? normalizeHeader(h)),
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Record<string, string>[]

  const matched: MatchedPriceRow[] = []
  const unmatchedNames: string[] = []

  for (const record of records) {
    if (!record.name || !record.name.trim()) continue
    if (isSectorHeaderRow(record)) continue

    const candidate = {
      high52w:  parseNumber(record.high52w),
      low52w:   parseNumber(record.low52w),
      name:     String(record.name).trim(),
      isin:     record.isin ? String(record.isin).trim() : null,
      status:   record.status ? String(record.status).trim() : null,
      high:     parseNumber(record.high),
      low:      parseNumber(record.low),
      vwap:     parseNumber(record.vwap),
      previous: parseNumber(record.previous),
      volume:   parseInteger(record.volume),
    }

    const validation = PriceCsvRowSchema.safeParse(candidate)
    if (!validation.success) {
      throw new Error(
        `Row validation failed for "${candidate.name}": ` +
        validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '),
      )
    }
    const row = validation.data

    const ticker = matchNseNameToTicker(row.name)
    if (!ticker) {
      unmatchedNames.push(row.name)
      continue
    }

    // close = VWAP (volume-weighted), fallback to previous if VWAP is missing
    const close = row.vwap ?? row.previous
    if (close === null || close === undefined) {
      // No price information at all for this row — skip
      continue
    }

    const changePct = row.previous && row.previous > 0
      ? ((close - row.previous) / row.previous) * 100
      : undefined

    matched.push({
      ticker,
      date,
      close,
      previous: row.previous ?? undefined,
      high: row.high ?? undefined,
      low: row.low ?? undefined,
      volume: row.volume ?? undefined,
      changePct,
      high52w: row.high52w ?? undefined,
      low52w: row.low52w ?? undefined,
    })
  }

  return { date, matched, unmatchedNames, rowsParsed: records.length }
}

/**
 * Apply parsed price rows to the DB. Uses one INSERT statement with
 * onConflictDoUpdate for the (stock_id, date) unique constraint.
 *
 * Returns counts and the set of tickers that received an upsert so callers
 * (the CLI) can recompute scores for just those stocks.
 */
export async function applyPriceRows(rows: MatchedPriceRow[]): Promise<{
  inserted: number
  affectedTickers: string[]
}> {
  if (!rows.length) return { inserted: 0, affectedTickers: [] }

  // Resolve all tickers in one query
  const dbStocks = await db.select({ id: stocks.id, ticker: stocks.ticker }).from(stocks)
  const stockIdByTicker = new Map(dbStocks.map(s => [s.ticker, s.id]))

  const insertRows: typeof stockPrices.$inferInsert[] = []
  const affected: string[] = []
  for (const row of rows) {
    const stockId = stockIdByTicker.get(row.ticker)
    if (!stockId) continue
    insertRows.push({
      stockId,
      date: row.date,
      close: row.close.toString(),
      open: undefined,
      high: row.high?.toString(),
      low: row.low?.toString(),
      volume: row.volume,
      changePct: row.changePct?.toString(),
      high52w: row.high52w?.toString(),
      low52w: row.low52w?.toString(),
    })
    affected.push(row.ticker)
  }

  if (!insertRows.length) return { inserted: 0, affectedTickers: [] }

  await db
    .insert(stockPrices)
    .values(insertRows)
    .onConflictDoUpdate({
      target: [stockPrices.stockId, stockPrices.date],
      set: {
        close:     sql`excluded.close`,
        high:      sql`excluded.high`,
        low:       sql`excluded.low`,
        volume:    sql`excluded.volume`,
        changePct: sql`excluded.change_pct`,
        high52w:   sql`excluded.high_52w`,
        low52w:    sql`excluded.low_52w`,
      },
    })

  // touch stocks.updated_at for affected tickers — single statement
  if (affected.length) {
    await db
      .update(stocks)
      .set({ updatedAt: new Date() })
      .where(eq(stocks.isActive, true))
  }

  return { inserted: insertRows.length, affectedTickers: affected }
}

/**
 * Full single-file pipeline: parse, validate, apply, report. Never throws —
 * always returns a PriceFileResult so the CLI can decide what to do with it.
 */
export async function processPriceFile(filePath: string): Promise<PriceFileResult> {
  try {
    const { date, matched, unmatchedNames, rowsParsed } = await parsePriceCsv(filePath)
    const { inserted, affectedTickers } = await applyPriceRows(matched)
    return {
      ok: true,
      filePath,
      date,
      rowsParsed,
      rowsMatched: matched.length,
      rowsInserted: inserted,
      unmatchedNames,
      affectedTickers,
    }
  } catch (err) {
    return {
      ok: false,
      filePath,
      date: null,
      rowsParsed: 0,
      rowsMatched: 0,
      rowsInserted: 0,
      unmatchedNames: [],
      affectedTickers: [],
      error: sanitizeError(err, 500),
    }
  }
}
