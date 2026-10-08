import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/auth/server'
import { importWatchlist } from '@/lib/db/queries/watchlist'
import { logActivity } from '@/lib/auth/activity'
import { clientIp, rateLimit } from '@/lib/api/auth'
import { sanitizeError } from '@/lib/ingest/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z
  .object({
    tickers: z
      .array(z.string().regex(/^[A-Za-z0-9]{1,10}$/))
      .max(100),
  })
  .strict()

export async function POST(req: NextRequest) {
  const userId = await requireUser()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!rateLimit('watchlist:import', clientIp(req), 10)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
  }
  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
  }

  try {
    const { imported, skipped } = await importWatchlist(userId, parsed.data.tickers)
    await logActivity(userId, 'watchlist_import', {
      detail: `imported ${imported}, skipped ${skipped}`,
      headers: req.headers,
    })
    return NextResponse.json({ imported, skipped })
  } catch (err) {
    console.error('watchlist import failed:', sanitizeError(err, 300))
    return NextResponse.json({ error: 'Failed to import' }, { status: 500 })
  }
}
