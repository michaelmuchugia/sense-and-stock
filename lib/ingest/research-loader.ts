import 'server-only'

import { readFile } from 'node:fs/promises'
import { db } from '@/lib/db'
import { stocks, analysts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { ResearchFileSchema, type ResearchFile } from '@/lib/types/research'
import { supersedeCurrentTarget } from '@/lib/db/queries/targets'
import { sanitizeError } from './utils'

export interface ResearchFileResult {
  ok: boolean
  filePath: string
  analystName?: string
  reportSource?: string
  issuedDate?: string
  targetsInserted: number
  affectedTickers: string[]
  error?: string
}

export async function processResearchFile(absolutePath: string): Promise<ResearchFileResult> {
  let parsed: ResearchFile
  try {
    const raw = await readFile(absolutePath, 'utf8')
    const json = JSON.parse(raw)
    const validation = ResearchFileSchema.safeParse(json)
    if (!validation.success) {
      const issues = validation.error.issues
        .map(i => `${i.path.join('.') || '<root>'}: ${i.message}`)
        .join('; ')
      throw new Error(`Schema validation failed: ${issues}`)
    }
    parsed = validation.data
  } catch (err) {
    return {
      ok: false,
      filePath: absolutePath,
      targetsInserted: 0,
      affectedTickers: [],
      error: sanitizeError(err, 800),
    }
  }

  try {
    // Resolve analyst by external_id
    const analystRow = await db
      .select({ id: analysts.id, name: analysts.name })
      .from(analysts)
      .where(eq(analysts.externalId, parsed.analyst_external_id))
      .limit(1)

    if (!analystRow[0]) {
      throw new Error(
        `Unknown analyst_external_id=${parsed.analyst_external_id}. ` +
        `Add the analyst first via npm run ingest:analysts.`,
      )
    }
    const analystId = analystRow[0].id
    const analystName = analystRow[0].name

    // Resolve tickers in one query
    const tickerSet = Array.from(new Set(parsed.targets.map(t => t.ticker.toUpperCase())))
    const dbStocks = await db
      .select({ id: stocks.id, ticker: stocks.ticker })
      .from(stocks)
    const stockIdByTicker = new Map(dbStocks.map(s => [s.ticker, s.id]))
    const missing = tickerSet.filter(t => !stockIdByTicker.has(t))
    if (missing.length) {
      throw new Error(`Unknown ticker(s): ${missing.join(', ')}`)
    }

    let inserted = 0
    const affected = new Set<string>()
    for (const target of parsed.targets) {
      const ticker = target.ticker.toUpperCase()
      const stockId = stockIdByTicker.get(ticker)
      if (!stockId) continue
      await supersedeCurrentTarget({
        analystId,
        stockId,
        targetPrice:  target.target_price.toString(),
        rating:       target.rating,
        issuedDate:   parsed.issued_date,
        reportSource: parsed.report_source,
        notes:        target.notes,
      })
      inserted++
      affected.add(ticker)
    }

    return {
      ok: true,
      filePath: absolutePath,
      analystName,
      reportSource: parsed.report_source,
      issuedDate: parsed.issued_date,
      targetsInserted: inserted,
      affectedTickers: Array.from(affected),
    }
  } catch (err) {
    return {
      ok: false,
      filePath: absolutePath,
      targetsInserted: 0,
      affectedTickers: [],
      error: sanitizeError(err, 800),
    }
  }
}
