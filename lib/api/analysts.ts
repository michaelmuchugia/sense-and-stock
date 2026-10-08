/**
 * Analysts resolver.
 *
 * Phase 1 seeded all 16 analysts into the database, and the operator
 * onboards new analysts via `npm run ingest:analysts`. So this resolver
 * is DB-only — `_provenance` is always `'db'` for symmetry with the
 * stock resolver.
 *
 * The `stocks: string[]` field on the prototype `Analyst` is built from
 * the `analyst_coverage` junction table (which tickers each analyst covers).
 */

import '@/lib/internal/server-only'

import { cache } from 'react'
import { db, schema, withDbRetry } from '@/lib/db'
import { eq } from 'drizzle-orm'
import type { Analyst } from '@/lib/types/analyst'
import type { Provenance } from './meta'

export interface ResolvedAnalyst extends Analyst {
  _provenance: Provenance
}

interface CoverageRow {
  analystId: number
  ticker: string
}

async function loadAnalystCoverage(): Promise<Map<number, string[]>> {
  const rows: CoverageRow[] = await db
    .select({
      analystId: schema.analystCoverage.analystId,
      ticker:    schema.stocks.ticker,
    })
    .from(schema.analystCoverage)
    .innerJoin(schema.stocks, eq(schema.stocks.id, schema.analystCoverage.stockId))

  const map = new Map<number, string[]>()
  for (const r of rows) {
    const list = map.get(r.analystId) ?? []
    list.push(r.ticker)
    map.set(r.analystId, list)
  }
  return map
}

function rowToAnalyst(
  row: {
    id: number
    externalId: number | null
    name: string
    initials: string | null
    firm: string | null
    sinceYear: number | null
    hitRatio: string | null
    avgReturn: string | null
    avgDays: number | null
    perfScore: string | null
    totalTargets: number
    bio: string | null
  },
  coverage: Map<number, string[]>,
): ResolvedAnalyst {
  // We expose the externalId as `id` so any prototype-era links still
  // resolve to the right person. If externalId is missing (it shouldn't be
  // for seeded analysts), fall back to the DB serial id.
  return {
    id:       row.externalId ?? row.id,
    nm:       row.name,
    ini:      row.initials ?? '',
    firm:     row.firm ?? '',
    stocks:   coverage.get(row.id) ?? [],
    hit:      row.hitRatio  !== null ? Number(row.hitRatio)  : 0,
    ret:      row.avgReturn !== null ? Number(row.avgReturn) : 0,
    days:     row.avgDays   ?? 0,
    score:    row.perfScore !== null ? Number(row.perfScore) : 0,
    targets:  row.totalTargets,
    since:    row.sinceYear !== null ? String(row.sinceYear) : '',
    bio:      row.bio ?? '',
    // Accuracy is only published when the analyst has enough matured calls.
    // hitRatio null in the DB means Insufficient history, not a zero hit rate.
    measured: row.hitRatio !== null,
    _provenance: 'db',
  }
}

export const getAllAnalysts = cache(_getAllAnalysts)

async function _getAllAnalysts(): Promise<ResolvedAnalyst[]> {
  const [rows, coverage] = await withDbRetry(() => Promise.all([
    db
      .select()
      .from(schema.analysts)
      .where(eq(schema.analysts.isActive, true)),
    loadAnalystCoverage(),
  ]))
  return rows.map(r => rowToAnalyst(r, coverage))
}

/**
 * Resolve by the operator-facing `external_id` (the analyst ID exposed to
 * URLs like /analysts/1). Returns null if no analyst has that external id.
 */
export async function getAnalystByExternalId(externalId: number): Promise<ResolvedAnalyst | null> {
  const rows = await db
    .select()
    .from(schema.analysts)
    .where(eq(schema.analysts.externalId, externalId))
    .limit(1)
  if (rows.length === 0) return null
  const coverage = await loadAnalystCoverage()
  return rowToAnalyst(rows[0], coverage)
}

/**
 * Resolve all analysts who cover a given ticker, ordered by performance score desc.
 */
export async function getAnalystsForStock(ticker: string): Promise<ResolvedAnalyst[]> {
  const clean = ticker.trim().toUpperCase()
  if (!clean) return []
  const all = await getAllAnalysts()
  return all
    .filter(a => a.stocks.includes(clean))
    .sort((a, b) => b.score - a.score)
}

/**
 * Resolve all external IDs (for generateStaticParams on /analysts/[id]).
 */
export async function getAllAnalystExternalIds(): Promise<number[]> {
  const rows = await db
    .select({ externalId: schema.analysts.externalId })
    .from(schema.analysts)
    .where(eq(schema.analysts.isActive, true))
  return rows
    .map(r => r.externalId)
    .filter((id): id is number => id !== null)
}
