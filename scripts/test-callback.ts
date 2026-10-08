/**
 * Simulate Safaricom posting a successful STK result to our callback, to prove
 * the full loop: pending payment -> callback -> payment success + Plus granted.
 * Local only. Requires the dev server on :3000.
 *   npx tsx scripts/test-callback.ts
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { sql, eq } from 'drizzle-orm'
import * as schema from '../lib/db/schema'

const db = drizzle(neon(process.env.DATABASE_URL!), { schema })

async function main() {
  const users = await db.select({ id: schema.users.clerkUserId, email: schema.users.email }).from(schema.users).limit(1)
  if (!users.length) { console.log('No users in DB to test against.'); process.exit(1) }
  const user = users[0]
  console.log('Testing against user:', user.email)

  const checkoutId = 'TESTCB_' + Date.now()
  await db.insert(schema.mpesaPayments).values({
    userId: user.id, phone: '254708374149', amount: 750, plan: 'plus', status: 'pending', checkoutRequestId: checkoutId,
  })
  console.log('Inserted pending payment:', checkoutId)

  const callback = {
    Body: { stkCallback: {
      MerchantRequestID: 'test-merchant', CheckoutRequestID: checkoutId,
      ResultCode: 0, ResultDesc: 'The service request is processed successfully.',
      CallbackMetadata: { Item: [
        { Name: 'Amount', Value: 750 },
        { Name: 'MpesaReceiptNumber', Value: 'TEST' + Date.now().toString().slice(-7) },
        { Name: 'PhoneNumber', Value: 254708374149 },
      ] },
    } },
  }
  const res = await fetch('http://localhost:3000/api/mpesa/callback', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(callback),
  })
  console.log('callback responded:', res.status, await res.text())

  // read back
  const pay = await db.select().from(schema.mpesaPayments).where(eq(schema.mpesaPayments.checkoutRequestId, checkoutId)).limit(1)
  const subRows = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, user.id)).limit(1)
  console.log('payment status:', pay[0]?.status, 'receipt:', pay[0]?.mpesaReceipt)
  const s = subRows[0]
  console.log('subscription:', s ? `plan=${s.plan} status=${s.status} expires=${s.expiresAt?.toISOString()}` : 'none')
  process.exit(0)
}
main().catch(e => { console.error(e); process.exit(1) })
