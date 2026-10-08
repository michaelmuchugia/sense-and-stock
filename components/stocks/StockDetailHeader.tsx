import type { Stock } from '@/lib/types/stock'
import type { AQScore } from '@/lib/types/signal'
import type { Provenance } from '@/lib/api/meta'
import { genInsight } from '@/lib/engine/score'
import { confLabel, scoreColor } from '@/lib/utils/score-display'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge'

interface StockDetailHeaderProps {
  stock: Stock
  aq: AQScore
  rightSlot?: React.ReactNode
  provenance?: Provenance
}

export function StockDetailHeader({ stock, aq, rightSlot, provenance }: StockDetailHeaderProps) {
  const col = scoreColor(aq.score)
  const pillars = [
    { lbl: 'Analyst Confidence', val: aq.pillars.confidence, color: '#00C896' },
    { lbl: 'Analyst Accuracy', val: aq.pillars.accuracy, color: '#4A9EFF' },
    { lbl: 'Upside Potential', val: aq.pillars.upside, color: '#F5C518' },
    { lbl: 'Momentum', val: aq.pillars.momentum, color: '#C084FC' },
  ]

  return (
    <>
      <div className="shdr2">
        <div className="srow">
          <div className="slog">{stock.s.slice(0, 2)}</div>
          <div className="si2">
            <h2>{stock.s} <span style={{ color: 'var(--txd)', fontWeight: 600 }}>{stock.n}</span></h2>
            <div className="stag">{stock.sec}</div>
          </div>
          <div className="spb">
            <div className="spp">{stock.p > 0 ? `KES ${stock.p.toFixed(2)}` : 'Suspended'}</div>
            <div className={`spc ${stock.c >= 0 ? 'p' : 'n'}`}>
              {stock.c >= 0 ? '+' : ''}{stock.c.toFixed(2)}% today
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--txd)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <span>Vol: {stock.vol} · 52w: {stock.l52}–{stock.h52}</span>
              {provenance && <ProvenanceBadge provenance={provenance} size="xs" />}
            </div>
          </div>
        </div>
        <div className={`dh ${aq.sigClass}`} style={{ margin: '0 24px 0' }}>
          <ScoreRing score={aq.score} size={90} stroke={7} numberSize={22} label="/ 100" />
          <div className="dh-info">
            <div className="dh-signal" style={{ color: col }}>
              {aq.signal} <span className={`conf ${aq.conf}`}>{confLabel(aq.conf)}</span>
            </div>
            <div className="dh-insight">{genInsight(stock, aq)}</div>
            <details className="score-breakdown"><summary>Score breakdown</summary><div className="dh-pillars">
              {pillars.map(p => (
                <div key={p.lbl} className="dhp">
                  <div className="dhp-val" style={{ color: p.color }}>{p.val}</div>
                  <div className="dhp-lbl">{p.lbl}</div>
                </div>
              ))}
            </div>
            <div className="mn">
              <span className="mn-b">Approx.</span>Momentum uses 52w position + today move.
            </div></details>
          </div>
          <div className="dh-right">{rightSlot}</div>
        </div>
      </div>
    </>
  )
}
