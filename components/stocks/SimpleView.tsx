import type { Stock } from '@/lib/types/stock'
import type { AQScore } from '@/lib/types/signal'
import type { Analyst } from '@/lib/types/analyst'
import { scoreColor } from '@/lib/utils/score-display'

interface SimpleViewProps {
  stock: Stock
  aq: AQScore
  topAnalyst: Analyst | undefined
}

export function SimpleView({ stock, aq, topAnalyst }: SimpleViewProps) {
  const upside = aq.upside_pct
  const uStr = (upside >= 0 ? '+' : '') + upside.toFixed(1) + '%'
  const pCls = upside >= 0 ? 'p' : 'n'
  const dCls = stock.c >= 0 ? 'p' : 'n'
  const dSign = stock.c >= 0 ? '+' : ''
  const col = scoreColor(aq.score)
  const profile = stock.prof
    ? stock.prof.length > 260 ? stock.prof.slice(0, 260) + '...' : stock.prof
    : 'No profile available.'

  return (
    <>
      <div className="sv-box">
        <div className="sv-box-ttl">Key Numbers at a Glance</div>
        <div className="sv-grid">
          <div className="sv-stat">
            <div className="sv-lbl">Current Price</div>
            <div className="sv-val">KES {stock.p.toFixed(2)}</div>
            <div className={`sv-sub ${dCls}`}>{dSign}{stock.c.toFixed(2)}% today</div>
          </div>
          <div className="sv-stat">
            <div className="sv-lbl">Analyst Target</div>
            <div className={`sv-val ${pCls}`}>KES {stock.avgPT}</div>
            <div className={`sv-sub ${pCls}`}>{uStr} upside</div>
          </div>
          <div className="sv-stat">
            <div className="sv-lbl">Analysts</div>
            <div className="sv-val">{stock.a}</div>
            <div className="sv-sub">{stock.buy}% say Buy</div>
          </div>
          <div className="sv-stat">
            <div className="sv-lbl">Avg Hit Ratio</div>
            <div className="sv-val">{stock.hit.toFixed(0)}%</div>
            <div className="sv-sub">Targets met</div>
          </div>
          <div className="sv-stat">
            <div className="sv-lbl">52w Range</div>
            <div className="sv-val" style={{ fontSize: 14 }}>{stock.l52}–{stock.h52}</div>
            <div className="sv-sub">KES</div>
          </div>
          <div className="sv-stat">
            <div className="sv-lbl">SS Score</div>
            <div className="sv-val" style={{ color: col }}>{aq.score}</div>
            <div className="sv-sub">/ 100</div>
          </div>
        </div>
        <div className="sv-rat">
          <span style={{ fontSize: 11.5, color: 'var(--txd)' }}>Ratings:</span>
          <div className="sv-rat-i"><div className="sv-rat-d" style={{ background: '#00C896' }}></div>{stock.buy}% Buy</div>
          <div className="sv-rat-i"><div className="sv-rat-d" style={{ background: '#F5C518' }}></div>{stock.hold}% Hold</div>
          <div className="sv-rat-i"><div className="sv-rat-d" style={{ background: '#FF4D6A' }}></div>{stock.sell}% Sell</div>
        </div>
      </div>

      {topAnalyst && (
        <div className="sv-box">
          <div className="sv-box-ttl">Best Track Record on {stock.s}</div>
          <div className="sv-analyst">
            <div className="sv-ava">{topAnalyst.ini}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: 14, fontWeight: 700 }}>{topAnalyst.nm}</div>
              <div style={{ fontSize: 11.5, color: 'var(--txd)' }}>{topAnalyst.firm}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: 18, fontWeight: 800, color: 'var(--g)' }}>
                {topAnalyst.score.toFixed(2)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--txd)' }}>
                {topAnalyst.hit.toFixed(1)}% hit · +{topAnalyst.ret.toFixed(1)}% avg
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="sv-box">
        <div className="sv-box-ttl">About This Company</div>
        <div style={{ fontSize: 13, color: 'var(--txd)', lineHeight: 1.75 }}>{profile}</div>
      </div>

      <div style={{ fontSize: 10.5, color: 'var(--txdd)', marginBottom: 16, lineHeight: 1.5 }}>
        For informational purposes only. Consult a CMA-licensed investment adviser before making investment decisions.
      </div>
    </>
  )
}
