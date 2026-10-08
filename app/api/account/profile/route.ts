import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { requireUser } from '@/lib/auth/server'
import { updateUserProfile } from '@/lib/db/queries/users'
import { logActivity } from '@/lib/auth/activity'
import { clientIp, rateLimit } from '@/lib/api/auth'
import { sanitizeError } from '@/lib/ingest/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Name: 1-80 visible chars. Phone: optional E.164-ish (digits, +, spaces, -).
const Body = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    phone: z.string().trim().max(30).regex(/^[+0-9 ()-]*$/, 'invalid phone').optional().or(z.literal('')),
  })
  .strict()

export async function PATCH(req: NextRequest) {
  const userId = await requireUser()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!rateLimit('account:profile', clientIp(req), 20)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
  }

  let json: unknown
  try { json = await req.json() } catch { return NextResponse.json({ error: 'Bad Request' }, { status: 400 }) }
  const parsed = Body.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: 'Bad Request' }, { status: 400 })

  const { name, phone } = parsed.data

  try {
    // Sync display name to Clerk so the navbar/avatar reflect it immediately.
    if (name !== undefined) {
      const parts = name.split(/\s+/)
      const firstName = parts[0] ?? ''
      const lastName = parts.slice(1).join(' ') || ''
      const client = await clerkClient()
      await client.users.updateUser(userId, { firstName, lastName })
    }

    // Persist to our DB (name mirror + phone, which Clerk doesn't hold for us).
    await updateUserProfile(userId, {
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phone: phone === '' ? null : phone } : {}),
    })

    await logActivity(userId, 'profile_update', {
      detail: [name !== undefined ? 'name' : null, phone !== undefined ? 'phone' : null].filter(Boolean).join(', '),
      headers: req.headers,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('profile update failed:', sanitizeError(err, 300))
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
