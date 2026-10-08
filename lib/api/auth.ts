import 'server-only'

import { timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'

// Per-IP token-bucket rate limiter (in-memory, per server instance).
// Cron/admin endpoints expect single-digit hits per minute. Anything beyond
// that is suspicious.
const RATE_LIMIT_WINDOW_MS = 60_000
const ipBuckets = new Map<string, Map<string, { count: number; resetAt: number }>>()

export function rateLimit(scope: string, ip: string, max: number): boolean {
  const now = Date.now()
  let scopeMap = ipBuckets.get(scope)
  if (!scopeMap) {
    scopeMap = new Map()
    ipBuckets.set(scope, scopeMap)
  }
  const entry = scopeMap.get(ip)
  if (!entry || entry.resetAt < now) {
    scopeMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  entry.count++
  return entry.count <= max
}

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real
  return 'unknown'
}

/**
 * Constant-time string compare. Both inputs are coerced to Buffer; if lengths
 * differ, we still run timingSafeEqual on padded buffers so the caller cannot
 * infer the expected length.
 */
export function safeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8')
  const bBuf = Buffer.from(b, 'utf8')
  if (aBuf.length !== bBuf.length) {
    const pad = Buffer.alloc(Math.max(aBuf.length, bBuf.length))
    timingSafeEqual(pad, pad)
    return false
  }
  return timingSafeEqual(aBuf, bBuf)
}

/**
 * Verify a Bearer token from the Authorization header against an env-supplied
 * secret. Returns false if:
 * - the env var is missing or too short
 * - the header is missing or wrong format
 * - the token does not match (constant-time)
 */
export function authorizeBearer(
  req: NextRequest,
  envVarName: 'CRON_SECRET' | 'ADMIN_SECRET',
): boolean {
  const secret = process.env[envVarName]
  if (!secret || secret.length < 32) {
    console.error(`${envVarName} is missing or too weak (<32 chars)`)
    return false
  }
  const header = req.headers.get('authorization') ?? ''
  return safeStringEqual(header, `Bearer ${secret}`)
}
