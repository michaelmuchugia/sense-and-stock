import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { readdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { processAnalystFile } from '../lib/ingest/analyst-loader'
import { logIngestionRun } from '../lib/db/queries/ingestion'
import { moveFileWithTimestamp, sanitizeError } from '../lib/ingest/utils'
import { cliWantsRevalidate, pingRevalidate, REVALIDATE_PRESETS } from './_lib/revalidate-client'

const ROOT = resolve(process.cwd(), 'ingest', 'analysts')
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
  for (const filePath of files) {
    console.log(`\nProcessing ${filePath}`)
    const result = await processAnalystFile(filePath)

    if (result.ok) {
      console.log(`  analysts attempted: ${result.analystsAttempted}`)
      console.log(`  analysts inserted:  ${result.analystsInserted} (others skipped as duplicate external_id)`)

      try {
        await moveFileWithTimestamp(filePath, PROCESSED_DIR)
      } catch (err) {
        console.warn(`  could not move processed file: ${sanitizeError(err, 200)}`)
      }

      await logIngestionRun({
        source:        `analysts_json:${filePath.split(/[\\/]/).pop()}`,
        stocksUpdated: result.analystsInserted,
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
        source:        `analysts_json:${filePath.split(/[\\/]/).pop()}`,
        stocksUpdated: 0,
        status:        'failed',
        durationMs:    Date.now() - start,
        errorMessage:  result.error,
      })
    }
  }

  if (cliWantsRevalidate(process.argv)) {
    await pingRevalidate([...REVALIDATE_PRESETS.analysts])
  }

  console.log(`\nDone in ${Date.now() - start}ms across ${files.length} file(s).`)
  process.exit(0)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
