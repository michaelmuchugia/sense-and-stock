import '@/lib/internal/server-only'

import { currentUser } from '@clerk/nextjs/server'
import { getUserById, upsertUser } from '@/lib/db/queries/users'

/**
 * Lazy-sync fallback. The Clerk webhook is the primary path that creates the
 * `users` row, but if it's delayed or missed, this guarantees the row exists
 * before any authenticated handler reads/writes user-scoped data.
 *
 * Call at the top of authenticated server handlers/pages AFTER establishing
 * the session. Returns the app user's clerkUserId, or null if not signed in.
 */
export async function ensureUser(): Promise<string | null> {
  const clerkUser = await currentUser()
  if (!clerkUser) return null

  const existing = await getUserById(clerkUser.id)
  if (existing) return existing.clerkUserId

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    ''
  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null

  await upsertUser({
    clerkUserId: clerkUser.id,
    email,
    name,
    imageUrl: clerkUser.imageUrl ?? null,
  })
  return clerkUser.id
}
