import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { getEntitlement } from '@/lib/billing/entitlements'
import { getUserById } from '@/lib/db/queries/users'
import { mpesaConfigured } from '@/lib/mpesa/client'
import { SubscribeClient } from '@/components/subscribe/SubscribeClient'

export const dynamic = 'force-dynamic'

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function SubscribePage() {
  const { userId } = await auth()

  if (!userId) {
    return (
      <main className="C pricing-page">
        <header className="pricing-header">
          <div className="hbadge">Sense &amp; Stock Plus</div>
          <h1>Your research.<br /><em>All in one place.</em></h1>
          <p>KES 750 per month</p>
        </header>
        <div className="plan-review">
          <h2>Included with Plus</h2>
          <p>Full available histories, analyst comparisons, research filters, watchlists and email alerts.</p>
          <p>Coverage varies by stock and analyst. Performance is published only when records meet the methodology.</p>
          <Link className="plan-action primary" href="/sign-in?callbackUrl=%2Fsubscribe%3Fplan%3Dplus">Sign in to continue</Link>
        </div>
      </main>
    )
  }

  const [ent, dbUser] = await Promise.all([getEntitlement(userId), getUserById(userId)])

  return (
    <main className="C pricing-page">
      <header className="pricing-header">
        <div className="hbadge">Sense &amp; Stock Plus</div>
        <h1>Your research.<br /><em>All in one place.</em></h1>
        <p>KES 750 per month</p>
      </header>

      {ent.plan === 'plus' ? (
        <div className="plan-review">
          <h2>You are on Plus</h2>
          <p>Active until <strong>{ent.expiresAt ? formatDate(ent.expiresAt) : 'the end of your term'}</strong>. Thank you for supporting Sense&amp;Stock.</p>
          <p>Renew any time to add another month on top of the time you have left.</p>
          <SubscribeClient defaultPhone={dbUser?.phone ?? ''} configured={mpesaConfigured()} renew />
        </div>
      ) : (
        <div className="plan-review">
          <h2>Get Plus with M-Pesa</h2>
          <p>Enter your Safaricom number and approve the KES 750 prompt on your phone.</p>
          <SubscribeClient defaultPhone={dbUser?.phone ?? ''} configured={mpesaConfigured()} />
        </div>
      )}
    </main>
  )
}
