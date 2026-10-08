import '@/lib/internal/server-only'

import { getEnv } from '@/lib/db/env'

/**
 * M-Pesa Daraja STK Push client (Lipa na M-Pesa Online).
 *
 * Sandbox and production share the same shapes; only the base URL differs.
 * Nothing here persists state. The routes own the database side.
 */

function base(): string {
  return getEnv().MPESA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke'
}

export function mpesaConfigured(): boolean {
  const e = getEnv()
  return Boolean(e.MPESA_CONSUMER_KEY && e.MPESA_CONSUMER_SECRET && e.MPESA_SHORTCODE && e.MPESA_PASSKEY && e.MPESA_CALLBACK_URL)
}

/**
 * Normalize a Kenyan number to the 2547XXXXXXXX / 2541XXXXXXXX form Daraja
 * expects. Returns null if it cannot be made valid.
 */
export function normalizePhone(raw: string): string | null {
  const digits = (raw ?? '').replace(/\D/g, '')
  let n = digits
  if (n.startsWith('0')) n = '254' + n.slice(1)           // 07.. / 01.. -> 2547.. / 2541..
  else if (n.startsWith('7') || n.startsWith('1')) n = '254' + n
  else if (n.startsWith('2540')) n = '254' + n.slice(4)   // stray 2540..
  if (/^254[17]\d{8}$/.test(n)) return n
  return null
}

async function accessToken(): Promise<string> {
  const e = getEnv()
  const auth = Buffer.from(`${e.MPESA_CONSUMER_KEY}:${e.MPESA_CONSUMER_SECRET}`).toString('base64')
  const res = await fetch(`${base()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`M-Pesa auth failed: ${res.status}`)
  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token) throw new Error('M-Pesa auth returned no token')
  return data.access_token
}

function timestamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

export interface StkPushResult {
  ok: boolean
  merchantRequestId?: string
  checkoutRequestId?: string
  customerMessage?: string
  error?: string
}

/**
 * Trigger the PIN prompt on the customer's phone.
 */
export async function stkPush(args: { phone: string; amount: number; accountRef: string; description: string }): Promise<StkPushResult> {
  const e = getEnv()
  if (!mpesaConfigured()) return { ok: false, error: 'M-Pesa is not configured' }

  const ts = timestamp()
  const password = Buffer.from(`${e.MPESA_SHORTCODE}${e.MPESA_PASSKEY}${ts}`).toString('base64')
  const token = await accessToken()

  const body = {
    BusinessShortCode: e.MPESA_SHORTCODE,
    Password: password,
    Timestamp: ts,
    TransactionType: 'CustomerPayBillOnline',
    Amount: args.amount,
    PartyA: args.phone,
    PartyB: e.MPESA_SHORTCODE,
    PhoneNumber: args.phone,
    CallBackURL: e.MPESA_CALLBACK_URL,
    AccountReference: args.accountRef.slice(0, 12),
    TransactionDesc: args.description.slice(0, 13),
  }

  const res = await fetch(`${base()}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const data = (await res.json()) as Record<string, string>
  if (data.ResponseCode === '0') {
    return {
      ok: true,
      merchantRequestId: data.MerchantRequestID,
      checkoutRequestId: data.CheckoutRequestID,
      customerMessage: data.CustomerMessage,
    }
  }
  return { ok: false, error: data.errorMessage || data.ResponseDescription || 'STK push was not accepted' }
}
