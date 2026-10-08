import { NextResponse, type NextRequest } from 'next/server'
import { authorizeBearer, clientIp, rateLimit } from '@/lib/api/auth'
import { logIngestionRun } from '@/lib/db/queries/ingestion'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RATE_LIMIT_MAX = 5

/**
 * Phase 2 status: AUTOMATED INGEST DISABLED.
 *
 * NSE publishes daily equity prices as PDFs flattened by PDFill PDF Editor.
 * No Node PDF library can extract text from them (zero items returned). For
 * Phase 2 we use a manual CSV upload workflow:
 *   npm run ingest:prices
 * after the operator exports the daily NSE PDF to CSV.
 *
 * This endpoint is kept (with full auth + rate-limit) so Phase 2.5 can swap
 * in a vision-OCR auto-ingest without changing the URL or schedule contract.
 * Until then the handler returns 503 with a clear message and logs a
 * "skipped" entry to ingestion_log.
 */
async function handle(req: NextRequest): Promise<NextResponse> {
  const ip = clientIp(req)
  if (!rateLimit('cron:ingest-prices', ip, RATE_LIMIT_MAX)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
  }

  if (!authorizeBearer(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  await logIngestionRun({
    source:        'nse_scraper',
    stocksUpdated: 0,
    status:        'partial',
    durationMs:    Date.now() - start,
    errorMessage:  'automated ingest disabled in phase 2; use npm run ingest:prices',
  })

  return NextResponse.json(
    {
      success:        false,
      automated:      false,
      stocksUpdated:  0,
      message:        'NSE publishes prices as flattened PDFs (no extractable text). Manual workflow only in Phase 2: download PDF, export to CSV via Acrobat, drop in ingest/prices/, run "npm run ingest:prices". Phase 2.5 will add vision-OCR auto-ingest.',
    },
    { status: 503 },
  )
}

export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}
