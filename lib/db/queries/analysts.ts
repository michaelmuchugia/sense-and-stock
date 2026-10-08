import 'server-only'

import { db } from '../index'
import { analysts, analystCoverage } from '../schema'
import { eq } from 'drizzle-orm'

export async function getAllAnalysts() {
  return db.select().from(analysts).where(eq(analysts.isActive, true))
}

export async function getAnalystByExternalId(externalId: number) {
  const result = await db
    .select()
    .from(analysts)
    .where(eq(analysts.externalId, externalId))
    .limit(1)
  return result[0] ?? null
}

export interface AnalystInput {
  externalId: number
  name: string
  initials?: string
  firm?: string
  sinceYear?: number
  hitRatio?: string
  avgReturn?: string
  avgDays?: number
  perfScore?: string
  totalTargets?: number
  bio?: string
}

export async function upsertAnalyst(data: AnalystInput) {
  return db
    .insert(analysts)
    .values(data)
    .onConflictDoUpdate({
      target: analysts.externalId,
      set: {
        name:         data.name,
        initials:     data.initials,
        firm:         data.firm,
        sinceYear:    data.sinceYear,
        hitRatio:     data.hitRatio,
        avgReturn:    data.avgReturn,
        avgDays:      data.avgDays,
        perfScore:    data.perfScore,
        totalTargets: data.totalTargets,
        bio:          data.bio,
        updatedAt:    new Date(),
      },
    })
    .returning()
}

export interface CoverageInput {
  analystId: number
  stockId: number
  hitRatio?: string
  avgReturn?: string
  avgDays?: number
  totalCalls?: number
}

export async function upsertCoverage(data: CoverageInput) {
  return db
    .insert(analystCoverage)
    .values(data)
    .onConflictDoUpdate({
      target: [analystCoverage.analystId, analystCoverage.stockId],
      set: {
        hitRatio:   data.hitRatio,
        avgReturn:  data.avgReturn,
        avgDays:    data.avgDays,
        totalCalls: data.totalCalls,
        updatedAt:  new Date(),
      },
    })
    .returning()
}

export async function getAnalystsForStock(stockId: number) {
  return db
    .select({
      analyst: analysts,
      coverage: analystCoverage,
    })
    .from(analystCoverage)
    .innerJoin(analysts, eq(analysts.id, analystCoverage.analystId))
    .where(eq(analystCoverage.stockId, stockId))
}
