import { NextResponse, type NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth/server'
import { db, schema } from '@/lib/db'
import { and, eq } from 'drizzle-orm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * The Subscribe page polls this while the customer approves on their phone.
 * Scoped to the signed-in user's own payment so one person cannot read another.
 */
export async function GET(req: NextRequest) {
  const userId = await requireUser()
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const checkoutRequestId = req.nextUrl.searchParams.get('checkoutRequestId') ?? ''
  if (!checkoutRequestId) return NextResponse.json({ error: 'Missing checkoutRequestId' }, { status: 400 })

  const rows = await db.select({
    status: schema.mpesaPayments.status,
    receipt: schema.mpesaPayments.mpesaReceipt,
    resultDesc: schema.mpesaPayments.resultDesc,
  }).from(schema.mpesaPayments)
    .where(and(eq(schema.mpesaPayments.checkoutRequestId, checkoutRequestId), eq(schema.mpesaPayments.userId, userId)))
    .limit(1)

  const row = rows[0]
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ status: row.status, receipt: row.receipt, note: row.resultDesc })
}
