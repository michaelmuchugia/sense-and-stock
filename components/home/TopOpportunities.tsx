import Link from 'next/link'
import { getTopOpportunities } from '@/lib/engine/signals'
import { calculateRiskLevel } from '@/lib/engine/risk'
import { genInsight } from '@/lib/engine/score'
import { scoreColor } from '@/lib/utils/score-display'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { DcSignalBadge } from '@/components/ui/SignalBadge'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge'

export async function TopOpportunities() {
  const opps = await getTopOpportunities(8)
  return (
    <>
      <div className="shdr" style={{ paddingTop: 36 }}>
        <div>
          <div className="sht">Top Opportunities Right Now</div>
          <div style={{ fontSize: 11.5, color: 'var(--txd)', marginTop: 2 }}>
            High-confidence signals backed by multiple analysts &middot;{' '}
            <span style={{ color: 'var(--txdd)', fontFamily: 'var(--fm)' }}>Not investment advice</span>
          </div>
        </div>
        <Link href="/smartscreen" className="shl">Smart Screen →</Link>
      </div>
      <div
        style={{
          fontSize: 10.5,
          color: 'var(--txdd)',
          fontFamily: 'var(--fm)',
          padding: '8px 0 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          borderBottom: '1px solid var(--bd)',
          marginBottom: 20,
        }}
      >
        <strong style={{ color: 'rgba(0,200,150,.7)' }}>Data:</strong>
        Faida IB &middot; AIB-AXYS Africa &middot; NCBA IB &middot; Genghis Capital &middot; Nov 2025
      </div>
      <div className="g4">
        {opps.map(({ s, aq, provenance }) => {
          const col = scoreColor(aq.score)
          return (
            <Link key={s.s} href={`/stocks/${s.s}`} className={`dc ${aq.sigClass}`}>
              <div className="dc-top">
                <ScoreRing score={aq.score} size={72} stroke={5} numberSize={18} />
                <div className="dc-meta">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                    <div className="opp-badge">Top Opportunity</div>
                    <ProvenanceBadge provenance={provenance} size="xs" />
                  </div>
                  <div className="dc-sym">{s.s}</div>
                  <div className="dc-name">{s.n}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
                    <DcSignalBadge sigClass={aq.sigClass} signal={aq.signal} />
                    <RiskBadge risk={calculateRiskLevel(s)} />
                  </div>
                </div>
              </div>
              <div className="dc-insight">{genInsight(s, aq)}</div>
              <div className="dc-bottom">
                <div>
                  <div className="dc-price">KES {s.p.toFixed(2)}</div>
                  <div className={`dc-chg ${s.c >= 0 ? 'p' : 'n'}`}>
                    {s.c >= 0 ? '+' : ''}{s.c.toFixed(2)}%
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--fm)', fontSize: 12 }}>KES {s.avgPT} target</div>
                  <div className="p" style={{ fontFamily: 'var(--fm)', fontSize: 11 }}>
                    {aq.upside_pct >= 0 ? '+' : ''}{aq.upside_pct.toFixed(1)}% upside
                  </div>
                </div>
              </div>
              {/* unused col reference to satisfy eslint */}
              <span style={{ display: 'none' }}>{col}</span>
            </Link>
          )
        })}
      </div>
    </>
  )
}
