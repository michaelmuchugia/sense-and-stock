import { z } from 'zod'

/**
 * Wire format for adding a new analyst to the DB. Mirrors the research-ingest
 * pattern: operator drops a JSON file under ingest/analysts/, runs the CLI,
 * file moves to processed/ on success.
 */
export const NewAnalystSchema = z.object({
  external_id: z.number().int().positive(),
  name:        z.string().min(1).max(255),
  initials:    z.string().min(1).max(10).optional(),
  firm:        z.string().min(1).max(255).optional(),
  since_year:  z.number().int().min(1900).max(3000).optional(),
  bio:         z.string().max(5000).optional(),
}).strict()

export const AnalystFileSchema = z.object({
  analysts: z.array(NewAnalystSchema).min(1).max(100),
}).strict()

export type AnalystFile = z.infer<typeof AnalystFileSchema>
export type NewAnalyst = z.infer<typeof NewAnalystSchema>
