import Link from 'next/link'
import { getSignalOfTheWeek } from '@/lib/engine/signals'
import { scoreColor } from '@/lib/utils/score-display'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { SignalBadge } from '@/components/ui/SignalBadge'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge'

export async function SignalOfTheWeek() {
  const sotw = await getSignalOfTheWeek()

  return (
    <>
      <div className="shdr" style={{ paddingTop: 36 }}>
        <div className="sht">Sense&Stock Signal of the Week</div>
        <div className="shm">Model output &middot; Not financial advice</div>
      </div>
      <div className="sotw-wrap">
        {!sotw ? (
          <div style={{ color: 'var(--txd)', padding: '20px 0' }}>No signal available.</div>
        ) : (
          <div className="sotw-inner">
            <div className="sotw-left">
              <div className="sotw-label">Sense&Stock Signal of the Week</div>
              <div className="sotw-ticker">{sotw.sym}</div>
              <div className="sotw-name">{sotw.name}</div>
              <div className="sotw-sig-row">
                <SignalBadge sigClass={sotw.sigClass} signal={sotw.signal} />
                <RiskBadge risk={sotw.risk} />
                <ProvenanceBadge provenance={sotw.provenance} />
              </div>
              <div className="sotw-insight">{sotw.insight}</div>
              <div className="sotw-meta">
                <span>Signal date: {sotw.signalDate}</span>
                {' · '}
                <span>Score: <strong style={{ color: scoreColor(sotw.score) }}>{sotw.score}/100</strong></span>
                {' · '}
                <span>Upside vs target: <strong className="p">{(sotw.upside >= 0 ? '+' : '') + sotw.upside.toFixed(1) + '%'}</strong></span>
              </div>
              <div className="sotw-disc">
                This is a model signal for informational purposes only. It is not financial advice or a recommendation to buy or sell securities.
              </div>
            </div>
            <div className="sotw-right">
              <ScoreRing score={sotw.score} size={80} stroke={6} numberSize={19} label="/ 100" />
              <div className="sotw-sector">{sotw.sec}</div>
              <div className="sotw-stats">
                <div className="sotw-stat">
                  <div className="sotw-stat-v">{sotw.analysts}</div>
                  <div className="sotw-stat-l">Analysts</div>
                </div>
                <div className="sotw-stat">
                  <div className="sotw-stat-v">{sotw.hit.toFixed(0)}%</div>
                  <div className="sotw-stat-l">Hit Ratio</div>
                </div>
                <div className="sotw-stat">
                  <div className="sotw-stat-v">KES {sotw.target}</div>
                  <div className="sotw-stat-l">Analyst Target</div>
                </div>
              </div>
              <Link
                href={`/stocks/${sotw.sym}`}
                className="bp"
                style={{ width: '100%', marginTop: 10, fontSize: 12.5, textAlign: 'center' }}
              >
                View Full Signal →
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
