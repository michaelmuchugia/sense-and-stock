import { NextResponse, type NextRequest } from 'next/server'
import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { upsertUser, hardDeleteUser } from '@/lib/db/queries/users'
import { logActivity } from '@/lib/auth/activity'
import { sendWelcomeEmail } from '@/lib/email/send'
import { sanitizeError } from '@/lib/ingest/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Clerk user lifecycle webhook.
 *
 * Security: verifyWebhook() validates the Svix signature against
 * CLERK_WEBHOOK_SIGNING_SECRET. An unsigned/tampered/stale request throws
 * and we return 400 without touching the DB. Once verified, the payload is
 * authentic Clerk data, so we use it directly (no re-fetch needed).
 *
 * Idempotent: created/updated both upsert; re-delivery is a no-op state-wise.
 */
export async function POST(req: NextRequest) {
  let evt
  try {
    evt = await verifyWebhook(req)
  } catch (err) {
    console.error('clerk webhook verification failed:', sanitizeError(err, 200))
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (evt.type) {
      case 'user.created':
      case 'user.updated': {
        const d = evt.data
        const email =
          d.email_addresses?.find(e => e.id === d.primary_email_address_id)?.email_address ??
          d.email_addresses?.[0]?.email_address ??
          ''
        const name = [d.first_name, d.last_name].filter(Boolean).join(' ') || null

        await upsertUser({
          clerkUserId: d.id,
          email,
          name,
          imageUrl: d.image_url ?? null,
        })

        if (evt.type === 'user.created') {
          await logActivity(d.id, 'user_created', { detail: email })
          // Fire-and-forget welcome; never blocks the 200.
          await sendWelcomeEmail({ to: email, name })
        }
        break
      }

      case 'user.deleted': {
        // d.id present on deletion events; d.deleted === true
        const id = evt.data.id
        if (id) await hardDeleteUser(id)
        break
      }

      case 'session.created': {
        const uid = evt.data.user_id
        if (uid) await logActivity(uid, 'signin')
        break
      }

      case 'session.removed':
      case 'session.ended':
      case 'session.revoked': {
        const uid = evt.data.user_id
        if (uid) await logActivity(uid, 'signout')
        break
      }

      default:
        // Unhandled event types are acknowledged so Clerk stops retrying.
        break
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('clerk webhook handler error:', sanitizeError(err, 500))
    // Return 500 so Clerk retries — the DB write may have transiently failed.
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }
}
