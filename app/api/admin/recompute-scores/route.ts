import { NextResponse, type NextRequest } from 'next/server'
import { authorizeBearer, clientIp, rateLimit } from '@/lib/api/auth'
import { recomputeAllScores } from '@/lib/ingest/score-recompute'
import { logIngestionRun } from '@/lib/db/queries/ingestion'
import { sanitizeError } from '@/lib/ingest/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RATE_LIMIT_MAX = 5

async function handle(req: NextRequest): Promise<NextResponse> {
  const ip = clientIp(req)
  if (!rateLimit('admin:recompute-scores', ip, RATE_LIMIT_MAX)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
  }

  if (!authorizeBearer(req, 'ADMIN_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  try {
    const result = await recomputeAllScores()
    const durationMs = Date.now() - start

    await logIngestionRun({
      source:        'score_recompute_admin',
      stocksUpdated: result.updated,
      status:        result.failed.length ? 'partial' : 'success',
      durationMs,
      errorMessage:  result.failed.length
        ? `failed: ${result.failed.map(f => f.ticker).slice(0, 10).join(', ')}`
        : undefined,
    })

    return NextResponse.json({
      success:  true,
      updated:  result.updated,
      failed:   result.failed.length,
      durationMs,
    })
  } catch (err) {
    const durationMs = Date.now() - start
    const detail = sanitizeError(err, 500)
    console.error('admin:recompute-scores failed:', detail)

    try {
      await logIngestionRun({
        source:        'score_recompute_admin',
        stocksUpdated: 0,
        status:        'failed',
        durationMs,
        errorMessage:  detail,
      })
    } catch (logErr) {
      console.error('failed to write ingestion_log:', logErr)
    }

    return NextResponse.json({ error: 'Recompute failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}
