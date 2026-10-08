/**
 * Signal snapshots resolver — fully DB-sourced.
 *
 * Phase 1 seeded six months of snapshot data (Oct 2025 → Mar 2026). The
 * /signals page reads via this resolver.
 *
 * The prototype's `SignalSnapshot` interface expects each entry to carry
 * the ticker symbol (`sym`), not the DB stock_id. The resolver does the
 * join here so consumers can keep using `sym` as the join key.
 */

import '@/lib/internal/server-only'

import { cache } from 'react'
import { db, schema, withDbRetry } from '@/lib/db'
import { asc, eq } from 'drizzle-orm'
import type { SignalSnapshot } from '@/lib/types/signal'
import type { Provenance } from './meta'

export interface ResolvedSnapshot extends SignalSnapshot {
  _provenance: Provenance
}

export const getAllSnapshots = cache(_getAllSnapshots)

async function _getAllSnapshots(): Promise<ResolvedSnapshot[]> {
  const [snaps, entries] = await withDbRetry(() => Promise.all([
    db
      .select()
      .from(schema.signalSnapshots)
      .orderBy(asc(schema.signalSnapshots.month)),
    db
      .select({
        snapshotId:    schema.signalSnapshotEntries.snapshotId,
        ticker:        schema.stocks.ticker,
        entryPrice:    schema.signalSnapshotEntries.entryPrice,
        scoreAtSignal: schema.signalSnapshotEntries.scoreAtSignal,
        note:          schema.signalSnapshotEntries.note,
        rank:          schema.signalSnapshotEntries.rank,
      })
      .from(schema.signalSnapshotEntries)
      .innerJoin(schema.stocks, eq(schema.stocks.id, schema.signalSnapshotEntries.stockId))
      .orderBy(asc(schema.signalSnapshotEntries.rank)),
  ]))

  const entriesBySnap = new Map<number, ResolvedSnapshot['signals']>()
  for (const e of entries) {
    const list = entriesBySnap.get(e.snapshotId) ?? []
    list.push({
      sym:     e.ticker,
      entryPx: Number(e.entryPrice),
      score:   e.scoreAtSignal ?? 0,
      note:    e.note ?? '',
    })
    entriesBySnap.set(e.snapshotId, list)
  }

  return snaps.map(s => ({
    month:   s.month,
    label:   s.label,
    naseRet: s.naseRet !== null ? Number(s.naseRet) : 0,
    signals: entriesBySnap.get(s.id) ?? [],
    _provenance: 'db' as const,
  }))
}

export async function getSnapshotByMonth(month: string): Promise<ResolvedSnapshot | null> {
  const all = await getAllSnapshots()
  return all.find(s => s.month === month) ?? null
}

/**
 * Latest first, for the cumulative chart on /signals.
 */
export async function getAllSnapshotsDesc(): Promise<ResolvedSnapshot[]> {
  const all = await getAllSnapshots()
  return [...all].reverse()
}
