/**
 * Daily-moves resolver.
 *
 * Currently a passthrough to the prototype `DAILY_MOVES` array — there's no
 * `analyst_moves` table in the database yet. A future phase will add the
 * table, an ingest pipeline, and a delta-detection step that diffs current
 * vs previous `analyst_targets`.
 *
 * For now: every move row carries `_provenance: 'mock'`.
 */

import '@/lib/internal/server-only'

import { DAILY_MOVES, type DailyMoveEntry } from '@/lib/data/moves'
import type { Provenance } from './meta'

export interface ResolvedDailyMove extends DailyMoveEntry {
  _provenance: Provenance
}

export async function getDailyMoves(): Promise<ResolvedDailyMove[]> {
  return DAILY_MOVES.map(m => ({ ...m, _provenance: 'mock' as const }))
}
