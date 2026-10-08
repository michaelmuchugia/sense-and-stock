import '@/lib/internal/server-only'

import { getResend, emailFrom } from './client'

interface WelcomeArgs {
  to: string
  name: string | null
}

export const CONTACT_TOPICS = [
  'General inquiry',
  'Media inquiry',
  'Data & coverage',
  'Technical support',
  'Partnership',
  'Something else',
] as const

export type ContactTopic = (typeof CONTACT_TOPICS)[number]

interface ContactArgs {
  fromEmail: string
  topic: ContactTopic
  message: string
}

/**
 * Routes a contact-form submission to the right inbox via Resend.
 * Technical-support topics go to support@; everything else to info@.
 * reply-to is set to the sender so the operator can reply directly from Zoho.
 * Returns {sent:false} (never throws) if Resend isn't configured.
 */
export async function sendContactMessage({ fromEmail, topic, message }: ContactArgs): Promise<{ sent: boolean; reason?: string }> {
  const resend = getResend()
  if (!resend) return { sent: false, reason: 'RESEND_API_KEY not configured' }

  const to = topic === 'Technical support' ? 'support@sensenstock.com' : 'info@sensenstock.com'
  const safeMsg = message.slice(0, 5000)

  try {
    await resend.emails.send({
      from: emailFrom(),
      to,
      replyTo: fromEmail,
      subject: `[Contact · ${topic}] from ${fromEmail}`,
      text: `Topic: ${topic}\nFrom: ${fromEmail}\n\n${safeMsg}`,
      html: contactHtml(fromEmail, topic, safeMsg),
    })
    return { sent: true }
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown'
    console.error('sendContactMessage failed:', reason)
    return { sent: false, reason }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function contactHtml(fromEmail: string, topic: string, message: string): string {
  return `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;line-height:1.6">
  <h2 style="margin:0 0 4px">New contact message</h2>
  <p style="margin:0 0 2px"><strong>Topic:</strong> ${escapeHtml(topic)}</p>
  <p style="margin:0 0 16px"><strong>From:</strong> ${escapeHtml(fromEmail)}</p>
  <div style="white-space:pre-wrap;border-left:3px solid #00C896;padding-left:12px">${escapeHtml(message)}</div>
</body></html>`
}

/**
 * Welcome email sent on first sign-up (from the Clerk user.created webhook).
 * No-ops silently if Resend isn't configured. Never throws into the webhook
 * handler — a failed welcome email must not 500 the webhook.
 */
export async function sendWelcomeEmail({ to, name }: WelcomeArgs): Promise<{ sent: boolean; reason?: string }> {
  const resend = getResend()
  if (!resend) return { sent: false, reason: 'RESEND_API_KEY not configured' }
  if (!to) return { sent: false, reason: 'no recipient' }

  const greeting = name && name.trim() ? name.trim().split(' ')[0] : 'there'

  try {
    await resend.emails.send({
      from: emailFrom(),
      to,
      subject: 'Welcome to Sense&Stock',
      text: welcomeText(greeting),
      html: welcomeHtml(greeting),
    })
    return { sent: true }
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown'
    console.error('sendWelcomeEmail failed (non-fatal):', reason)
    return { sent: false, reason }
  }
}

function welcomeText(greeting: string): string {
  return [
    `Hi ${greeting},`,
    '',
    'Welcome to Sense&Stock — NSE analyst intelligence.',
    '',
    'You can now save stocks to your watchlist and track how analyst price targets perform over time.',
    '',
    'Get started by building your watchlist on the Smart Screen:',
    'https://sensenstock.com/smartscreen',
    '',
    'Sense&Stock provides model-based market intelligence for informational purposes only. This is not financial advice.',
    '',
    '— The Sense&Stock team',
  ].join('\n')
}

function welcomeHtml(greeting: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;background:#080C12;color:#DDE4EF;font-family:Arial,Helvetica,sans-serif;padding:32px">
  <div style="max-width:480px;margin:0 auto;background:#0F1520;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px">
    <div style="font-size:20px;font-weight:800;margin-bottom:16px">Sense<span style="color:#00C896">&amp;</span>Stock</div>
    <h1 style="font-size:20px;margin:0 0 12px">Welcome, ${greeting}</h1>
    <p style="color:#6E8099;line-height:1.7;font-size:14px">You can now save stocks to your watchlist and track how analyst price targets perform over time.</p>
    <a href="https://sensenstock.com/smartscreen" style="display:inline-block;margin-top:16px;background:#00C896;color:#000;text-decoration:none;font-weight:700;padding:11px 20px;border-radius:8px;font-size:14px">Build your watchlist</a>
    <p style="color:#3D4F62;line-height:1.6;font-size:11px;margin-top:24px;border-top:1px solid rgba(255,255,255,0.06);padding-top:16px">Sense&amp;Stock provides model-based market intelligence for informational purposes only. This is not financial advice or a recommendation to buy or sell securities.</p>
  </div>
</body></html>`
}
