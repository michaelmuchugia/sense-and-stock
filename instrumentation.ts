export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertEnv } = await import('@/lib/db/env')
    assertEnv()
  }
}
