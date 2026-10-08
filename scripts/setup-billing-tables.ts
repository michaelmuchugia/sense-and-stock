/**
 * Create the billing tables (subscriptions, mpesa_payments) if they do not
 * exist. Additive and idempotent. Mirrors lib/db/schema.ts.
 *
 *   npx tsx scripts/setup-billing-tables.ts
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { sql } from 'drizzle-orm'

const db = drizzle(neon(process.env.DATABASE_URL!))

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS subscriptions (
     id serial PRIMARY KEY,
     user_id varchar(255) NOT NULL UNIQUE REFERENCES users(clerk_user_id) ON DELETE CASCADE,
     plan varchar(20) NOT NULL DEFAULT 'free',
     status varchar(20) NOT NULL DEFAULT 'inactive',
     started_at timestamp,
     expires_at timestamp,
     updated_at timestamp NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions (status)`,
  `CREATE TABLE IF NOT EXISTS mpesa_payments (
     id serial PRIMARY KEY,
     user_id varchar(255) NOT NULL REFERENCES users(clerk_user_id) ON DELETE CASCADE,
     checkout_request_id varchar(120) UNIQUE,
     merchant_request_id varchar(120),
     phone varchar(20) NOT NULL,
     amount integer NOT NULL,
     plan varchar(20) NOT NULL DEFAULT 'plus',
     status varchar(20) NOT NULL DEFAULT 'pending',
     mpesa_receipt varchar(40),
     result_code integer,
     result_desc text,
     created_at timestamp NOT NULL DEFAULT now(),
     updated_at timestamp NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS mpesa_payments_user_idx ON mpesa_payments (user_id)`,
  `CREATE INDEX IF NOT EXISTS mpesa_payments_checkout_idx ON mpesa_payments (checkout_request_id)`,
]

async function main() {
  for (const s of STATEMENTS) {
    await db.execute(sql.raw(s))
    console.log('ok:', s.split('\n')[0].trim())
  }
  console.log('Billing tables ready.')
  process.exit(0)
}
main().catch(e => { console.error(e); process.exit(1) })
