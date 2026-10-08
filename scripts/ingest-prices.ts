import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { readdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { processPriceFile } from '../lib/ingest/price-loader'
import { recomputeScoresForTickers } from '../lib/ingest/score-recompute'
import { logIngestionRun } from '../lib/db/queries/ingestion'
import { moveFileWithTimestamp, sanitizeError } from '../lib/ingest/utils'
import { cliWantsRevalidate, pingRevalidate, REVALIDATE_PRESETS } from './_lib/revalidate-client'

const PRICES_DIR = resolve(process.cwd(), 'ingest', 'prices')
const PROCESSED_DIR = join(PRICES_DIR, 'processed')
const FAILED_DIR = join(PRICES_DIR, 'failed')

async function listCsvFiles(dir: string): Promise<string[]> {
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return []
  }
  const out: string[] = []
  for (const name of entries) {
    if (!name.toLowerCase().endsWith('.csv')) continue
    if (name === 'sample.csv.example') continue
    const full = join(dir, name)
    const s = await stat(full)
    if (s.isFile()) out.push(full)
  }
  return out.sort()
}

async function main() {
  const files = await listCsvFiles(PRICES_DIR)
  if (!files.length) {
    console.log(`No CSV files in ${PRICES_DIR}. Drop a YYYY-MM-DD.csv there and rerun.`)
    process.exit(0)
  }

  const start = Date.now()
  let totalInserted = 0
  const allAffected = new Set<string>()
  const fileSummaries: string[] = []

  for (const filePath of files) {
    console.log(`\nProcessing ${filePath}`)
    const result = await processPriceFile(filePath)

    if (result.ok) {
      console.log(`  date:        ${result.date}`)
      console.log(`  rows parsed: ${result.rowsParsed}`)
      console.log(`  rows matched: ${result.rowsMatched}`)
      console.log(`  rows upserted: ${result.rowsInserted}`)
      if (result.unmatchedNames.length) {
        console.warn(`  unmatched names (add to nse-name-map.ts):`)
        for (const n of result.unmatchedNames) console.warn(`    - ${n}`)
      }
      totalInserted += result.rowsInserted
      result.affectedTickers.forEach(t => allAffected.add(t))
      fileSummaries.push(`${filePath}: ok, ${result.rowsInserted} upserted`)

      try {
        await moveFileWithTimestamp(filePath, PROCESSED_DIR)
      } catch (err) {
        console.warn(`  could not move processed file: ${sanitizeError(err, 200)}`)
      }

      await logIngestionRun({
        source:        `prices_csv:${filePath.split(/[\\/]/).pop()}`,
        stocksUpdated: result.rowsInserted,
        status:        result.unmatchedNames.length ? 'partial' : 'success',
        durationMs:    Date.now() - start,
        errorMessage:  result.unmatchedNames.length
          ? `unmatched names: ${result.unmatchedNames.slice(0, 5).join(', ')}${result.unmatchedNames.length > 5 ? ' (...)' : ''}`
          : undefined,
      })
    } else {
      console.error(`  FAILED: ${result.error}`)
      fileSummaries.push(`${filePath}: FAILED - ${result.error}`)
      try {
        await moveFileWithTimestamp(filePath, FAILED_DIR, result.error)
      } catch (err) {
        console.error(`  could not move failed file: ${sanitizeError(err, 200)}`)
      }
      await logIngestionRun({
        source:        `prices_csv:${filePath.split(/[\\/]/).pop()}`,
        stocksUpdated: 0,
        status:        'failed',
        durationMs:    Date.now() - start,
        errorMessage:  result.error,
      })
    }
  }

  // Score recompute for affected stocks
  if (allAffected.size > 0) {
    console.log(`\nRecomputing scores for ${allAffected.size} affected ticker(s)...`)
    const scoreResult = await recomputeScoresForTickers(Array.from(allAffected))
    console.log(`  ${scoreResult.updated} score(s) upserted in ${scoreResult.durationMs}ms`)
    if (scoreResult.failed.length) {
      console.warn(`  failed: ${scoreResult.failed.map(f => `${f.ticker} (${f.reason})`).join('; ')}`)
    }
  }

  if (cliWantsRevalidate(process.argv)) {
    const tickerPaths = Array.from(allAffected).map(t => `/stocks/${t}`)
    const paths = [...REVALIDATE_PRESETS.prices!, ...tickerPaths]
    await pingRevalidate(paths)
  }

  console.log(`\nDone in ${Date.now() - start}ms. Total upserted: ${totalInserted} rows across ${files.length} file(s).`)
  process.exit(0)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
