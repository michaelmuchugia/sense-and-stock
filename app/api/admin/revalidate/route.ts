import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { authorizeBearer, clientIp, rateLimit } from '@/lib/api/auth'
import { revalidatePaths, DB_BACKED_ROUTES } from '@/lib/api/revalidate'
import { sanitizeError } from '@/lib/ingest/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RATE_LIMIT_MAX = 30 // higher than recompute-scores because CLIs may call this frequently during a backfill

const RequestBody = z
  .object({
    paths: z.array(z.string().min(1).max(200)).max(50).optional(),
  })
  .strict()

/**
 * Defensive path whitelist. Even with the admin secret, an attacker who
 * obtained it should not be able to force revalidation of arbitrary
 * Next-internal routes. We accept either a value from DB_BACKED_ROUTES,
 * a dynamic-stock route (`/stocks/<TICKER>`), or a dynamic-analyst route
 * (`/analysts/<digits>`).
 */
const ALLOWED_PREFIXES: ReadonlyArray<RegExp> = [
  /^\/stocks\/[A-Z0-9]{1,10}$/,
  /^\/analysts\/\d{1,8}$/,
]

function isAllowedPath(p: string): boolean {
  if ((DB_BACKED_ROUTES as readonly string[]).includes(p)) return true
  return ALLOWED_PREFIXES.some(re => re.test(p))
}

async function handle(req: NextRequest): Promise<NextResponse> {
  const ip = clientIp(req)
  if (!rateLimit('admin:revalidate', ip, RATE_LIMIT_MAX)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
  }

  if (!authorizeBearer(req, 'ADMIN_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  try {
    // POST may have a JSON body; GET defaults to "revalidate everything".
    let parsedPaths: string[] | undefined
    if (req.method === 'POST') {
      const raw = await req.text()
      if (raw.length > 0) {
        let json: unknown
        try {
          json = JSON.parse(raw)
        } catch {
          return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
        }
        const parse = RequestBody.safeParse(json)
        if (!parse.success) {
          return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
        }
        parsedPaths = parse.data.paths
      }
    }

    // Filter to the whitelist; reject if any submitted path is invalid.
    if (parsedPaths) {
      const rejected = parsedPaths.filter(p => !isAllowedPath(p))
      if (rejected.length > 0) {
        return NextResponse.json(
          { error: 'Bad Request', detail: 'one or more paths are not revalidatable' },
          { status: 400 },
        )
      }
    }

    const revalidated = revalidatePaths(parsedPaths)
    const durationMs = Date.now() - start

    return NextResponse.json({
      success:    true,
      revalidated,
      count:      revalidated.length,
      durationMs,
    })
  } catch (err) {
    const detail = sanitizeError(err, 500)
    console.error('admin:revalidate failed:', detail)
    return NextResponse.json({ error: 'Revalidate failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}
