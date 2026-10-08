/**
 * Smoke tests for /api/admin/revalidate.
 * Hits the local dev server with various auth + body shapes.
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const URL = 'http://localhost:3000/api/admin/revalidate'
const SECRET = process.env.ADMIN_SECRET ?? ''
const CRON = process.env.CRON_SECRET ?? ''

if (!SECRET) {
  console.error('ADMIN_SECRET not set in .env.local')
  process.exit(1)
}

interface Case {
  label: string
  init: RequestInit
  expect: number
}

const cases: Case[] = [
  {
    label: 'no auth (expect 401)',
    init: { method: 'POST' },
    expect: 401,
  },
  {
    label: 'wrong secret (expect 401)',
    init: { method: 'POST', headers: { authorization: 'Bearer wrong' } },
    expect: 401,
  },
  {
    label: 'CRON_SECRET (wrong scope) (expect 401)',
    init: { method: 'POST', headers: { authorization: `Bearer ${CRON}` } },
    expect: 401,
  },
  {
    label: 'GET with secret (expect 200, revalidates all)',
    init: { method: 'GET', headers: { authorization: `Bearer ${SECRET}` } },
    expect: 200,
  },
  {
    label: 'POST with valid paths (expect 200)',
    init: {
      method: 'POST',
      headers: {
        authorization: `Bearer ${SECRET}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ paths: ['/stocks/SCOM', '/'] }),
    },
    expect: 200,
  },
  {
    label: 'POST with disallowed path (expect 400)',
    init: {
      method: 'POST',
      headers: {
        authorization: `Bearer ${SECRET}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ paths: ['/secret-admin'] }),
    },
    expect: 400,
  },
  {
    label: 'POST with malformed JSON (expect 400)',
    init: {
      method: 'POST',
      headers: {
        authorization: `Bearer ${SECRET}`,
        'content-type': 'application/json',
      },
      body: '{not-json',
    },
    expect: 400,
  },
  {
    label: 'POST with path traversal attempt (expect 400)',
    init: {
      method: 'POST',
      headers: {
        authorization: `Bearer ${SECRET}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ paths: ['/stocks/../api/cron'] }),
    },
    expect: 400,
  },
  {
    label: 'POST with unknown body key (expect 400)',
    init: {
      method: 'POST',
      headers: {
        authorization: `Bearer ${SECRET}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ paths: ['/'], evil: 'shellshock' }),
    },
    expect: 400,
  },
]

async function main() {
  console.log(`Hitting ${URL}\n`)
  let passed = 0
  let failed = 0
  for (const c of cases) {
    const start = Date.now()
    const res = await fetch(URL, c.init)
    const ms = Date.now() - start
    const body = await res.text()
    const ok = res.status === c.expect
    const mark = ok ? '+' : 'X'
    console.log(`  ${mark} ${c.label.padEnd(50)} ${res.status} (${ms}ms)`)
    console.log(`    ${body.slice(0, 140)}`)
    if (ok) passed++
    else failed++
  }
  console.log(`\n${passed}/${cases.length} passed`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch(err => { console.error(err); process.exit(1) })
