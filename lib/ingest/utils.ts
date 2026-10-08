import 'server-only'

import { mkdir, rename, writeFile } from 'node:fs/promises'
import { dirname, basename, join, extname } from 'node:path'

/**
 * Sanitize an error for client/log output. Returns at most `max` chars of the
 * message portion; never returns connection strings, stack traces, or raw error
 * payloads.
 */
export function sanitizeError(err: unknown, max = 500): string {
  if (err instanceof Error) return err.message.slice(0, max)
  if (typeof err === 'string') return err.slice(0, max)
  return 'unknown error'
}

/**
 * Retry an async operation with exponential-ish backoff. Use only for
 * idempotent operations. `shouldRetry` lets callers limit retries to specific
 * error types — by default, all errors retry.
 */
export async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  opts: { attempts?: number; baseDelayMs?: number; shouldRetry?: (err: unknown) => boolean } = {},
): Promise<T> {
  const { attempts = 3, baseDelayMs = 500, shouldRetry = () => true } = opts
  let lastErr: unknown
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (i === attempts || !shouldRetry(err)) break
      const delay = baseDelayMs * i * i
      console.warn(`[${label}] attempt ${i}/${attempts} failed (${sanitizeError(err, 200)}). retrying in ${delay}ms`)
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw lastErr
}

/**
 * fetch with a hard timeout. Throws if the request doesn't complete in time.
 * Does NOT retry on its own — wrap in withRetry for that.
 */
export async function fetchWithTimeout(
  url: string,
  opts: { timeoutMs?: number; userAgent?: string; headers?: Record<string, string> } = {},
): Promise<Response> {
  const { timeoutMs = 10_000, userAgent = 'Sense&Stock/0.1 (data-ingest)', headers = {} } = opts
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': userAgent, ...headers },
    })
    return res
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Parse an ISO date prefix from a filename. Accepts `YYYY-MM-DD.csv`,
 * `YYYY-MM-DD-something.csv`, etc. Returns null if the filename does not
 * begin with a valid date.
 */
export function parseFilenameDate(filePath: string): string | null {
  const name = basename(filePath, extname(filePath))
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(name)
  if (!m) return null
  const iso = m[1]
  const d = new Date(iso + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return null
  // Reject impossible dates like 2026-02-31 that parse but round
  const back = d.toISOString().slice(0, 10)
  return back === iso ? iso : null
}

/**
 * Normalize a stock name for matching. Removes:
 * - "Ord X.XX" denomination suffix
 * - Trailing share-class noise
 * - Punctuation
 * - Multiple spaces
 * - Casing
 */
export function normalizeStockName(name: string): string {
  return name
    .replace(/\bord\s+\d+(\.\d+)?\b/i, '')
    .replace(/\bord\s*\d*\b/i, '')
    .replace(/[.,;()&]/g, ' ')
    .replace(/\b(plc|ltd|limited|co|company|the)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/**
 * Move a file with a timestamped name into a target directory. Creates the
 * directory if needed. Does not overwrite (appends a counter if the target
 * filename collides).
 */
export async function moveFileWithTimestamp(
  srcPath: string,
  destDir: string,
  errorBody?: string,
): Promise<string> {
  await mkdir(destDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const original = basename(srcPath)
  let target = join(destDir, `${stamp}-${original}`)
  let counter = 1
  while (await exists(target)) {
    target = join(destDir, `${stamp}-${counter}-${original}`)
    counter++
  }
  await rename(srcPath, target)
  if (errorBody) {
    await writeFile(target + '.error.txt', errorBody, 'utf8')
  }
  return target
}

async function exists(path: string): Promise<boolean> {
  try {
    const { stat } = await import('node:fs/promises')
    await stat(path)
    return true
  } catch {
    return false
  }
}

/**
 * Require the resolved path is within a permitted root. Prevents directory
 * traversal in CLIs that take user paths.
 */
export function assertWithinRoot(absolutePath: string, allowedRoot: string): void {
  const path = require('node:path') as typeof import('node:path')
  const normalized = path.resolve(absolutePath)
  const root = path.resolve(allowedRoot)
  if (!normalized.startsWith(root + path.sep) && normalized !== root) {
    throw new Error(`Path ${absolutePath} is outside allowed root ${allowedRoot}`)
  }
}

export { dirname, basename, join }
