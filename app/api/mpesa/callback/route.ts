import { NextResponse, type NextRequest } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { grantPlus } from '@/lib/billing/entitlements'
import { sanitizeError } from '@/lib/ingest/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Public endpoint Safaricom calls with the STK result. No Clerk auth (the
 * caller is Safaricom), so we trust it only to resolve a payment we ourselves
 * created, keyed by the CheckoutRequestID we generated. Always returns 200 so
 * Safaricom does not retry a result we have recorded.
 */
export async function POST(req: NextRequest) {
  const ok = NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  try {
    const body = (await req.json()) as {
      Body?: { stkCallback?: { CheckoutRequestID?: string; ResultCode?: number; ResultDesc?: string; CallbackMetadata?: { Item?: { Name: string; Value?: string | number }[] } } }
    }
    const cb = body?.Body?.stkCallback
    const checkoutRequestId = cb?.CheckoutRequestID
    if (!checkoutRequestId) return ok

    const rows = await db.select().from(schema.mpesaPayments).where(eq(schema.mpesaPayments.checkoutRequestId, checkoutRequestId)).limit(1)
    const payment = rows[0]
    if (!payment) return ok                       // not ours
    if (payment.status === 'success') return ok   // already processed (idempotent)

    const resultCode = Number(cb?.ResultCode ?? -1)
    const resultDesc = (cb?.ResultDesc ?? '').slice(0, 500)

    if (resultCode === 0) {
      const items = cb?.CallbackMetadata?.Item ?? []
      const val = (name: string) => items.find(i => i.Name === name)?.Value
      const receipt = String(val('MpesaReceiptNumber') ?? '')
      await db.update(schema.mpesaPayments).set({
        status: 'success', mpesaReceipt: receipt || null, resultCode, resultDesc, updatedAt: new Date(),
      }).where(eq(schema.mpesaPayments.id, payment.id))
      await grantPlus(payment.userId, 1)
    } else {
      const status = resultCode === 1032 ? 'cancelled' : 'failed' // 1032 = user cancelled
      await db.update(schema.mpesaPayments).set({ status, resultCode, resultDesc, updatedAt: new Date() })
        .where(eq(schema.mpesaPayments.id, payment.id))
    }
    return ok
  } catch (err) {
    console.error('mpesa callback error:', sanitizeError(err, 300))
    return ok // never make Safaricom retry on our internal error
  }
}
