import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts`. Clerk's
 * `clerkMiddleware()` returns a standard NextMiddleware function, so it
 * works as the default export here.
 *
 * Only PAGE routes that must redirect-to-sign-in are passed to
 * `auth.protect()`. The user-data API routes (/api/watchlist, /api/account)
 * are intentionally NOT protected here — they self-protect via
 * `requireUser()` and return a proper 401 JSON instead of a 307 redirect to
 * an HTML page (the right behavior for a fetch() client).
 *
 * Operator endpoints (/api/admin, /api/cron) keep their own ADMIN_SECRET /
 * CRON_SECRET Bearer auth and flow through untouched.
 */
const isProtected = createRouteMatcher([
  '/account(.*)',
])

/**
 * Soft "Coming soon" gate for a private/pre-launch window.
 *
 * Enabled only when SITE_GATE is '1'/'true'. While enabled, all public PAGE
 * requests get a holding page (503 + noindex) instead of the real site, so
 * a link shared on socials shows "Coming soon" rather than the app.
 *
 * The team keeps full access: visit any URL with `?access=<SITE_GATE_TOKEN>`
 * once and a bypass cookie is set for 30 days. API routes are never gated —
 * the Clerk webhook, cron, and admin endpoints keep working (they carry their
 * own auth), so sign-ups/data continue to flow behind the scenes.
 *
 * To lift the gate: set SITE_GATE=0 (or remove it) in Vercel and redeploy.
 */
const ACCESS_COOKIE = 'ss_access'
const GATE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

function gateEnabled(): boolean {
  const v = process.env.SITE_GATE
  return v === '1' || v === 'true'
}

function comingSoonResponse(): NextResponse {
  const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Sense&Stock — Launching soon</title>
<style>
  html,body{margin:0;height:100%}
  body{background:#080C12;color:#DDE4EF;font-family:Arial,Helvetica,sans-serif;
    display:flex;align-items:center;justify-content:center;text-align:center;padding:24px}
  .card{max-width:440px}
  .logo{width:auto;height:auto;max-width:300px;margin:0 auto 28px;display:block}
  h1{font-size:26px;font-weight:800;margin:0 0 12px;letter-spacing:-0.02em}
  h1 em{color:#00C896;font-style:normal}
  p{color:#6E8099;line-height:1.7;font-size:15px;margin:0 0 8px}
  .tag{margin-top:24px;font-size:12px;color:#3D4F62;border-top:1px solid rgba(255,255,255,0.08);padding-top:16px}
</style></head><body>
  <div class="card">
    <img class="logo" src="/ss-logo-dark.png" alt="Sense and Stock">
    <h1>Launching soon</h1>
    <p>We're putting the finishing touches on Kenya's analyst intelligence platform.</p>
    <p>Check back shortly.</p>
    <div class="tag">Nairobi, Kenya</div>
  </div>
</body></html>`
  return new NextResponse(html, {
    status: 503,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-robots-tag': 'noindex, nofollow',
      'retry-after': '86400',
      'cache-control': 'no-store, max-age=0',
    },
  })
}

/**
 * Returns a Response to short-circuit the request when the gate blocks it,
 * a redirect that grants the bypass cookie, or null to continue normally.
 */
function applyGate(req: NextRequest): NextResponse | null {
  if (!gateEnabled()) return null

  const url = new URL(req.url)
  const path = url.pathname

  // Never gate API routes — webhook/cron/admin/self-protecting routes must run.
  if (path.startsWith('/api')) return null

  const token = process.env.SITE_GATE_TOKEN || ''

  // Team bypass: `?access=<token>` sets a cookie, then redirect to a clean URL.
  if (token && url.searchParams.get('access') === token) {
    url.searchParams.delete('access')
    const res = NextResponse.redirect(url)
    res.cookies.set(ACCESS_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: GATE_MAX_AGE,
    })
    return res
  }

  // Already holding a valid bypass cookie — let them through.
  if (token && req.cookies.get(ACCESS_COOKIE)?.value === token) return null

  // Everyone else sees the holding page.
  return comingSoonResponse()
}

export default clerkMiddleware(async (auth, req) => {
  const gated = applyGate(req)
  if (gated) return gated

  if (isProtected(req)) {
    await auth.protect()
  }
})

export const config = {
  // Run on everything except Next internals and static files; include the root.
  matcher: ['/((?!_next|.*\\..*).*)', '/'],
}
