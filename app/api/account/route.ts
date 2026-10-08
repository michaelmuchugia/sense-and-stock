import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { clerkClient, currentUser } from '@clerk/nextjs/server'
import { requireUser } from '@/lib/auth/server'
import { softDeleteUser } from '@/lib/db/queries/users'
import { logActivity } from '@/lib/auth/activity'
import { clientIp, rateLimit, safeStringEqual } from '@/lib/api/auth'
import { sanitizeError } from '@/lib/ingest/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({ confirmEmail: z.string().trim().min(1).max(255) }).strict()

/**
 * Account deletion. Requires the user to retype their primary email; we
 * re-verify it server-side (case-insensitive, constant-time) before deleting
 * from Clerk. Clerk then fires user.deleted → webhook hard-deletes our row
 * (cascading watchlist + activity). We also soft-delete immediately so reads
 * are refused even before the webhook lands.
 */
export async function DELETE(req: NextRequest) {
  const userId = await requireUser()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!rateLimit('account:delete', clientIp(req), 5)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
  }

  let json: unknown
  try { json = await req.json() } catch { return NextResponse.json({ error: 'Bad Request' }, { status: 400 }) }
  const parsed = Body.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: 'Bad Request' }, { status: 400 })

  const me = await currentUser()
  const primaryEmail = me?.primaryEmailAddress?.emailAddress ?? me?.emailAddresses[0]?.emailAddress ?? ''
  const typed = parsed.data.confirmEmail.toLowerCase()
  if (!primaryEmail || !safeStringEqual(typed, primaryEmail.toLowerCase())) {
    return NextResponse.json({ error: 'Email does not match' }, { status: 400 })
  }

  try {
    await logActivity(userId, 'account_deletion_initiated', { headers: req.headers })
    await softDeleteUser(userId)            // refuse reads immediately
    const client = await clerkClient()
    await client.users.deleteUser(userId)   // fires user.deleted webhook → hard delete + cascade
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('account deletion failed:', sanitizeError(err, 300))
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
