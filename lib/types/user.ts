/**
 * App-level user shape, decoupled from Clerk's `User` type so the rest of
 * the codebase doesn't depend on Clerk's API surface. Mirrors the `users`
 * table.
 */
export interface AppUser {
  clerkUserId: string
  email: string
  name: string | null
  imageUrl: string | null
  phone: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export type ActivityAction =
  | 'signin'
  | 'signout'
  | 'profile_update'
  | 'email_changed'
  | 'password_changed'
  | 'watchlist_add'
  | 'watchlist_remove'
  | 'watchlist_import'
  | 'account_deletion_initiated'
  | 'account_deleted'
  | 'user_created'

export interface ActivityEntry {
  id: number
  action: string
  detail: string | null
  ip: string | null
  userAgent: string | null
  createdAt: Date
}
