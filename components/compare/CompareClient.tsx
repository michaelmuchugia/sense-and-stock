'use client'

import { useState, useMemo } from 'react'
import type { Analyst } from '@/lib/types/analyst'

interface CompareClientProps {
  analysts: Analyst[]
}

export function CompareClient({ analysts }: CompareClientProps) {
  const [aId, setAId] = useState<number | null>(null)
  const [bId, setBId] = useState<number | null>(null)

  const a = useMemo(() => analysts.find(x => x.id === aId), [analysts, aId])
  const b = useMemo(() => analysts.find(x => x.id === bId), [analysts, bId])

  const metrics = useMemo(() => {
    if (!a || !b) return null
    return [
      { lbl: 'Hit Ratio', av: a.hit.toFixed(1) + '%', bv: b.hit.toFixed(1) + '%', win: a.hit > b.hit ? 'a' : b.hit > a.hit ? 'b' : '' },
      { lbl: 'Avg Return', av: '+' + a.ret.toFixed(1) + '%', bv: '+' + b.ret.toFixed(1) + '%', win: a.ret > b.ret ? 'a' : b.ret > a.ret ? 'b' : '' },
      { lbl: 'Avg Days', av: a.days + 'd', bv: b.days + 'd', win: a.days < b.days ? 'a' : b.days < a.days ? 'b' : '' },
      { lbl: 'Perf. Score', av: a.score.toFixed(2), bv: b.score.toFixed(2), win: a.score > b.score ? 'a' : b.score > a.score ? 'b' : '' },
      { lbl: 'Total Targets', av: String(a.targets), bv: String(b.targets), win: a.targets > b.targets ? 'a' : b.targets > a.targets ? 'b' : '' },
      { lbl: 'Stocks Covered', av: String(a.stocks.length), bv: String(b.stocks.length), win: a.stocks.length > b.stocks.length ? 'a' : b.stocks.length > a.stocks.length ? 'b' : '' },
      { lbl: 'Firm', av: a.firm, bv: b.firm, win: '' },
      { lbl: 'Since', av: a.since, bv: b.since, win: '' },
    ]
  }, [a, b])

  const overlap = useMemo(() => {
    if (!a || !b) return null
    return a.stocks.filter(s => b.stocks.includes(s))
  }, [a, b])

  return (
    <div className="C pb40">
      <div className="shdr">
        <div className="sht">Compare Analysts</div>
        <div className="shm">Side-by-side track record</div>
      </div>

      <div className="cmp-selectors">
        <div className="cmp-sel">
          <label>Analyst A</label>
          <select
            value={aId ?? ''}
            onChange={e => setAId(e.target.value ? parseInt(e.target.value, 10) : null)}
          >
            <option value="">Select analyst...</option>
            {analysts.map(an => (
              <option key={an.id} value={an.id}>{an.nm} · {an.firm}</option>
            ))}
          </select>
        </div>
        <div className="cmp-sel">
          <label>Analyst B</label>
          <select
            value={bId ?? ''}
            onChange={e => setBId(e.target.value ? parseInt(e.target.value, 10) : null)}
          >
            <option value="">Select analyst...</option>
            {analysts.map(an => (
              <option key={an.id} value={an.id}>{an.nm} · {an.firm}</option>
            ))}
          </select>
        </div>
      </div>

      {a && b && metrics && (
        <>
          <div className="cmp-table">
            <div className="cmp-col">
              <div className="cmp-head">
                <div className="cmp-ava">{a.ini}</div>
                <div className="cmp-nm">{a.nm}</div>
                <div className="cmp-fm">{a.firm}</div>
              </div>
              {metrics.map(m => (
                <div key={m.lbl} className="cmp-row">
                  <span className="cmp-lbl">{m.lbl}</span>
                  <span className={`cmp-val${m.win === 'a' ? ' cmp-win' : ''}`}>{m.av}</span>
                </div>
              ))}
            </div>
            <div className="cmp-col">
              <div className="cmp-head">
                <div className="cmp-ava">{b.ini}</div>
                <div className="cmp-nm">{b.nm}</div>
                <div className="cmp-fm">{b.firm}</div>
              </div>
              {metrics.map(m => (
                <div key={m.lbl} className="cmp-row">
                  <span className="cmp-lbl">{m.lbl}</span>
                  <span className={`cmp-val${m.win === 'b' ? ' cmp-win' : ''}`}>{m.bv}</span>
                </div>
              ))}
            </div>
          </div>

          {overlap && overlap.length > 0 && (
            <div className="dbox" style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
                Stocks both analysts cover ({overlap.length})
              </div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {overlap.map(sym => (
                  <span key={sym} className="pill">{sym}</span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
