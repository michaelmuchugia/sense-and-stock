import type { Metadata } from 'next'
import { PricingPlans } from '@/components/pricing/PricingPlans'

export const metadata: Metadata = { title: 'Pricing | Sense & Stock', description: 'Explore Free and Plus plans for NSE analyst research.' }

export default function PricingPage() {
  return <main className="C pricing-page"><header className="pricing-header"><div className="hbadge">Simple plans</div><h1>Start exploring.<br /><em>Go deeper when you need to.</em></h1><p>Choose the research experience that fits you.</p></header><PricingPlans /></main>
}
