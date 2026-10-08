import 'server-only'

import { db } from '../index'
import { ingestionLog } from '../schema'
import { desc } from 'drizzle-orm'

export type IngestionStatus = 'success' | 'partial' | 'failed'

export interface IngestionLogInput {
  source: string
  stocksUpdated: number
  status: IngestionStatus
  errorMessage?: string
  durationMs: number
}

export async function logIngestionRun(data: IngestionLogInput) {
  return db.insert(ingestionLog).values(data).returning()
}

export async function getRecentIngestionRuns(limit = 50) {
  return db
    .select()
    .from(ingestionLog)
    .orderBy(desc(ingestionLog.runAt))
    .limit(limit)
}
