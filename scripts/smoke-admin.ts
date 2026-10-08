import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const URL = 'http://localhost:3000/api/admin/recompute-scores'

async function hit(label: string, headers: Record<string, string> = {}) {
  const t0 = Date.now()
  const res = await fetch(URL, { method: 'POST', headers })
  const body = await res.text().catch(() => '')
  const dt = Date.now() - t0
  console.log(`  ${label.padEnd(28)} ${res.status}  (${dt}ms)`)
  try {
    const json = JSON.parse(body)
    console.log(`    body: ${JSON.stringify(json).slice(0, 200)}`)
  } catch {
    console.log(`    body: ${body.slice(0, 200)}`)
  }
}

async function main() {
  console.log(`Hitting ${URL}\n`)
  await hit('no auth (expect 401)')
  await hit('wrong secret (expect 401)', { authorization: 'Bearer not-the-real-secret-but-long-enough-to-be-32' })
  await hit('correct secret (expect 200)', { authorization: `Bearer ${process.env.ADMIN_SECRET}` })
  await hit('with CRON_SECRET instead (expect 401)', { authorization: `Bearer ${process.env.CRON_SECRET}` })
  console.log('\nrate-limit test (6 hits in quick succession, expect 429 on 6th):')
  for (let i = 1; i <= 6; i++) {
    await hit(`hit ${i}`, { authorization: 'Bearer wrong-secret-padding-to-32-chars-min' })
  }
}

main().catch(err => { console.error(err); process.exit(1) })
