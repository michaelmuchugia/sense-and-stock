'use client'

import Link from 'next/link'


const FEATURES = [
  ['Stock and analyst search', 'Included', 'Included'],
  ['Latest verified calls and source links', 'Included', 'Included'],
  ['Stock and analyst profiles', 'Basic view', 'Detailed view'],
  ['Call and revision history', 'Selected examples', 'Full available history'],
  ['Analyst comparisons', 'Selected examples', 'Detailed comparisons'],
  ['Saved research and watchlists', 'Basic access', 'Expanded access'],
  ['Research filters', 'Basic access', 'Expanded access'],
  ['Target-change email alerts', 'Not included', 'Included'],
]

export function PricingPlans({ compact = false }: { compact?: boolean }) {
  return <section className="pricing-plans" aria-label="Free and Plus plans">
    <div className="pricing-grid">
      <article className="pricing-plan">
        <span className="plan-tag">Explore</span><h3>Free</h3>
        <p>Get familiar with NSE analyst research.</p>
        <div className="plan-price">KES 0 <span>always free</span></div>
        <ul><li>Stock and analyst search</li><li>Latest verified calls, dates and sources</li><li>Basic profiles and selected history examples</li><li>Methodology and coverage information</li></ul>
        <Link href="/stocks" className="plan-action">Explore the platform</Link>
      </article>
      <article className="pricing-plan plus">
        <span className="plan-tag">Research deeper</span><h3>Sense &amp; Stock Plus</h3>
        <p>Follow the research behind the latest call.</p>
        <div className="plan-price">KES 750 <span>per month</span></div>
        <ul><li>Everything in Free</li><li>Full available call and revision histories</li><li>Detailed analyst comparisons and research filters</li><li>Expanded watchlists and saved research</li><li>Target-change email alerts</li></ul>
        <Link href="/subscribe?plan=plus" className="plan-action primary">Get Plus for KES 750 a month</Link>
      </article>
    </div>
    <p className="pricing-footnote">Both plans use the same verified records. Coverage and history vary by stock and analyst. Performance metrics appear only where the available history meets the published methodology.</p>
    {compact ? <Link className="pricing-link" href="/pricing">Compare plans and read the FAQ →</Link> : <>
      <div className="pricing-comparison"><h2>Compare plans</h2><table><thead><tr><th scope="col">Feature</th><th scope="col">Free</th><th scope="col">Plus</th></tr></thead><tbody>{FEATURES.map(([feature, free, plus]) => <tr key={feature}><th scope="row">{feature}</th><td>{free}</td><td>{plus}</td></tr>)}</tbody></table></div>
      <div className="pricing-faq"><h2>A few things to know</h2>
        <details><summary>What does Plus include?</summary><p>Full available research histories, detailed analyst comparisons, research filters, watchlists and target-change email alerts for KES 750 per month.</p></details>
        <details><summary>Are different analysts available on each plan?</summary><p>The plans share the same verified analyst records. Plus is designed to add depth, comparisons and saved research. Paying does not change an analyst’s performance score.</p></details>
        <details><summary>What if an analyst has little history?</summary><p>The platform will show “Insufficient history” when there are too few eligible completed calls. A subscription cannot create missing records.</p></details>
        <details><summary>How do I pay and manage my plan?</summary><p>Choose Plus to see payment options and billing terms. Manage your subscription and alert preferences from your account.</p></details>
        <details><summary>Is this investment advice?</summary><p>Sense &amp; Stock organises published research and documented outcomes. It provides market analysis and education, not investment advice.</p></details>
      </div>
    </>}
  </section>
}
