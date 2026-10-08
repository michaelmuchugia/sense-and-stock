import { defineConfig } from 'drizzle-kit'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const migrationsUrl = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL

if (!migrationsUrl) {
  throw new Error(
    'DATABASE_URL_DIRECT (preferred) or DATABASE_URL must be set for migrations. ' +
    'Add it to .env.local.',
  )
}

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: migrationsUrl,
  },
  verbose: true,
  strict: true,
})
