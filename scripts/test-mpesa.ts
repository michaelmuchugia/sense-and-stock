/**
 * One-off sandbox check: get an OAuth token and fire an STK push.
 * Confirms the Daraja credentials and the request shape are valid.
 *   npx tsx scripts/test-mpesa.ts
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const BASE = process.env.MPESA_ENV === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke'
const KEY = process.env.MPESA_CONSUMER_KEY!
const SECRET = process.env.MPESA_CONSUMER_SECRET!
const SHORTCODE = process.env.MPESA_SHORTCODE!
const PASSKEY = process.env.MPESA_PASSKEY!
const CALLBACK = process.env.MPESA_CALLBACK_URL!
const TEST_PHONE = '254708374149' // Safaricom sandbox test MSISDN

function ts() {
  const d = new Date(); const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

async function main() {
  console.log('env:', process.env.MPESA_ENV, 'shortcode:', SHORTCODE)
  const auth = Buffer.from(`${KEY}:${SECRET}`).toString('base64')
  const tok = await fetch(`${BASE}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${auth}` } })
  const tokText = await tok.text()
  console.log('token status:', tok.status, tokText.slice(0, 200))
  if (!tok.ok) { console.log('AUTH FAILED. Check Consumer Key/Secret (watch for I vs l).'); process.exit(1) }
  const token = JSON.parse(tokText).access_token

  const t = ts()
  const password = Buffer.from(`${SHORTCODE}${PASSKEY}${t}`).toString('base64')
  const body = {
    BusinessShortCode: SHORTCODE, Password: password, Timestamp: t,
    TransactionType: 'CustomerPayBillOnline', Amount: 1,
    PartyA: TEST_PHONE, PartyB: SHORTCODE, PhoneNumber: TEST_PHONE,
    CallBackURL: CALLBACK, AccountReference: 'SenseStock', TransactionDesc: 'Plus test',
  }
  const res = await fetch(`${BASE}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  const out = await res.text()
  console.log('stkpush status:', res.status)
  console.log(out)
  process.exit(0)
}
main().catch(e => { console.error(e); process.exit(1) })
