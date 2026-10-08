import { NextResponse, type NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth/server'
import { addToWatchlist, removeFromWatchlist } from '@/lib/db/queries/watchlist'
import { logActivity } from '@/lib/auth/activity'
import { clientIp, rateLimit } from '@/lib/api/auth'
import { sanitizeError } from '@/lib/ingest/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TICKER_RE = /^[A-Z0-9]{1,10}$/

function normalizeTicker(raw: string): string | null {
  const t = decodeURIComponent(raw).trim().toUpperCase()
  return TICKER_RE.test(t) ? t : null
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ ticker: string }> }) {
  const userId = await requireUser()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!rateLimit('watchlist:mutate', clientIp(req), 60)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
  }

  const { ticker: raw } = await ctx.params
  const ticker = normalizeTicker(raw)
  if (!ticker) return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 })

  try {
    const { ok, total } = await addToWatchlist(userId, ticker)
    if (!ok) return NextResponse.json({ error: 'Unknown ticker' }, { status: 404 })
    await logActivity(userId, 'watchlist_add', { detail: ticker, headers: req.headers })
    return NextResponse.json({ added: true, total })
  } catch (err) {
    console.error('watchlist add failed:', sanitizeError(err, 300))
    return NextResponse.json({ error: 'Failed to add' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ ticker: string }> }) {
  const userId = await requireUser()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!rateLimit('watchlist:mutate', clientIp(req), 60)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
  }

  const { ticker: raw } = await ctx.params
  const ticker = normalizeTicker(raw)
  if (!ticker) return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 })

  try {
    const { ok, total } = await removeFromWatchlist(userId, ticker)
    if (!ok) return NextResponse.json({ error: 'Unknown ticker' }, { status: 404 })
    await logActivity(userId, 'watchlist_remove', { detail: ticker, headers: req.headers })
    return NextResponse.json({ removed: true, total })
  } catch (err) {
    console.error('watchlist remove failed:', sanitizeError(err, 300))
    return NextResponse.json({ error: 'Failed to remove' }, { status: 500 })
  }
}
