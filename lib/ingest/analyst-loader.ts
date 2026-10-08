import 'server-only'

import { readFile } from 'node:fs/promises'
import { db } from '@/lib/db'
import { analysts } from '@/lib/db/schema'
import { AnalystFileSchema, type AnalystFile } from '@/lib/types/analyst-input'
import { sanitizeError } from './utils'

export interface AnalystFileResult {
  ok: boolean
  filePath: string
  analystsAttempted: number
  analystsInserted: number
  error?: string
}

export async function processAnalystFile(absolutePath: string): Promise<AnalystFileResult> {
  let parsed: AnalystFile
  try {
    const raw = await readFile(absolutePath, 'utf8')
    const json = JSON.parse(raw)
    const validation = AnalystFileSchema.safeParse(json)
    if (!validation.success) {
      const issues = validation.error.issues
        .map(i => `${i.path.join('.') || '<root>'}: ${i.message}`)
        .join('; ')
      throw new Error(`Schema validation failed: ${issues}`)
    }
    parsed = validation.data
  } catch (err) {
    return {
      ok: false,
      filePath: absolutePath,
      analystsAttempted: 0,
      analystsInserted: 0,
      error: sanitizeError(err, 800),
    }
  }

  try {
    const rows = parsed.analysts.map(a => ({
      externalId:  a.external_id,
      name:        a.name,
      initials:    a.initials,
      firm:        a.firm,
      sinceYear:   a.since_year,
      bio:         a.bio,
    }))

    const result = await db
      .insert(analysts)
      .values(rows)
      .onConflictDoNothing({ target: analysts.externalId })
      .returning({ externalId: analysts.externalId })

    return {
      ok: true,
      filePath: absolutePath,
      analystsAttempted: rows.length,
      analystsInserted: result.length,
    }
  } catch (err) {
    return {
      ok: false,
      filePath: absolutePath,
      analystsAttempted: 0,
      analystsInserted: 0,
      error: sanitizeError(err, 800),
    }
  }
}
