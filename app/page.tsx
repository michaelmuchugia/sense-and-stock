import Link from 'next/link'
import { PricingPlans } from '@/components/pricing/PricingPlans'
import { ResearchGuide } from '@/components/home/ResearchGuide'
import { ARTICLES } from '@/lib/articles'
import { SignalOfTheWeek } from '@/components/home/SignalOfTheWeek'
import { TopOpportunities } from '@/components/home/TopOpportunities'
import { HiddenGems } from '@/components/home/HiddenGems'
import { StatStrip } from '@/components/home/StatStrip'
import { NewsletterSection } from '@/components/home/NewsletterSection'

import { PlatformSearch } from '@/components/layout/PlatformSearch'
import { getAllStocks } from '@/lib/api/stocks'
import { getAllAnalysts } from '@/lib/api/analysts'

export const revalidate = 3600

export default async function HomePage() {
  const [stocks, analysts] = await Promise.all([getAllStocks(), getAllAnalysts()])
  const searchIndex = {
    stocks: stocks.map(s => ({ ticker: s.s, name: s.n, sector: s.sec })),
    analysts: analysts.map(a => ({ id: a.id, nm: a.nm, firm: a.firm })),
  }
  return <main className="home-refresh">
    <section className="C search-hero">
      <div className="hbadge">NSE analyst research</div>
      <h1>Make sense of your<br /><em>next stock decision.</em></h1>
      <p>Explore analyst views, compare price targets, and follow their history on the NSE.</p>
      <PlatformSearch searchIndex={searchIndex} prominent />
      <div className="hero-shortcuts"><span>Start with</span><Link href="/stocks/SCOM">Safaricom</Link><Link href="/stocks/KCB">KCB</Link><Link href="/stocks/EQTY">Equity</Link><Link href="/stocks">All stocks</Link></div>
    </section>
    <section className="C home-explore" aria-label="Explore research">
      <Link href="/stocks"><span className="explore-number">01</span><strong>Explore a stock</strong><p>See analyst coverage and price targets for a company.</p></Link>
      <Link href="/analysts"><span className="explore-number">02</span><strong>Find an analyst</strong><p>Review the research history behind an analyst’s calls.</p></Link>
      <Link href="/smartscreen"><span className="explore-number">03</span><strong>Screen and compare</strong><p>Explore stocks that match your research criteria.</p></Link>
    </section>
    <ResearchGuide />
    <section className="C home-pricing"><h2>Research at your own pace.</h2><p>Start free. Get full research histories, comparisons and alerts with Plus.</p><PricingPlans compact /></section>
    <section className="C home-more"><h2>Questions worth asking.</h2><div className="home-explore">{ARTICLES.map(a=><Link key={a.slug} href={'/learn/'+a.slug}><span className="plan-tag">{a.category}</span><strong>{a.title}</strong><p>{a.summary}</p></Link>)}</div><Link href="/learn">Visit Learn →</Link></section>
    <div className="C home-more">
      <NewsletterSection />
    </div>
  </main>
}
