import '@/lib/internal/server-only'

import { db, schema } from '@/lib/db'
import type { ActivityAction } from '@/lib/types/user'

/** Masks an IP for storage — keeps it useful for audit, less PII-sensitive. */
function clientIpFromHeaders(headers: Headers): string | null {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim().slice(0, 45)
  return headers.get('x-real-ip')?.slice(0, 45) ?? null
}

/**
 * Append a row to user_activity_log. Best-effort: a logging failure must
 * never break the user-facing action, so errors are swallowed (logged to
 * server console only).
 */
export async function logActivity(
  userId: string,
  action: ActivityAction,
  opts: { detail?: string; headers?: Headers } = {},
): Promise<void> {
  try {
    await db.insert(schema.userActivityLog).values({
      userId,
      action,
      detail:    opts.detail?.slice(0, 1000) ?? null,
      ip:        opts.headers ? clientIpFromHeaders(opts.headers) : null,
      userAgent: opts.headers?.get('user-agent')?.slice(0, 500) ?? null,
    })
  } catch (err) {
    console.error('logActivity failed (non-fatal):', err instanceof Error ? err.message : err)
  }
}
