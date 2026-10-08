import '@/lib/internal/server-only'

import { db, schema } from '@/lib/db'
import { and, desc, eq, isNull } from 'drizzle-orm'
import type { ActivityEntry } from '@/lib/types/user'

export interface UpsertUserInput {
  clerkUserId: string
  email: string
  name?: string | null
  imageUrl?: string | null
  phone?: string | null
}

/**
 * Idempotent upsert keyed on Clerk's user id. Used by the webhook and by
 * the lazy-sync fallback. Does NOT clear `deletedAt` unless the user is
 * genuinely re-created (Clerk reuses ids only after hard delete, so a
 * re-create implies un-delete).
 */
export async function upsertUser(input: UpsertUserInput) {
  const now = new Date()
  return db
    .insert(schema.users)
    .values({
      clerkUserId: input.clerkUserId,
      email:       input.email,
      name:        input.name ?? null,
      imageUrl:    input.imageUrl ?? null,
      phone:       input.phone ?? null,
    })
    .onConflictDoUpdate({
      target: schema.users.clerkUserId,
      set: {
        email:     input.email,
        name:      input.name ?? null,
        imageUrl:  input.imageUrl ?? null,
        // phone is managed via the profile form, not overwritten by webhook syncs
        updatedAt: now,
        deletedAt: null,
      },
    })
    .returning()
}

export async function getUserById(clerkUserId: string) {
  const rows = await db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.clerkUserId, clerkUserId), isNull(schema.users.deletedAt)))
    .limit(1)
  return rows[0] ?? null
}

export async function updateUserProfile(clerkUserId: string, data: { name?: string | null; phone?: string | null }) {
  return db
    .update(schema.users)
    .set({
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      updatedAt: new Date(),
    })
    .where(eq(schema.users.clerkUserId, clerkUserId))
    .returning()
}

/** Soft-delete: marks deleted_at. Hard delete cascades when Clerk fires user.deleted. */
export async function softDeleteUser(clerkUserId: string) {
  return db
    .update(schema.users)
    .set({ deletedAt: new Date() })
    .where(eq(schema.users.clerkUserId, clerkUserId))
}

/** Hard delete — used by the user.deleted webhook. Cascades watchlist + activity. */
export async function hardDeleteUser(clerkUserId: string) {
  return db.delete(schema.users).where(eq(schema.users.clerkUserId, clerkUserId))
}

export async function listUserActivity(clerkUserId: string, limit = 100): Promise<ActivityEntry[]> {
  const rows = await db
    .select({
      id:        schema.userActivityLog.id,
      action:    schema.userActivityLog.action,
      detail:    schema.userActivityLog.detail,
      ip:        schema.userActivityLog.ip,
      userAgent: schema.userActivityLog.userAgent,
      createdAt: schema.userActivityLog.createdAt,
    })
    .from(schema.userActivityLog)
    .where(eq(schema.userActivityLog.userId, clerkUserId))
    .orderBy(desc(schema.userActivityLog.createdAt))
    .limit(Math.min(limit, 200))
  return rows
}
