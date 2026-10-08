import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { clientIp, rateLimit } from '@/lib/api/auth'
import { sendContactMessage, CONTACT_TOPICS } from '@/lib/email/send'
import { sanitizeError } from '@/lib/ingest/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z
  .object({
    email: z.string().email().max(254),
    topic: z.enum(CONTACT_TOPICS),
    message: z.string().trim().min(5, 'Message is too short').max(5000),
    // Honeypot: real users never fill this hidden field; bots do.
    company: z.string().max(0).optional().or(z.literal('')),
  })
  .strict()

export async function POST(req: NextRequest) {
  // Public endpoint — protect with rate limiting (per IP) instead of auth.
  if (!rateLimit('contact', clientIp(req), 5)) {
    return NextResponse.json({ error: 'Too many messages — please try again shortly.' }, { status: 429 })
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
  }

  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return NextResponse.json({ error: first?.message ?? 'Invalid submission' }, { status: 400 })
  }

  // Honeypot tripped — pretend success so bots don't learn anything.
  if (parsed.data.company) {
    return NextResponse.json({ ok: true })
  }

  try {
    const result = await sendContactMessage({
      fromEmail: parsed.data.email,
      topic: parsed.data.topic,
      message: parsed.data.message,
    })
    if (!result.sent) {
      // Email backend down/unconfigured — surface a soft failure.
      console.error('contact send not sent:', result.reason)
      return NextResponse.json({ error: 'Could not send right now. Please email us directly at info@sensenstock.com.' }, { status: 503 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('contact route error:', sanitizeError(err, 300))
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
