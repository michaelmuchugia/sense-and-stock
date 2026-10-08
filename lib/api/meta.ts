/**
 * Provenance markers for the resolver layer.
 *
 * Every resolved entity exposes a `_provenance` field that records whether
 * its dynamic fields came from the live database, from the prototype mock
 * arrays in `lib/data/*`, or from a mix of both.
 *
 * The UI uses this to render the small "prototype" pill on rows that fell
 * back to mock values. The field is server-side only — it MAY be passed to
 * client components but it has no security implications either way.
 */

export type Provenance = 'db' | 'mock' | 'hybrid'

/**
 * Resolve a provenance from two boolean flags:
 *   primaryFromDb - did the "primary" data source (e.g. price) come from DB?
 *   secondaryFromDb - did the "secondary" data source (e.g. consensus) come from DB?
 *
 * Both true  -> 'db'
 * Both false -> 'mock'
 * Mixed      -> 'hybrid'
 */
export function resolveProvenance(
  primaryFromDb: boolean,
  secondaryFromDb: boolean,
): Provenance {
  if (primaryFromDb && secondaryFromDb) return 'db'
  if (!primaryFromDb && !secondaryFromDb) return 'mock'
  return 'hybrid'
}

/**
 * Render-friendly label for a provenance value.
 * Used by the ProvenanceBadge component and by debug logs.
 */
export function provenanceLabel(p: Provenance): string | null {
  if (p === 'db') return null
  if (p === 'hybrid') return 'partial'
  return 'prototype'
}

/**
 * For debug logging during dev: format a one-line fallback notice.
 */
export function fallbackDebug(entity: string, key: string, missing: string[]): string {
  return `[resolver] ${entity}=${key} fell back to mock for: ${missing.join(', ')}`
}
