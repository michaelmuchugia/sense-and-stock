AfriQuant — Go-Live Deployment Guide (myafriquant.com → Vercel)

This is the checklist to take AfriQuant from localhost to production at myafriquant.com.
It is staged deliberately: each stage produces something verifiable before the next.
Do them in order. Stages 1-2 get a working deploy on a *.vercel.app URL with your
existing dev keys. Stages 3-5 cut over to the real domain and production credentials.

CARDINAL RULE
The app validates every required environment variable at server startup
(instrumentation.ts → assertEnv). If a required var is missing in Vercel, the
server crashes on every request even if the build succeeded. So: set env vars in
Vercel BEFORE deploying, and re-deploy after any env change.

Required env vars (the full set):
  DATABASE_URL                         (Neon pooled)
  DATABASE_URL_DIRECT                  (Neon direct — only used by migrations, optional in Vercel)
  CRON_SECRET                          (32+ char random)
  ADMIN_SECRET                         (32+ char random, different from CRON_SECRET)
  CLERK_SECRET_KEY                     (sk_test_… for now, sk_live_… at Stage 4)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY    (pk_test_… for now, pk_live_… at Stage 4)
  NEXT_PUBLIC_CLERK_SIGN_IN_URL        (/sign-in)
  NEXT_PUBLIC_CLERK_SIGN_UP_URL        (/sign-up)
  CLERK_WEBHOOK_SIGNING_SECRET         (whsec_… — set at Stage 4 when the prod webhook exists)
  RESEND_API_KEY                       (re_… — set at Stage 5, optional)
  EMAIL_FROM                           (Stage 5: "AfriQuant <welcome@myafriquant.com>")
  NEXT_PUBLIC_APP_ENV                  (production)
  NEXT_PUBLIC_DATA_SOURCE              (AfriQuant Prototype, or update)
  NEXT_PUBLIC_LAST_UPDATED             (a date string)

──────────────────────────────────────────────────────────────────────────────
STAGE 0 — DECISIONS
──────────────────────────────────────────────────────────────────────────────

D1. Production database.
    Options:
    (a) Reuse the current Neon database for production. Simplest. Dev and prod
        share data. Fine while you're the only operator and data is prototype.
    (b) Create a separate Neon branch "production" (Neon dashboard → Branches →
        New branch from main). Gives prod its own data + connection string.
        Recommended once real users exist.
    For first launch, (a) is acceptable. To switch later, change DATABASE_URL in
    Vercel and re-run migrations against the new branch.

D2. Git host. Vercel deploys from a GitHub/GitLab/Bitbucket repo (recommended,
    gives push-to-deploy) OR from the Vercel CLI. This guide uses GitHub.

──────────────────────────────────────────────────────────────────────────────
STAGE 1 — PUSH TO GITHUB
──────────────────────────────────────────────────────────────────────────────

The repo currently has only the create-next-app initial commit and no remote.
All Phase 1-4 work is uncommitted.

1. Confirm secrets are ignored (already verified): .env.local, .env, and ingest/
   are in .gitignore. Never commit these.

2. Stage and commit everything:
     git add -A
     git commit -m "AfriQuant phases 1-4: DB, ingestion, API layer, auth"

3. Create a new EMPTY repo on github.com (no README/license) named e.g. afriquant.
   Keep it PRIVATE.

4. Add the remote and push (replace <you>):
     git remote add origin https://github.com/<you>/afriquant.git
     git branch -M main
     git push -u origin main

──────────────────────────────────────────────────────────────────────────────
STAGE 2 — VERCEL PROJECT + FIRST DEPLOY (on *.vercel.app, dev Clerk keys)
──────────────────────────────────────────────────────────────────────────────

Goal: prove the app builds and runs in production infra before touching the
domain or production Clerk.

1. vercel.com → Add New → Project → import the GitHub repo.
   - Framework preset: Next.js (auto-detected).
   - Root directory: leave as repo root (the repo IS the afriquant app).
   - Build/output settings: defaults.

2. BEFORE clicking Deploy, expand "Environment Variables" and add ALL the vars
   from the Cardinal Rule list, using your CURRENT values from .env.local:
   - Paste DATABASE_URL, DATABASE_URL_DIRECT, CRON_SECRET, ADMIN_SECRET.
   - Paste the dev Clerk keys (pk_test_…, sk_test_…) for now.
   - Set NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in, NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up.
   - Leave CLERK_WEBHOOK_SIGNING_SECRET and RESEND_API_KEY blank for now.
   - Set NEXT_PUBLIC_APP_ENV=production, NEXT_PUBLIC_DATA_SOURCE, NEXT_PUBLIC_LAST_UPDATED.
   - EMAIL_FROM can stay "AfriQuant <onboarding@resend.dev>" for now.
   Apply each to Production (and Preview if you want preview deploys to work).

3. Deploy. Wait for the build. If it fails, read the log — almost always a
   missing env var (see Cardinal Rule).

4. Open the *.vercel.app URL. Verify:
   - Home, /stocks, /smartscreen render.
   - Sign-in page loads. (Dev Clerk keys show a "development keys" banner — fine
     for this smoke; we replace them in Stage 4.)
   - Database-backed pages show data (Neon reachable from Vercel).

If all green, the app is live on Vercel infra. Now make it myafriquant.com.

──────────────────────────────────────────────────────────────────────────────
STAGE 3 — CUSTOM DOMAIN (GoDaddy → Vercel)
──────────────────────────────────────────────────────────────────────────────

1. Vercel → your project → Settings → Domains → Add → enter myafriquant.com
   (also add www.myafriquant.com; Vercel will offer to redirect one to the other).

2. Vercel shows the DNS records to set. Two common options:
   (a) A record for the apex: myafriquant.com → 76.76.21.21
       CNAME for www: www → cname.vercel-dns.com
   (b) Or change GoDaddy nameservers to Vercel's (full delegation).
   Use (a) unless you want Vercel managing all DNS.

3. In GoDaddy → your domain → DNS → Manage DNS:
   - Delete the existing "parked"/website-builder records that point the apex
     and www to GoDaddy's builder (this is what kills the old simple site).
   - Add the A record and CNAME exactly as Vercel specified.

4. Back in Vercel, wait for the domain to verify (minutes to a couple hours for
   DNS propagation). Vercel auto-provisions HTTPS.

5. Verify https://myafriquant.com serves the app.

──────────────────────────────────────────────────────────────────────────────
STAGE 4 — CLERK PRODUCTION INSTANCE (the involved part)
──────────────────────────────────────────────────────────────────────────────

Clerk has SEPARATE Development and Production instances. The dev keys you've been
using won't serve production traffic properly. Production requires your own OAuth
credentials and domain DNS.

1. Clerk dashboard → your app → top-left instance switcher → "Production".
   Clerk will guide you to set up the production instance for myafriquant.com.

2. Domain & DNS: Clerk gives you CNAME records (e.g. clerk.myafriquant.com,
   accounts.myafriquant.com, plus DKIM records clk._domainkey…). Add ALL of them
   in GoDaddy DNS. These let Clerk serve its frontend API and send branded auth
   emails from your domain. Wait for Clerk to verify them.

3. Google OAuth (production): dev used Clerk's shared Google credentials; prod
   needs your own.
   - Google Cloud Console → create a project (or reuse) → APIs & Services →
     Credentials → Create OAuth client ID → Web application.
   - Authorized redirect URI: the value Clerk shows on its Google SSO setup
     screen (looks like https://accounts.myafriquant.com/v1/oauth_callback).
   - Copy the Client ID + Client Secret into Clerk's Google connection settings
     for the production instance.

4. Email/password: enable it on the production instance the same way as dev.

5. Sign-in/sign-up paths: set them to /sign-in and /sign-up on the production
   instance (same as Stage from Phase 4).

6. Production API keys: Clerk → API keys (Production) → copy pk_live_… and
   sk_live_…. In Vercel env vars, REPLACE the dev values:
     NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = pk_live_…
     CLERK_SECRET_KEY                  = sk_live_…

7. Production webhook:
   - Clerk → Webhooks (Production) → Add Endpoint.
   - URL: https://myafriquant.com/api/webhooks/clerk
   - Subscribe to: user.created, user.updated, user.deleted, session.created,
     session.removed (and session.ended/revoked if listed).
   - Copy the Signing Secret (whsec_…) → set CLERK_WEBHOOK_SIGNING_SECRET in Vercel.

8. Re-deploy Vercel (env changes require a new deployment). Vercel → Deployments →
   redeploy latest, OR push a commit.

9. Verify:
   - Sign up a brand-new user on https://myafriquant.com/sign-up.
   - Confirm the user appears in the Neon `users` table (webhook fired).
   - Confirm sign-in/sign-out rows appear in their /account Activity tab.
   - No "development keys" banner anymore.

──────────────────────────────────────────────────────────────────────────────
STAGE 5 — RESEND (welcome email from your domain)
──────────────────────────────────────────────────────────────────────────────

1. resend.com → Domains → Add Domain → myafriquant.com.
2. Resend gives DNS records (SPF TXT, DKIM CNAME/TXT, optionally a return-path).
   Add them in GoDaddy DNS. Wait for Resend to mark the domain "Verified".
   (These can coexist with Clerk's email DNS — they're different record names.)
3. Resend → API Keys → create one → set RESEND_API_KEY in Vercel.
4. Set EMAIL_FROM in Vercel to: AfriQuant <welcome@myafriquant.com>
5. Re-deploy. Sign up a new user → confirm the welcome email arrives from your
   domain (check spam first time).

──────────────────────────────────────────────────────────────────────────────
STAGE 6 — POST-DEPLOY VERIFICATION
──────────────────────────────────────────────────────────────────────────────

  [ ] https://myafriquant.com loads, HTTPS valid, old GoDaddy site gone.
  [ ] All public pages render with DB data.
  [ ] Sign up (email) → verification → lands on /account.
  [ ] Sign up (Google) → lands on /account.
  [ ] users row created via webhook (not just lazy-sync).
  [ ] Welcome email received from @myafriquant.com.
  [ ] Watchlist: add a stock on Smart Screen, sign out, sign back in → persists.
  [ ] /account tabs switch instantly; Activity shows signin + watchlist rows.
  [ ] Account deletion works end-to-end (type email → deleted → cascade).
  [ ] /api/admin/recompute-scores returns 401 without ADMIN_SECRET, 200 with it.
  [ ] No "Clerk development keys" warning in browser console.

──────────────────────────────────────────────────────────────────────────────
DATA NOTE
──────────────────────────────────────────────────────────────────────────────

Production DB starts with whatever the current Neon DB holds: 65 stocks, 16
analysts, coverage, 6 signal snapshots, and the test prices/targets from Phase 2
smoke tests. To start prod clean, either use a fresh Neon branch (D1b) and run:
    npm run db:migrate
    npm run db:seed
against it, or clear the test rows. The daily ingestion is still manual CSV
(npm run ingest:prices) until a later phase automates it.

OPEN ITEMS DEFERRED TO LATER
- Phase 5: alerts/notifications (needs the now-live webhook + a cron).
- Automated NSE price scraping (currently manual CSV/PDF→CSV).
- Branded Clerk auth emails are handled by Stage 4 DNS; verify they send.
