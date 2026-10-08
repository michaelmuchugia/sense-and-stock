import Link from 'next/link'

export function Footer() {
  return (
    <footer>
      <div className="ftop">
        <div>
          <img src="/ss-logo-dark.png" alt="Sense and Stock" className="footer-logo" width={149} height={44} />
          <div className="fdesc">
            Kenya&apos;s analyst intelligence platform. Track NSE price target accuracy and make more informed investment decisions.
          </div>
        </div>
        <div className="fcol">
          <h4>Platform</h4>
          <Link href="/stocks">All Stocks</Link>
          <Link href="/analysts">Analysts</Link>
          <Link href="/leaderboard">Leaderboard</Link>
          <Link href="/smartscreen">Smart Screen</Link>
          <Link href="/pricing">Pricing</Link>
        </div>
        <div className="fcol">
          <h4>Research</h4>
          <Link href="/perspectives">Perspectives</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/compare">Compare</Link>
          <a>Set Alerts</a>
        </div>
        <div className="fcol">
          <h4>Company</h4>
          <a>About Sense&Stock</a>
          <Link href="/contact">Contact Us</Link>
          <a href="mailto:support@sensenstock.com">Support</a>
          <a>Privacy Policy</a>
          <a>Terms &amp; Conditions</a>
        </div>
      </div>
      <div className="fbot">
        <div className="fdis">
          Sense&Stock is not a provider of financial advice. All information is provided as-is. Analyst price targets are sourced from publicly available research reports from CMA-licensed NSE brokerages. For informational purposes only. Always consult a CMA-licensed investment adviser before making investment decisions. © 2026 Sense&Stock.
        </div>
        <div className="fcpy">Sense&Stock · Nairobi, Kenya</div>
      </div>
      <div className="aq-master-disc">
        <strong>Disclaimer:</strong> Sense&Stock provides model-based market intelligence for informational purposes only. This is not financial advice or a recommendation to buy or sell securities. Always consult a CMA-licensed investment adviser before making investment decisions. Prototype data, not real-time. © 2026 Sense&Stock.
      </div>
    </footer>
  )
}
