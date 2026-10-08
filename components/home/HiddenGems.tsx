import Link from 'next/link'
import { getHiddenOpportunities } from '@/lib/engine/signals'
import { calculateRiskLevel } from '@/lib/engine/risk'
import { genInsight } from '@/lib/engine/score'
import { scoreColor } from '@/lib/utils/score-display'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge'

export async function HiddenGems() {
  const gems = await getHiddenOpportunities()
  return (
    <>
      <div className="shdr">
        <div>
          <div className="sht">Hidden Opportunities</div>
          <div style={{ fontSize: 11.5, color: 'var(--txd)', marginTop: 2 }}>
            Low analyst coverage (&le;2), high upside, higher risk
          </div>
        </div>
        <Link href="/smartscreen" className="shl">All Stocks →</Link>
      </div>
      <div className="hg-disc">
        <strong>Note:</strong> These are lower-coverage stocks with unusual upside or momentum signals. They may carry higher risk due to limited analyst coverage. This is informational only, not a recommendation to buy or sell.
      </div>
      {gems.length === 0 ? (
        <div style={{ color: 'var(--txd)', fontSize: 13, padding: '20px 0' }}>
          No hidden opportunities match current criteria.
        </div>
      ) : (
        <div className="hg-grid">
          {gems.map(({ s, aq, upside, provenance }) => {
            const col = scoreColor(aq.score)
            return (
              <Link key={s.s} href={`/stocks/${s.s}`} className="hg-card">
                <div className="hg-top">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                    <div className="hg-badge">Hidden Opportunity</div>
                    <ProvenanceBadge provenance={provenance} size="xs" />
                  </div>
                  <div className="hg-sym">{s.s}</div>
                  <div className="hg-name">{s.n}</div>
                  <div className="hg-sec">{s.sec}</div>
                </div>
                <div className="hg-body">
                  <div className="hg-row"><span className="hg-lbl">Price</span><span className="hg-val">KES {s.p.toFixed(2)}</span></div>
                  <div className="hg-row">
                    <span className="hg-lbl">Target</span>
                    <span className="hg-val p">KES {s.avgPT} ({upside >= 0 ? '+' : ''}{upside.toFixed(1)}%)</span>
                  </div>
                  <div className="hg-row"><span className="hg-lbl">Analysts</span><span className="hg-val">{s.a || 0} covering</span></div>
                  <div className="hg-row">
                    <span className="hg-lbl">Day change</span>
                    <span className={`hg-val ${s.c >= 0 ? 'p' : 'n'}`}>
                      {s.c >= 0 ? '+' : ''}{s.c.toFixed(2)}%
                    </span>
                  </div>
                  <div className="hg-row"><span className="hg-lbl">Risk level</span><RiskBadge risk={calculateRiskLevel(s)} /></div>
                  <div className="hg-row">
                    <span className="hg-lbl">Score</span>
                    <span className="hg-val" style={{ color: col }}>{aq.score}/100</span>
                  </div>
                </div>
                <div className="hg-insight">{genInsight(s, aq)}</div>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
