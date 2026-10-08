AfriQuant → Sense&Stock — Rebrand & Domain Migration Plan

Brand name:   AfriQuant  →  Sense&Stock   (renders "Sense&Stock"; the "&" reads as "n")
Domain:       myafriquant.com  →  sensenstock.com   (old redirects to new)
Fonts:        Syne / DM Sans / DM Mono  →  Inter (display + body) + IBM Plex Mono (figures)
Theme:        unchanged — dark fintech palette stays
Layout:       unchanged — only typography, name, logo, colors-of-text change
Logo:         operator-supplied file replaces the "A" lettermark

Sequence (locked): CODE REBRAND first (Part A), then INFRA MIGRATION (Part B).
Part A ships to the existing Vercel URL and is fully testable before any DNS work.

════════════════════════════════════════════════════════════════════════════
PART A — CODE REBRAND (no infra; deploys to current *.vercel.app)
════════════════════════════════════════════════════════════════════════════

A1. Fonts
    - styles/globals.css: change the font CSS variables
        --fd (display)  Syne     → 'Inter'
        --fb (body)     DM Sans  → 'Inter'
        --fm (mono)     DM Mono  → 'IBM Plex Mono'
    - app/layout.tsx: swap the Google Fonts <link> to Inter (400,500,600,700,800)
      + IBM Plex Mono (400,500,600). Keep the plain <link> approach so the CSS
      var names carry through with zero component changes.
    - Net effect: every heading/number/label re-renders in the new fonts because
      components only ever reference var(--fd/--fb/--fm).

A2. Brand name — prose (21 files)
    - Replace the string "AfriQuant" → "Sense&Stock" across app/ components/ lib/
      (excluding lib/email/send.ts, hand-edited in A4 for correct HTML entities).
    - Bare "&" is valid in JSX text and JS string literals; renders correctly and
      does not fail tsc or `next build` (Next 16 doesn't run lint on build).
    - Product terms rebrand too: "AfriQuant Score" → "Sense&Stock Score",
      "AfriQuant Signal of the Week" → "Sense&Stock Signal of the Week", etc.

A3. Wordmarks (5) + lettermark
    Hand-edit the split wordmark "Afri<em>Quant</em>" → "Sense<em>&amp;</em>Stock"
    ("Sense" + green "&" + "Stock", mirroring the old green second-word):
      - components/layout/Navbar.tsx      (+ lettermark .lm "A" → "S")
      - components/layout/Footer.tsx
      - app/sign-in/[[...sign-in]]/page.tsx
      - app/sign-up/[[...sign-up]]/page.tsx
      - lib/email/send.ts (HTML: Sense<span style="color:#00C896">&amp;</span>Stock)
    The lettermark box is a placeholder until the operator's logo is integrated (A5).

A4. Email addresses + URLs in code (myafriquant.com → sensenstock.com)
      - lib/email/send.ts:
          to: info@myafriquant.com / support@myafriquant.com → @sensenstock.com
          welcome email URLs https://myafriquant.com/... → https://sensenstock.com/...
          wordmark + prose → Sense&Stock (with &amp; in HTML)
      - components/layout/Footer.tsx: mailto:support@myafriquant.com → @sensenstock.com
      - app/api/contact/route.ts: fallback "email us at info@myafriquant.com" → @sensenstock.com
      - lib/db/env.ts: EMAIL_FROM default "AfriQuant <onboarding@resend.dev>" →
                       "Sense&Stock <onboarding@resend.dev>";
                       NEXT_PUBLIC_DATA_SOURCE default "AfriQuant Prototype" → "Sense&Stock Prototype"

A5. Logo (needs operator's file)
    - Operator saves the logo to public/ (SVG preferred, else high-res PNG),
      e.g. public/logo.svg (horizontal wordmark) and/or public/mark.svg (square icon).
    - Navbar: replace the .lm "A" box with the square mark (<img> or inline SVG),
      keep or drop the text wordmark depending on whether the logo includes text.
    - Also use for: auth pages header, footer, favicon (app/icon.png or favicon),
      and the welcome-email header.

A6. Verify + ship
    - npx tsc --noEmit  → zero errors
    - npx next build    → clean
    - Local smoke: fonts render, name shows "Sense&Stock", no stray "AfriQuant"
    - Commit + push → auto-deploys to the current *.vercel.app URL for review

════════════════════════════════════════════════════════════════════════════
PART B — INFRA MIGRATION (sensenstock.com), mirrors the myafriquant playbook
════════════════════════════════════════════════════════════════════════════

Prereq: know where sensenstock.com is registered (GoDaddy or other) for DNS.

B1. Vercel domain
    - Add sensenstock.com (+ www) to the project; make sensenstock.com PRIMARY.
    - Keep myafriquant.com attached but set it to REDIRECT → sensenstock.com
      (old links keep working; everyone new uses the new domain).
    - Add the A record (apex) + CNAME (www) at the registrar per Vercel's values.

B2. Clerk production domain
    - Clerk supports changing a production instance's domain. Point it to
      sensenstock.com → Clerk issues new CNAMEs (clerk./accounts./clkmail./
      clk._domainkey/clk2._domainkey on sensenstock.com). Add them at the registrar,
      verify. (Frontend API becomes clerk.sensenstock.com.)
    - Update Google OAuth: add the new authorized redirect URI
      https://clerk.sensenstock.com/v1/oauth_callback (keep old until cutover).
    - Publishable/secret keys stay the same instance (no key change) UNLESS Clerk
      requires a new production instance for the new domain — confirm in dashboard.
    - Update the production webhook URL → https://sensenstock.com/api/webhooks/clerk.

B3. Resend
    - Add + verify sensenstock.com in Resend (DKIM resend._domainkey + send. MX/SPF),
      same as before. Update Vercel EMAIL_FROM → "Sense&Stock <welcome@sensenstock.com>".

B4. Zoho mailboxes
    - Zoho FREE plan = single domain. To use @sensenstock.com mailboxes you either
      (a) replace the domain in Zoho (remove myafriquant.com, add sensenstock.com,
          re-create info@/support@ + MX/SPF/DKIM at the registrar), or
      (b) keep both (requires a paid Zoho plan for multi-domain).
    - Recreate info@ / support@ (and any others) on sensenstock.com; add root MX +
      SPF + DKIM at the registrar. (No conflict with Resend's send. subdomain / Clerk's clkmail.)

B5. Vercel env var updates (then redeploy)
    - EMAIL_FROM → welcome@sensenstock.com
    - NEXT_PUBLIC_CLERK_* → new values only if Clerk issued new keys
    - CLERK_WEBHOOK_SIGNING_SECRET → new production webhook secret if regenerated
    - NEXT_PUBLIC_DATA_SOURCE / NEXT_PUBLIC_LAST_UPDATED as desired

B6. Verify (like Stage 6): apex + www serve, HTTPS, Google + email sign-in,
    webhook creates users row, welcome email from @sensenstock.com, contact form
    delivers to info@/support@sensenstock.com, old myafriquant.com redirects.

OPEN QUESTIONS for Part B (answer before starting infra):
  - Where is sensenstock.com registered? (GoDaddy again, or elsewhere)
  - Clerk: change existing production instance's domain, or new instance? (check dashboard)
  - Zoho: replace myafriquant.com with sensenstock.com on the free plan (lose old
    mailboxes), or go paid to keep both?