AfriQuant — Phase 4: Authentication & User Identity Super Prompt

MISSION
Add real authentication to AfriQuant using Clerk (with fully custom, dark-themed pages — no default Clerk UI components on user-facing screens), back the existing watchlist with the database under each authenticated user, and lay the groundwork for Phase 5 alerts. Build it the way a real product would: cool, professional, secure by default.

By the end of Phase 4:
- Sign up, sign in, sign out — all on custom pages styled in the AfriQuant dark theme; Clerk's hooks power the forms but its `<SignIn />` / `<SignUp />` pre-built components are not rendered on user-facing pages.
- Google OAuth + email/password as the two login methods, both reachable from the same custom forms.
- A `/account` area where users can edit their name, optionally add a phone number (for Phase 5 SMS), upload a profile photo, view active sessions, view a personal audit log of recent activity, and delete their account.
- The `useWatchlist()` hook silently moves from `localStorage` to a DB-backed API for authenticated users; signed-out users still get localStorage so the public site keeps working.
- A one-time prompt on first sign-in to import the existing localStorage watchlist into the user's account.
- Resend is installed and sends a welcome email on first sign-up (paving the way for Phase 5 alert emails).
- Auth-gated server-side surfaces (`/account`, `/api/watchlist/*`, `/api/account/*`) verify the Clerk session before any DB read or write.
- The navbar reflects user state: avatar + dropdown when signed in, "Sign in" button when not.

This phase does not touch: the score engine, the ingest pipelines, the existing admin endpoints (`/api/admin/*` still authenticate with `ADMIN_SECRET` — Clerk does not replace operator auth in Phase 4), or the public read pages.

LOCKED DECISIONS (from collaboration prior to writing this plan)

1. **Clerk as the auth provider.** We have prior experience with it. Free plan covers our scale (10,000 MAU). No vendor lock-in for the application surfaces because we keep our own `users` table mirroring Clerk's IDs (see Schema below).

2. **Custom pages, not Clerk's default UI.** The `<SignIn />` / `<SignUp />` components from `@clerk/nextjs` are NOT rendered on any user-facing route. We use Clerk's hooks (`useSignIn`, `useSignUp`, `useUser`, `useClerk`) to power our own forms that match the AfriQuant dark theme exactly.

3. **Email/password + Google OAuth.** Both methods are first-class on the same form. No magic-link UI in Phase 4 (Clerk supports it on its config side; we just don't expose the option in our UI yet).

4. **Clerk handles all auth emails** (verification, password reset, account-locked, etc.) on its free infrastructure. Sender domain will be Clerk's default in Phase 4. Branding the sender (Clerk Pro or custom SMTP) is deferred to a separate decision before public launch.

5. **Resend handles application emails** — welcome email on first sign-up (sent from a webhook), groundwork for Phase 5 alerts.

6. **Maximum polish.** Dedicated `/sign-in` and `/sign-up` pages, an `/account` area with multiple tabs (Profile, Sessions, Activity, Danger Zone), navbar avatar dropdown, watchlist migration prompt, account deletion with type-to-confirm.

7. **Clerk webhook syncs to our `users` table.** Every `user.created`, `user.updated`, `user.deleted` event from Clerk hits a webhook endpoint, verified with the Clerk signing secret, that upserts/soft-deletes our row. Lazy sync is also wired as a fallback (first authenticated request creates the row if the webhook missed it).

8. **Existing `ADMIN_SECRET` stays.** `/api/admin/*` endpoints continue to authenticate with the operator secret. Clerk is for end users; the admin path is a separate trust boundary.

9. **Public pages remain public.** The current read pages (`/`, `/stocks`, `/analysts`, etc.) keep working with no login required. Auth is needed only for watchlist mutation, account management, and (in Phase 5) alert preferences.

SECURITY POSTURE — READ BEFORE WRITING ANY CODE

Identity & sessions
- Clerk owns password hashing, OAuth handshake, session token issuance and rotation. We trust Clerk for these primitives and audit our integration points only.
- Session cookies are HTTP-only, Secure (in production), and SameSite=Lax — these are Clerk's defaults, but we verify in production.
- We never store passwords. Never. The `users` table holds no credential material.
- Server components and API routes obtain the user via `await auth()` (Clerk's server helper). The result is always re-checked at the start of every protected handler — no shared "currentUser" memo across requests.
- `/api/watchlist/*` and `/api/account/*` use Clerk's `auth.protect()` (or equivalent) as the first line. The actual handler never executes without a verified session.

Webhook
- The Clerk webhook endpoint (`/api/webhooks/clerk`) verifies the Svix signature (`svix-id`, `svix-timestamp`, `svix-signature` headers) against `CLERK_WEBHOOK_SECRET`. An unsigned or stale request is rejected with 400, no body parse attempted.
- The webhook handler is **idempotent**: re-delivery of the same event must produce the same DB state. Upserts everywhere; no destructive operations triggered by a single event.
- Webhook never trusts the event body to identify the user. It re-fetches the user from Clerk's server SDK using the `id` in the event, then upserts.

Server actions / mutations
- Watchlist add/remove are POST/DELETE handlers in `/api/watchlist/[ticker]/route.ts`. Each verifies the session and the `:ticker` param against a whitelist (must exist in `stocks` table).
- Profile updates are PATCH `/api/account/profile`, body Zod-validated, max-length-enforced, phone-format-validated.
- Account deletion is DELETE `/api/account` and requires the user to retype their primary email — verified server-side, not just client-side.

Rate limiting
- The shared rate limiter from `lib/api/auth.ts` (Phases 2-3) is reused for new auth-adjacent endpoints. Buckets per user-id rather than per-IP for authenticated routes; per-IP for the webhook.
- Login form does **not** sit behind our rate limiter — Clerk's own rate limiting handles credential abuse. Adding a second layer just adds confusion.

Environment & secrets
- `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SECRET`, `RESEND_API_KEY` go through the existing Zod validator in `lib/db/env.ts`. Missing/empty values fail at boot, not at first request.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is the only auth-related variable that ships to the client. Everything else is server-only.
- No Clerk JWT verification keys are hardcoded — they're fetched from Clerk's JWKS endpoint at runtime by Clerk's SDK.

CSRF & cookies
- Clerk's session cookie is set with SameSite=Lax, mitigating CSRF on most state-changing requests.
- For belt-and-suspenders, our mutation endpoints require either a Clerk session token in the `Authorization` header (fetch from same-origin) or a verified cookie + matching `origin` header.
- No `--no-credentials` fetches from third-party origins are needed by the app; if a future feature requires CORS, we'll add explicit allowed-origins.

Audit log
- Sensitive actions write to `user_activity_log` with `user_id`, `action`, `ip`, `user_agent`, `created_at`.
- Actions tracked: `signin`, `signout`, `profile_update`, `email_changed`, `password_changed` (Clerk webhook events), plus our own: `watchlist_add`, `watchlist_remove`, `account_deletion_initiated`, `account_deleted`.
- Log retention is forever in Phase 4 — Phase 5+ can add a retention policy.
- The user's own activity tab in `/account` only shows their own log. No cross-user reads.

Account deletion
- Deletion is a two-step flow: the user clicks "Delete account" → modal demands they type their primary email → POST deletes from Clerk (which cascades to our DB via the `user.deleted` webhook).
- We also support "user not seen via webhook" lazy delete: if the user clicked delete and the webhook is delayed, the server marks `users.deleted_at` immediately and refuses authenticated reads even before Clerk fires the webhook.
- Watchlist and activity log rows cascade-delete on user removal (Foreign-key `ON DELETE CASCADE`).

What must never happen
- No password ever stored in our DB. Never.
- No Clerk session token printed in logs.
- No `eval`, no `dangerouslySetInnerHTML` with user input, no `document.cookie` reads in any client component.
- No DB read in any protected route before `auth.protect()` succeeds.
- No webhook handler trusts the event body to identify the user — always re-fetch from Clerk.

PROJECT STRUCTURE ADDITIONS

afriquant/
├── proxy.ts                                     ← NEW. Clerk middleware (Next 16 renamed `middleware.ts` to `proxy.ts`). Protects routes by matcher.
├── lib/
│   ├── auth/
│   │   ├── server.ts                            ← Re-exports of Clerk's server helpers, typed wrappers.
│   │   ├── ensure-user.ts                       ← Lazy-sync helper: upsert into `users` table on first authenticated request.
│   │   └── activity.ts                          ← `logActivity(userId, action, request)` writes to user_activity_log.
│   ├── api/
│   │   └── auth.ts                              ← EXTEND. Add `authenticateUser(req)` for Clerk session checks alongside existing ADMIN_SECRET / CRON_SECRET helpers.
│   ├── db/
│   │   ├── schema.ts                            ← EDIT. Add users + user_sessions (optional Clerk mirror) + user_activity_log; update watchlist_items.user_id FK.
│   │   └── queries/
│   │       ├── users.ts                         ← NEW. upsertUser, getUserById, softDeleteUser, listUserActivity.
│   │       └── watchlist.ts                     ← NEW. getWatchlistForUser, addToWatchlist, removeFromWatchlist, importLocalStorage.
│   ├── email/
│   │   ├── client.ts                            ← Resend instance, wrapped in a thin sender helper.
│   │   ├── templates/welcome.tsx                ← React Email template (sent on first sign-up).
│   │   └── send.ts                              ← sendWelcomeEmail(user) + send-with-retry helpers.
│   └── types/
│       └── user.ts                              ← AppUser interface (separate from Clerk's User type for portability).
├── app/
│   ├── sign-in/
│   │   └── [[...sign-in]]/page.tsx              ← Custom dark-themed sign-in page using useSignIn().
│   ├── sign-up/
│   │   └── [[...sign-up]]/page.tsx              ← Custom dark-themed sign-up page using useSignUp().
│   ├── account/
│   │   ├── layout.tsx                           ← Auth-protected layout with tab navigation.
│   │   ├── page.tsx                             ← Profile tab — name, email (read-only), phone, photo.
│   │   ├── sessions/page.tsx                    ← Active Clerk sessions list with sign-out-elsewhere.
│   │   ├── activity/page.tsx                    ← Recent activity from user_activity_log.
│   │   └── danger/page.tsx                      ← Account deletion (type-to-confirm).
│   └── api/
│       ├── webhooks/
│       │   └── clerk/route.ts                   ← Verified Svix webhook for user.created / user.updated / user.deleted.
│       ├── watchlist/
│       │   ├── route.ts                         ← GET current user's full watchlist.
│       │   └── [ticker]/route.ts                ← POST add / DELETE remove.
│       └── account/
│           ├── profile/route.ts                 ← PATCH name/phone updates.
│           └── route.ts                         ← DELETE account (initiates Clerk user deletion).
├── components/
│   ├── auth/
│   │   ├── SignInForm.tsx                       ← Custom form, uses useSignIn(). Email/password + "Continue with Google" button.
│   │   ├── SignUpForm.tsx                       ← Custom form, uses useSignUp(). Email/password + Google. Optional phone field.
│   │   ├── UserMenu.tsx                         ← Navbar avatar dropdown (signed in).
│   │   ├── SignInButton.tsx                     ← Navbar "Sign in" link (signed out).
│   │   ├── AuthBoundary.tsx                     ← Server wrapper that gates children behind auth + logs activity.
│   │   └── WatchlistMigrationPrompt.tsx         ← Client component that detects pre-signin localStorage and offers to import.
│   └── account/
│       ├── AccountTabs.tsx                      ← Tab navigation for /account layout.
│       ├── ProfileForm.tsx                      ← Name + phone + photo client form.
│       ├── SessionRow.tsx                       ← One row in the active sessions table.
│       ├── ActivityRow.tsx                      ← One row in the activity log.
│       └── DeleteAccountDialog.tsx              ← Type-to-confirm modal.
├── hooks/
│   └── useWatchlist.ts                          ← EDIT. Detects Clerk auth state; uses API for signed-in users, localStorage for signed-out, performs the migration when both exist.

EDITS TO EXISTING FILES (the only edits permitted outside the additions above)

1. `lib/db/env.ts` — add `CLERK_SECRET_KEY` (string, non-empty), `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (string, starts with `pk_`), `CLERK_WEBHOOK_SECRET` (string, non-empty), `RESEND_API_KEY` (string, starts with `re_`).
2. `lib/db/schema.ts` — add the three new tables (see Schema below). Update `watchlist_items.user_id` from optional varchar to a FK referencing `users.clerk_user_id`.
3. `components/layout/Navbar.tsx` — replace the static "Alerts" button with a `<UserMenu />` when signed in or a `<SignInButton />` when not. This requires the navbar to know auth state — Clerk provides this via its `<ClerkProvider />` + hooks; the layout wraps the app with `<ClerkProvider />`.
4. `app/layout.tsx` — wrap `<ToastProvider>` in `<ClerkProvider>`. No other changes.
5. `.env.example` — add the four new variables with explanatory comments and links to where to get each.
6. `package.json` — add scripts: `npm run dev` is unchanged; no new auth-specific scripts (Clerk has no migrations of its own to manage).

DATABASE SCHEMA ADDITIONS

```ts
// lib/db/schema.ts additions

export const users = pgTable('users', {
  // Clerk's user_id is the canonical key — starts with "user_..."
  clerkUserId: varchar('clerk_user_id', { length: 255 }).primaryKey(),
  email:       varchar('email', { length: 255 }).notNull(),
  name:        varchar('name', { length: 255 }),
  imageUrl:    text('image_url'),
  phone:       varchar('phone', { length: 30 }),  // E.164 format, nullable, validated on update
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
  deletedAt:   timestamp('deleted_at'),            // soft delete; hard delete is cascade via Clerk webhook
}, table => ({
  emailIdx:    index('users_email_idx').on(table.email),
}))

export const userActivityLog = pgTable('user_activity_log', {
  id:        serial('id').primaryKey(),
  userId:    varchar('user_id', { length: 255 }).references(() => users.clerkUserId, { onDelete: 'cascade' }).notNull(),
  action:    varchar('action', { length: 50 }).notNull(),  // 'signin'|'signout'|'profile_update'|'watchlist_add'|...
  detail:    text('detail'),                                // freeform detail, e.g. "Added SCOM" or "Changed phone"
  ip:        varchar('ip', { length: 45 }),                 // IPv4 or IPv6
  userAgent: varchar('user_agent', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, table => ({
  userTimeIdx: index('activity_user_time_idx').on(table.userId, table.createdAt),
}))

// EDIT existing watchlist_items table — add FK + cascade
export const watchlistItems = pgTable('watchlist_items', {
  id:        serial('id').primaryKey(),
  userId:    varchar('user_id', { length: 255 })
              .references(() => users.clerkUserId, { onDelete: 'cascade' })
              .notNull(),
  stockId:   integer('stock_id').references(() => stocks.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, table => ({
  userStockUnique: unique('watchlist_user_stock_unique').on(table.userId, table.stockId),
  userIdx:         index('watchlist_user_idx').on(table.userId),
}))
```

Migration note: `watchlist_items` currently has `user_id` as nullable varchar. The migration will:
1. Add the `users` and `user_activity_log` tables.
2. Drop the existing `watchlist_items` rows (none exist in prod — only ever populated via localStorage in Phase 0-3).
3. Re-create `watchlist_items` with the new FK + unique constraint.

If any test data ended up in DB during Phases 1-3 (none should have), the seed script will clear it.

THE CUSTOM SIGN-IN / SIGN-UP FLOW

Both pages live at `/sign-in/[[...sign-in]]/page.tsx` and `/sign-up/[[...sign-up]]/page.tsx`. The `[[...sign-in]]` catch-all is required by Clerk so it can route to its own internal steps (e.g., the verification code page after sign-up).

The page is server-rendered (just markup + a client form):

```tsx
// app/sign-in/[[...sign-in]]/page.tsx (sketch)
import { SignInForm } from '@/components/auth/SignInForm'
export const metadata = { title: 'Sign in — AfriQuant' }
export default function Page() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <SignInForm />
      </div>
    </div>
  )
}
```

The client form uses Clerk's `useSignIn()`:

```tsx
// components/auth/SignInForm.tsx (sketch)
'use client'
import { useSignIn } from '@clerk/nextjs'
// 1. "Continue with Google" → signIn.authenticateWithRedirect({ strategy: 'oauth_google', ... })
// 2. Email + password → signIn.create({ identifier, password }) → setActive({ session: ... })
// 3. Inline error messages styled like the rest of the app
// 4. Loading state on submit
// 5. Link to /sign-up at the bottom
```

UI rules:
- Dark theme: card background `var(--bg2)`, border `var(--bd2)`, AfriQuant logo at the top
- "Continue with Google" button styled like our existing `.bg` class with a Google "G" mark from the SVG asset we'll add to `public/`
- Email/password inputs use our existing `.mi` class (carried over from the modal styles)
- Submit button uses `.bp`
- Error messages in `var(--r)` color, no emojis
- Loading state: button text fades to "Signing in..."
- After success: redirect to either `/account` or wherever the user was trying to go (Clerk handles this via `redirect_url`)

WATCHLIST REFACTOR

The `useWatchlist()` hook becomes the integration point. Its public API doesn't change — components keep calling `toggle()`, `add()`, `remove()`, `has()` exactly as today.

Internal behavior:
1. On mount, the hook reads Clerk auth state via `useUser()`.
2. **Signed out** — keep using localStorage, identical to today.
3. **Signed in** — fetch the watchlist via `GET /api/watchlist` on mount, then route every mutation through `POST /api/watchlist/<ticker>` or `DELETE /api/watchlist/<ticker>`. The hook stores the server's response in local state for optimistic UI.
4. **First sign-in detection** — when the hook transitions from "signed out + localStorage has items" to "signed in", it triggers the migration prompt:
   - Mount `<WatchlistMigrationPrompt />` as a toast or banner.
   - User sees: "Import N stocks from this browser to your account?" with Yes / No / Skip buttons.
   - Yes: POST `/api/watchlist/import` with the localStorage array. Server upserts each item.
   - No / Skip: localStorage is cleared (No) or kept for next time (Skip).
5. **Sign-out** — hook reverts to localStorage-only. The DB-side watchlist is untouched; signing back in restores it.

API endpoint shapes:
- `GET /api/watchlist` → `{ tickers: string[] }` — Clerk-authed.
- `POST /api/watchlist/[ticker]` → `{ added: boolean, total: number }` — validates ticker against `stocks` table, writes audit log entry.
- `DELETE /api/watchlist/[ticker]` → `{ removed: boolean, total: number }` — same.
- `POST /api/watchlist/import` → `{ imported: number, skipped: number }` — body `{ tickers: string[] }` validated by Zod (max 100, all uppercase alnum ≤10 chars).

WEBHOOK SYNC

`POST /api/webhooks/clerk` is a public endpoint that authenticates **only** via Svix signature verification:

```ts
// app/api/webhooks/clerk/route.ts (sketch)
import { Webhook } from 'svix'
// 1. Read headers svix-id, svix-timestamp, svix-signature
// 2. wh.verify(rawBody, headers) → throws if invalid
// 3. Type-narrow on event.type:
//    - user.created → upsert users row, sendWelcomeEmail()
//    - user.updated → update users row (name, email, image, etc.)
//    - user.deleted → soft-delete users row (deleted_at = now), let cascade handle watchlist + activity
// 4. logActivity(userId, event.type) for audit
// 5. Return 200 on success, 400 on bad signature, 500 with sanitized error otherwise
```

Idempotency: each handler uses upserts. Re-delivery of the same event produces the same DB state.

ACCOUNT AREA

`/account/layout.tsx` is auth-protected. Unauthenticated visits redirect to `/sign-in?redirect_url=/account`. The layout renders a tab nav across the top:

| Tab | Path | Content |
|---|---|---|
| Profile | `/account` | Name (editable), email (read-only — change via Clerk's flow), phone (editable, optional), photo (upload via Clerk). Save button calls PATCH /api/account/profile. |
| Sessions | `/account/sessions` | List of active Clerk sessions: browser, location (best-effort from IP), last active. "Sign out from this device" per row + "Sign out everywhere else." |
| Activity | `/account/activity` | Last 100 rows from user_activity_log, newest first. Tabular: timestamp, action, detail, IP (masked except last octet). |
| Danger Zone | `/account/danger` | Account deletion flow: warning text, modal demanding email retype, irreversible note. |

All four tabs are server-rendered for the content (so the data is fresh on every visit); the forms inside are client-component leaves.

RESEND INTEGRATION

`lib/email/client.ts`:
```ts
import { Resend } from 'resend'
export const resend = new Resend(process.env.RESEND_API_KEY!)
```

`lib/email/send.ts`:
```ts
export async function sendWelcomeEmail(user: AppUser) {
  return resend.emails.send({
    from: 'AfriQuant <welcome@afriquant.dev>',  // verified domain in Resend
    to: user.email,
    subject: 'Welcome to AfriQuant',
    react: WelcomeEmail({ name: user.name ?? 'there' }),
  })
}
```

The welcome email is plain, professional, no marketing fluff. Links back to the home page + a "Set up your watchlist" CTA pointing at `/smartscreen`.

For Phase 4 we add the `from` address as a placeholder. Resend requires DNS verification of the sending domain — this is an open question (see Open Questions below).

MIDDLEWARE / PROXY

Next.js 16 renamed `middleware.ts` to `proxy.ts`. Clerk's `clerkMiddleware()` works in the new file location.

`proxy.ts` config:
```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtected = createRouteMatcher([
  '/account(.*)',
  '/api/watchlist(.*)',
  '/api/account(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) await auth.protect()
})

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/'],
}
```

The matcher excludes Next.js static assets. The middleware runs for every other request, reads Clerk session if present (so server components have access), and explicitly calls `auth.protect()` only on routes that need to gate execution.

Note: `/api/admin/*` and `/api/cron/*` are NOT in the Clerk-protected list — those keep their existing `ADMIN_SECRET` / `CRON_SECRET` Bearer auth. The middleware lets them through unmolested.

MIGRATION ORDER — FOLLOW THIS ORDER

Step 1 — Clerk + Resend setup (no code yet)
- Create the Clerk application in the Clerk dashboard.
- Configure email/password + Google OAuth providers.
- Set the sign-in/sign-up URLs to `/sign-in` and `/sign-up`.
- Grab `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and (after creating an endpoint URL stub) `CLERK_WEBHOOK_SECRET`.
- Create a Resend account, generate an API key.
- (Optional for Phase 4) Add a sending domain to Resend, verify DNS. Else use `onboarding@resend.dev` for testing.
- Add all four env vars to `.env.local`.

Step 2 — Schema migration
- Add the new tables to `lib/db/schema.ts`.
- Update `watchlist_items` definition.
- `npm run db:generate` → review the migration SQL.
- `npm run db:migrate` → apply.
- Verify in Drizzle Studio.

Step 3 — Auth scaffolding (no UI changes yet)
- Add `proxy.ts` with Clerk middleware.
- Wrap `<ClerkProvider>` in `app/layout.tsx`.
- Install `@clerk/nextjs` and `resend` and `svix`.
- Verify `npm run build` passes — no UI changes, just bookkeeping.

Step 4 — Custom sign-in / sign-up pages
- Build `SignInForm` and `SignUpForm` using Clerk hooks.
- Build the dark-themed page wrappers.
- Test the flow end-to-end (manual): sign up → verify email → land on /account.

Step 5 — Webhook + welcome email
- Build `/api/webhooks/clerk/route.ts` with Svix verification.
- Wire `user.created` → upsert + sendWelcomeEmail.
- Wire `user.updated` and `user.deleted`.
- In Clerk dashboard, point the webhook URL to ngrok (dev) or the deployed Vercel URL (prod). Copy the signing secret.
- Test by signing up a new user, verifying the welcome email arrives and the `users` row exists.

Step 6 — Watchlist API + hook refactor
- Build `/api/watchlist` and `/api/watchlist/[ticker]` routes.
- Build `/api/watchlist/import`.
- Refactor `useWatchlist` to detect signed-in state.
- Test: sign in, add a stock from Smart Screen, sign out, verify the DB row remains. Sign back in, verify it persists.

Step 7 — Migration prompt
- Build `<WatchlistMigrationPrompt />`.
- Detect the transition from "signed-out + localStorage" → "signed-in". Show the prompt.
- Test the import flow.

Step 8 — Account area
- Build `/account/layout.tsx` + four tabs (Profile, Sessions, Activity, Danger).
- Wire profile updates to `/api/account/profile`.
- Wire account deletion to `/api/account` (type-to-confirm).
- Test the full flow including session sign-out-elsewhere.

Step 9 — Navbar avatar + sign-in button
- Build `<UserMenu />` (avatar + dropdown with Profile / Sessions / Sign out links).
- Build `<SignInButton />`.
- Update `Navbar.tsx` to render one or the other based on auth state.

Step 10 — Audit log surfacing
- Wire activity logging from every mutation endpoint.
- Build the Activity tab UI.

Step 11 — Final security pass
- Verify all protected endpoints return 401 without a session.
- Verify webhook returns 400 with a bad Svix signature.
- Verify rate limits trigger on rapid mutations.
- Run `npm run build` — must pass.
- Manual end-to-end: sign up new user → verify email → import localStorage watchlist → edit profile → view activity → sign out from another device → delete account → confirm cascade.

SUCCESS CRITERIA FOR PHASE 4
Phase 4 is complete when every one of these is true:

1. A new user can sign up with email/password from `/sign-up`, receive Clerk's verification email, verify, land on `/account`, and see a row in the `users` table.
2. The same user can sign in from `/sign-in` after sign-out and reach `/account`.
3. Sign-up via Google OAuth produces the same result with no email/password set.
4. The webhook endpoint correctly handles `user.created`, `user.updated`, `user.deleted` events, verified by Svix signature.
5. The welcome email (Resend) arrives within ~30s of sign-up. Sender shows from a Resend-verified address.
6. A signed-out visitor can still browse all the public pages exactly as today. Watchlist toggling on Smart Screen still works via localStorage.
7. A signed-in visitor sees their DB watchlist sync into Smart Screen on page load. Toggling there hits `/api/watchlist/[ticker]`, returns 200, and persists across sessions.
8. The watchlist migration prompt fires on first sign-in if and only if localStorage contains items. Yes imports them; No clears localStorage; Skip preserves it. No double-import on re-prompt.
9. `/account` tabs all render with the correct user data. Profile edits round-trip. Active sessions list matches Clerk's API. Activity tab shows ≥10 recent rows for any user with activity.
10. Account deletion from Danger Zone: typing the wrong email shows an error; the right email proceeds; the user is signed out; the user row is soft-deleted via webhook; the watchlist and activity rows cascade.
11. Every protected API endpoint returns 401 without a valid session. The webhook endpoint returns 400 with a tampered signature.
12. `/api/admin/*` endpoints continue to authenticate via `ADMIN_SECRET` only. Clerk-authenticated users without operator clearance cannot access them.
13. The navbar shows `<UserMenu />` when signed in and `<SignInButton />` when not. Avatar image, name, and email visible in the menu.
14. `npm run build` passes. No new TypeScript errors. The frontend is visually identical for signed-out users.
15. The audit log captures every meaningful action: sign-in, sign-out, profile_update, watchlist_add, watchlist_remove, account_deletion_initiated.

OPEN QUESTIONS (decide before launch, not blockers for Phase 4 internal completion)

- Q1: **Branded auth email sender.** Clerk's free plan sends from `noreply@clerk.dev` (or similar). To send from `noreply@myafriquant.com`, we either upgrade to Clerk Pro (~$25/mo) or wire Resend as Clerk's email provider (more complex). Decide before public launch — for internal testing the default is fine.
- Q2: **Resend sending domain — RESOLVED.** Production domain is `myafriquant.com` (purchased via GoDaddy, DNS will point to Vercel). Resend sends from a subdomain like `welcome@mail.myafriquant.com` or `welcome@myafriquant.com` once DNS is verified in Resend. For development before DNS is set up, use `onboarding@resend.dev`. The welcome-email `from` address in `lib/email/send.ts` should be an env var (`EMAIL_FROM`) so we flip from sandbox to production without a code change.
- Q3: **Phone number storage and SMS provider.** We collect phone optionally in Phase 4 for Phase 5 SMS alerts. Which SMS provider (Twilio? Africa's Talking, which is Kenya-specific)? Decide before Phase 5; Phase 4 just stores the field.
- Q6: **Domain → Vercel cutover.** `myafriquant.com` currently serves a GoDaddy website-builder site (disposable). Before launch: add the domain in the Vercel project, update GoDaddy DNS (A record / CNAME per Vercel's instructions, or move nameservers to Vercel), and set Clerk's allowed origins + Resend's verified domain to `myafriquant.com`. This is a launch task, not a Phase 4 internal-completion blocker — local dev uses `localhost:3000`.
- Q4: **2FA / MFA.** Clerk supports TOTP, SMS-based 2FA, and passkeys out of the box — just toggles in the dashboard. Do we enable any of these as optional in Phase 4, or defer entirely?
- Q5: **Public profile pages.** Phase 4 makes `/account` private. Some apps also have public `/u/<handle>` pages. Not needed in Phase 4 — confirm we're skipping this entirely until Phase 5+.
