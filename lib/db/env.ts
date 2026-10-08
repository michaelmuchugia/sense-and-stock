import { z } from 'zod'

const PostgresUrl = z
  .string()
  .min(1)
  .refine(
    v => v.startsWith('postgres://') || v.startsWith('postgresql://'),
    { message: 'must start with postgres:// or postgresql://' },
  )

const Strong32 = z
  .string()
  .min(32, { message: 'must be at least 32 characters of entropy' })

const Schema = z.object({
  DATABASE_URL: PostgresUrl,
  DATABASE_URL_DIRECT: PostgresUrl.optional(),
  CRON_SECRET: Strong32,
  ADMIN_SECRET: Strong32,

  // --- Clerk (auth) ---
  // Core keys: required for any auth to function.
  CLERK_SECRET_KEY: z
    .string()
    .min(1)
    .refine(v => v.startsWith('sk_'), { message: 'Clerk secret key must start with sk_' }),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1)
    .refine(v => v.startsWith('pk_'), { message: 'Clerk publishable key must start with pk_' }),
  // Custom-page routing. Defaults match our app/ routes.
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default('/sign-in'),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default('/sign-up'),
  // Webhook secret: only needed once the Clerk webhook endpoint is created.
  // Optional so local sign-in/sign-up works before webhooks are wired.
  CLERK_WEBHOOK_SIGNING_SECRET: z
    .string()
    .refine(v => v === '' || v.startsWith('whsec_'), { message: 'must start with whsec_' })
    .optional(),

  // --- Resend (application email) ---
  // Optional so dev works without it; welcome email is skipped if absent.
  RESEND_API_KEY: z
    .string()
    .refine(v => v === '' || v.startsWith('re_'), { message: 'must start with re_' })
    .optional(),
  EMAIL_FROM: z.string().default('Sense&Stock <onboarding@resend.dev>'),

  // --- M-Pesa (Daraja STK Push) ---
  // Optional so the app boots without billing configured. STK push only works
  // once all five are set. MPESA_CALLBACK_URL must be a public HTTPS endpoint
  // Safaricom can reach (our domain), never localhost.
  MPESA_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  MPESA_CONSUMER_KEY: z.string().optional(),
  MPESA_CONSUMER_SECRET: z.string().optional(),
  MPESA_SHORTCODE: z.string().optional(),
  MPESA_PASSKEY: z.string().optional(),
  MPESA_CALLBACK_URL: z.string().optional(),

  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_ENV: z.string().default('development'),
  NEXT_PUBLIC_DATA_SOURCE: z.string().default('Sense&Stock Prototype'),
  NEXT_PUBLIC_LAST_UPDATED: z.string().default(''),
})

export type Env = z.infer<typeof Schema>

let cached: Env | null = null

export function getEnv(): Env {
  if (cached) return cached
  const parsed = Schema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map(i => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(
      'Invalid environment configuration:\n' +
      issues +
      '\nCheck .env.local locally and Vercel Environment Variables in production.',
    )
  }
  cached = parsed.data
  return cached
}

export function assertEnv(): void {
  getEnv()
}
