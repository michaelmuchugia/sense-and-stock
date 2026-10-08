import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/auth/server'
import { clientIp, rateLimit } from '@/lib/api/auth'
import { db, schema } from '@/lib/db'
import { stkPush, normalizePhone, mpesaConfigured } from '@/lib/mpesa/client'
import { sanitizeError } from '@/lib/ingest/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PLUS_PRICE_KES = 750

const Body = z.object({ phone: z.string().min(9).max(15) }).strict()

export async function POST(req: NextRequest) {
  const userId = await requireUser()
  if (!userId) return NextResponse.json({ error: 'Please sign in to subscribe.' }, { status: 401 })

  if (!rateLimit('mpesa', userId, 5)) {
    return NextResponse.json({ error: 'Too many attempts. Please wait a moment and try again.' }, { status: 429 })
  }
  if (!mpesaConfigured()) {
    return NextResponse.json({ error: 'Payments are not available yet. Please check back shortly.' }, { status: 503 })
  }

  let json: unknown
  try { json = await req.json() } catch { return NextResponse.json({ error: 'Bad Request' }, { status: 400 }) }
  const parsed = Body.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 })

  const phone = normalizePhone(parsed.data.phone)
  if (!phone) return NextResponse.json({ error: 'That does not look like a valid Safaricom number.' }, { status: 400 })

  try {
    const result = await stkPush({
      phone,
      amount: PLUS_PRICE_KES,
      accountRef: 'SenseStock',
      description: 'Plus monthly',
    })
    if (!result.ok || !result.checkoutRequestId) {
      return NextResponse.json({ error: result.error ?? 'Could not start the payment.' }, { status: 502 })
    }
    await db.insert(schema.mpesaPayments).values({
      userId, phone, amount: PLUS_PRICE_KES, plan: 'plus', status: 'pending',
      checkoutRequestId: result.checkoutRequestId, merchantRequestId: result.merchantRequestId,
    })
    return NextResponse.json({ ok: true, checkoutRequestId: result.checkoutRequestId, message: result.customerMessage ?? 'Check your phone to enter your M-Pesa PIN.' })
  } catch (err) {
    console.error('mpesa stkpush error:', sanitizeError(err, 300))
    return NextResponse.json({ error: 'Something went wrong starting the payment. Please try again.' }, { status: 500 })
  }
}
