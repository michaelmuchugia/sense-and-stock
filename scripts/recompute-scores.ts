import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { recomputeAllScores } from '../lib/ingest/score-recompute'
import { logIngestionRun } from '../lib/db/queries/ingestion'
import { cliWantsRevalidate, pingRevalidate, REVALIDATE_PRESETS } from './_lib/revalidate-client'

async function main() {
  const start = Date.now()
  console.log('Recomputing AfriQuant scores for all active stocks...')
  const result = await recomputeAllScores()
  const durationMs = Date.now() - start

  console.log(`  updated:    ${result.updated}`)
  console.log(`  failed:     ${result.failed.length}`)
  console.log(`  duration:   ${durationMs}ms`)
  if (result.failed.length) {
    for (const f of result.failed) console.warn(`    - ${f.ticker}: ${f.reason}`)
  }

  await logIngestionRun({
    source:        'score_recompute_cli',
    stocksUpdated: result.updated,
    status:        result.failed.length ? 'partial' : 'success',
    durationMs,
    errorMessage:  result.failed.length
      ? `failed: ${result.failed.map(f => f.ticker).slice(0, 10).join(', ')}`
      : undefined,
  })

  if (cliWantsRevalidate(process.argv)) {
    await pingRevalidate([...REVALIDATE_PRESETS.scores])
  }

  process.exit(0)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
