import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { readdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { processResearchFile } from '../lib/ingest/research-loader'
import { recomputeScoresForTickers } from '../lib/ingest/score-recompute'
import { logIngestionRun } from '../lib/db/queries/ingestion'
import { moveFileWithTimestamp, sanitizeError } from '../lib/ingest/utils'
import { cliWantsRevalidate, pingRevalidate, REVALIDATE_PRESETS } from './_lib/revalidate-client'

const ROOT = resolve(process.cwd(), 'ingest', 'research')
const PROCESSED_DIR = join(ROOT, 'processed')
const FAILED_DIR = join(ROOT, 'failed')

async function listJsonFiles(dir: string): Promise<string[]> {
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return []
  }
  const out: string[] = []
  for (const name of entries) {
    if (!name.toLowerCase().endsWith('.json')) continue
    if (name === 'sample.json.example') continue
    const full = join(dir, name)
    const s = await stat(full)
    if (s.isFile()) out.push(full)
  }
  return out.sort()
}

async function main() {
  const files = await listJsonFiles(ROOT)
  if (!files.length) {
    console.log(`No JSON files in ${ROOT}. Drop one and rerun.`)
    process.exit(0)
  }

  const start = Date.now()
  const allAffected = new Set<string>()

  for (const filePath of files) {
    console.log(`\nProcessing ${filePath}`)
    const result = await processResearchFile(filePath)

    if (result.ok) {
      console.log(`  analyst:      ${result.analystName}`)
      console.log(`  report:       ${result.reportSource}`)
      console.log(`  issued:       ${result.issuedDate}`)
      console.log(`  targets:      ${result.targetsInserted}`)
      console.log(`  tickers:      ${result.affectedTickers.join(', ')}`)
      result.affectedTickers.forEach(t => allAffected.add(t))

      try {
        await moveFileWithTimestamp(filePath, PROCESSED_DIR)
      } catch (err) {
        console.warn(`  could not move processed file: ${sanitizeError(err, 200)}`)
      }

      await logIngestionRun({
        source:        `research_json:${filePath.split(/[\\/]/).pop()}`,
        stocksUpdated: result.targetsInserted,
        status:        'success',
        durationMs:    Date.now() - start,
      })
    } else {
      console.error(`  FAILED: ${result.error}`)
      try {
        await moveFileWithTimestamp(filePath, FAILED_DIR, result.error)
      } catch (err) {
        console.error(`  could not move failed file: ${sanitizeError(err, 200)}`)
      }
      await logIngestionRun({
        source:        `research_json:${filePath.split(/[\\/]/).pop()}`,
        stocksUpdated: 0,
        status:        'failed',
        durationMs:    Date.now() - start,
        errorMessage:  result.error,
      })
    }
  }

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
    const paths = [...REVALIDATE_PRESETS.research!, ...tickerPaths]
    await pingRevalidate(paths)
  }

  console.log(`\nDone in ${Date.now() - start}ms across ${files.length} file(s).`)
  process.exit(0)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
