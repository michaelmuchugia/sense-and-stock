import 'server-only'

import { db } from '../index'
import { signalSnapshots, signalSnapshotEntries } from '../schema'
import { eq } from 'drizzle-orm'

export interface SnapshotInput {
  month: string
  label: string
  naseRet: string
}

export async function upsertSnapshot(data: SnapshotInput) {
  return db
    .insert(signalSnapshots)
    .values(data)
    .onConflictDoUpdate({
      target: signalSnapshots.month,
      set: {
        label:   data.label,
        naseRet: data.naseRet,
      },
    })
    .returning()
}

export interface SnapshotEntryInput {
  snapshotId: number
  stockId: number
  entryPrice: string
  scoreAtSignal?: number
  note?: string
  rank?: number
}

export async function upsertSnapshotEntry(data: SnapshotEntryInput) {
  return db
    .insert(signalSnapshotEntries)
    .values(data)
    .onConflictDoUpdate({
      target: [signalSnapshotEntries.snapshotId, signalSnapshotEntries.stockId],
      set: {
        entryPrice:    data.entryPrice,
        scoreAtSignal: data.scoreAtSignal,
        note:          data.note,
        rank:          data.rank,
      },
    })
    .returning()
}

export async function getAllSnapshots() {
  return db.select().from(signalSnapshots)
}

export async function getSnapshotEntries(snapshotId: number) {
  return db
    .select()
    .from(signalSnapshotEntries)
    .where(eq(signalSnapshotEntries.snapshotId, snapshotId))
}
