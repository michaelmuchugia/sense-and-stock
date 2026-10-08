import '@/lib/internal/server-only'

import { Resend } from 'resend'

/**
 * Resend client for application email (welcome, future alerts). Auth emails
 * (verification, password reset) are handled by Clerk, not here.
 *
 * Returns null when RESEND_API_KEY is absent so dev works without it —
 * callers treat a null client as "email disabled" and skip silently.
 */
let cached: Resend | null | undefined

export function getResend(): Resend | null {
  if (cached !== undefined) return cached
  const key = process.env.RESEND_API_KEY
  cached = key && key.startsWith('re_') ? new Resend(key) : null
  return cached
}

export function emailFrom(): string {
  return process.env.EMAIL_FROM || 'Sense&Stock <onboarding@resend.dev>'
}
