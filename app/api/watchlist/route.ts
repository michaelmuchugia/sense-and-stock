import { NextResponse, type NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth/server'
import { getWatchlistTickers } from '@/lib/db/queries/watchlist'
import { clientIp, rateLimit } from '@/lib/api/auth'
import { sanitizeError } from '@/lib/ingest/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const userId = await requireUser()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit('watchlist:get', clientIp(req), 60)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
  }

  try {
    const tickers = await getWatchlistTickers(userId)
    return NextResponse.json({ tickers })
  } catch (err) {
    console.error('watchlist GET failed:', sanitizeError(err, 300))
    return NextResponse.json({ error: 'Failed to load watchlist' }, { status: 500 })
  }
}
