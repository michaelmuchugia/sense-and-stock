import { z } from 'zod'

/**
 * Wire format for an analyst research report. One file = one report = one
 * analyst publishing one or more price targets on a specific date.
 *
 * Strict mode rejects unknown root keys so operator typos (e.g. "analyst_id"
 * instead of "analyst_external_id") fail with a clear message.
 */
export const ResearchTargetSchema = z.object({
  ticker:       z.string().min(1).max(10),
  target_price: z.number().positive(),
  rating:       z.enum(['Buy', 'Hold', 'Sell']),
  notes:        z.string().max(2000).optional(),
}).strict()

export const ResearchFileSchema = z.object({
  analyst_external_id: z.number().int().positive(),
  report_source:       z.string().min(1).max(255),
  issued_date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'must be YYYY-MM-DD' }),
  targets:             z.array(ResearchTargetSchema).min(1).max(200),
}).strict()

export type ResearchFile = z.infer<typeof ResearchFileSchema>
export type ResearchTarget = z.infer<typeof ResearchTargetSchema>
