import '@/lib/internal/server-only'

import { auth } from '@clerk/nextjs/server'
import { getUserById } from '@/lib/db/queries/users'
import { ensureUser } from './ensure-user'

/**
 * Resolve the authenticated user's clerkUserId AND guarantee the `users` row
 * exists (so FK-dependent writes succeed). Cheap path: auth() for the id +
 * one indexed getUserById. Only falls back to ensureUser() (which hits
 * Clerk's API) when the row is genuinely missing — i.e. the webhook hasn't
 * landed yet.
 *
 * Returns null if not signed in.
 */
export async function requireUser(): Promise<string | null> {
  const { userId } = await auth()
  if (!userId) return null

  const existing = await getUserById(userId)
  if (existing) return userId

  // Webhook delayed/missed — create the row now.
  return ensureUser()
}
