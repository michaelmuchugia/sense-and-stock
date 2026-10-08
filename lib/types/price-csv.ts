import { z } from 'zod'

/**
 * Schema for a single parsed row from an NSE-export CSV after column
 * normalization. Numeric fields accept "" / null and become undefined so
 * the upsert can skip them.
 */
export const PriceCsvRowSchema = z.object({
  high52w:    z.number().nonnegative().nullable(),
  low52w:     z.number().nonnegative().nullable(),
  name:       z.string().min(1).max(255),
  isin:       z.string().regex(/^[A-Z]{2}[A-Z0-9]{9}\d$/i).optional().nullable(),
  status:     z.string().max(8).optional().nullable(),
  high:       z.number().nonnegative().nullable(),
  low:        z.number().nonnegative().nullable(),
  vwap:       z.number().nonnegative().nullable(),
  previous:   z.number().nonnegative().nullable(),
  volume:     z.number().nonnegative().int().nullable(),
})

export type PriceCsvRow = z.infer<typeof PriceCsvRowSchema>

export interface MatchedPriceRow {
  ticker: string
  date: string  // YYYY-MM-DD
  close: number
  previous?: number
  open?: number
  high?: number
  low?: number
  volume?: number
  changePct?: number
  high52w?: number
  low52w?: number
}
