import '@/lib/internal/server-only'

import { db, schema, withDbRetry } from '@/lib/db'
import { eq, sql } from 'drizzle-orm'

export type Plan = 'free' | 'plus'

export interface Entitlement {
  plan: Plan
  status: string
  expiresAt: Date | null
}

/**
 * The user's effective plan right now. Plus only while an active subscription
 * has not expired. No row, or a lapsed expiry, means Free.
 */
export async function getEntitlement(userId: string): Promise<Entitlement> {
  const rows = await withDbRetry(() =>
    db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, userId)).limit(1),
  )
  const sub = rows[0]
  if (!sub) return { plan: 'free', status: 'inactive', expiresAt: null }
  const active = sub.status === 'active' && sub.expiresAt !== null && sub.expiresAt.getTime() > Date.now()
  return { plan: active ? 'plus' : 'free', status: sub.status, expiresAt: sub.expiresAt }
}

export async function getUserPlan(userId: string): Promise<Plan> {
  return (await getEntitlement(userId)).plan
}

/**
 * Grant or extend Plus. Renewals stack on top of any remaining time rather
 * than resetting it. Idempotent per call; the caller guards against double
 * processing of the same payment.
 */
export async function grantPlus(userId: string, months = 1): Promise<Date> {
  const current = await getEntitlement(userId)
  const base = current.expiresAt && current.expiresAt.getTime() > Date.now() ? current.expiresAt : new Date()
  const expiresAt = new Date(base)
  expiresAt.setMonth(expiresAt.getMonth() + months)

  await withDbRetry(() =>
    db.insert(schema.subscriptions)
      .values({ userId, plan: 'plus', status: 'active', startedAt: new Date(), expiresAt, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: schema.subscriptions.userId,
        set: {
          plan: 'plus', status: 'active', expiresAt,
          startedAt: sql`coalesce(${schema.subscriptions.startedAt}, now())`,
          updatedAt: new Date(),
        },
      }),
  )
  return expiresAt
}
