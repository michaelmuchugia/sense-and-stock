'use client'

import { useMemo, useState } from 'react'
import clsx from 'clsx'
import Link from 'next/link'
import type { Stock } from '@/lib/types/stock'
import type { SignalSnapshot } from '@/lib/types/signal'
import { CumulativeChart } from '@/components/signals/CumulativeChart'

interface SignalsPerformanceProps {
  snapshots: SignalSnapshot[]
  stocks: Stock[]
}

interface SignalRow {
  i: number
  sym: string
  name: string
  score: number
  entryPx: number
  currPx: number
  retPct: number
  naseRet: number
  diff: number
  note: string
}

interface MonthlyStats {
  avgRet: number
  naseR: number
  outpf: number
  winners: number
  total: number
  best: number
  worst: number
}

export function SignalsPerformance({ snapshots, stocks }: SignalsPerformanceProps) {
  const [mode, setMode] = useState<'monthly' | 'cumulative'>('monthly')
  const [selectedMonth, setSelectedMonth] = useState<string>(snapshots[snapshots.length - 1]?.month ?? '')

  const stockMap = useMemo(() => {
    const m = new Map<string, Stock>()
    for (const s of stocks) m.set(s.s, s)
    return m
  }, [stocks])

  const summary = useMemo(() => {
    let totalModel = 0, totalNase = 0, count = 0
    snapshots.forEach(snap => {
      const monthRets = snap.signals.map(sig => {
        const s = stockMap.get(sig.sym)
        if (!s || !s.p) return 0
        return ((s.p - sig.entryPx) / sig.entryPx) * 100
      }).filter(r => r !== 0)
      if (monthRets.length) {
        const avg = monthRets.reduce((a, b) => a + b, 0) / monthRets.length
        totalModel += avg
        totalNase += snap.naseRet
        count++
      }
    })
    return {
      modelRet: count ? totalModel / count : 0,
      naseRet: count ? totalNase / count : 0,
      outpf: count ? (totalModel / count) - (totalNase / count) : 0,
    }
  }, [snapshots, stockMap])

  const { rows, stats }: { rows: SignalRow[]; stats: MonthlyStats | null } = useMemo(() => {
    const snap = snapshots.find(s => s.month === selectedMonth)
    if (!snap) return { rows: [], stats: null }
    const r: SignalRow[] = snap.signals.map((sig, i) => {
      const s = stockMap.get(sig.sym)
      const currPx = s ? s.p : 0
      const retPct = currPx ? ((currPx - sig.entryPx) / sig.entryPx) * 100 : 0
      const diff = retPct - snap.naseRet
      return {
        i,
        sym: sig.sym,
        name: s?.n ?? '—',
        score: sig.score,
        entryPx: sig.entryPx,
        currPx,
        retPct,
        naseRet: snap.naseRet,
        diff,
        note: sig.note,
      }
    })

    const valid = r.filter(x => x.currPx > 0).map(x => x.retPct)
    if (!valid.length) return { rows: r, stats: null }
    const avgRet = valid.reduce((a, b) => a + b, 0) / valid.length
    const winners = valid.filter(x => x > 0).length
    const best = Math.max(...valid)
    const worst = Math.min(...valid)
    return {
      rows: r,
      stats: {
        avgRet,
        naseR: snap.naseRet,
        outpf: avgRet - snap.naseRet,
        winners,
        total: valid.length,
        best,
        worst,
      },
    }
  }, [snapshots, selectedMonth, stockMap])

  const cumulative = useMemo(() => {
    let cumModel = 100
    let cumNase = 100
    const labels: string[] = ['Start']
    const modelPts: number[] = [100]
    const nasePts: number[] = [100]
    const monthly: { label: string; avgRet: number; naseR: number; outpf: number; cumModel: number; cumNase: number }[] = []
    snapshots.forEach(snap => {
      const rs = snap.signals.map(sig => {
        const s = stockMap.get(sig.sym)
        if (!s || !s.p) return 0
        return ((s.p - sig.entryPx) / sig.entryPx) * 100
      }).filter(r => r !== 0)
      if (!rs.length) return
      const avgRet = rs.reduce((a, b) => a + b, 0) / rs.length
      const naseR = snap.naseRet
      cumModel += cumModel * (avgRet / 100)
      cumNase += cumNase * (naseR / 100)
      labels.push(snap.label)
      modelPts.push(parseFloat(cumModel.toFixed(2)))
      nasePts.push(parseFloat(cumNase.toFixed(2)))
      monthly.push({
        label: snap.label,
        avgRet,
        naseR,
        outpf: avgRet - naseR,
        cumModel,
        cumNase,
      })
    })
    const totalModelRet = cumModel - 100
    const totalNaseRet = cumNase - 100
    return {
      labels,
      modelPts,
      nasePts,
      monthly,
      totalModelRet,
      totalNaseRet,
      totalOutpf: totalModelRet - totalNaseRet,
    }
  }, [snapshots, stockMap])

  return (
    <>
      <div className="sig-disc-ribbon">
        <strong>Informational purposes only.</strong>
        This feature tracks the historical performance of Sense&Stock signals.
        It does not constitute financial advice or a recommendation to buy or sell securities.
        Past model performance does not guarantee future results.
      </div>

      <div className="C pb40">
        <div className="shdr" style={{ paddingTop: 28 }}>
          <div>
            <div className="sht">Sense&Stock Signals Performance</div>
            <div style={{ fontSize: 12.5, color: 'var(--txd)', marginTop: 3 }}>
              Historical model output tracking · Not investment advice
            </div>
          </div>
          <div className="sig-summary-box">
            <div className="sig-summary-lbl">Model Performance (avg/month)</div>
            <div className="sig-summary-ret">{summary.modelRet >= 0 ? '+' : ''}{summary.modelRet.toFixed(1)}%</div>
            <div className="sig-summary-vs">
              vs NSE NASI <span>+{summary.naseRet.toFixed(1)}%</span>, outperformance:{' '}
              <span>{summary.outpf >= 0 ? '+' : ''}{summary.outpf.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="sig-toggle-bar">
          <button type="button" className={clsx('sig-tog', { active: mode === 'monthly' })} onClick={() => setMode('monthly')}>
            Monthly Signals
          </button>
          <button type="button" className={clsx('sig-tog', { active: mode === 'cumulative' })} onClick={() => setMode('cumulative')}>
            Cumulative Performance
          </button>
        </div>

        {mode === 'monthly' && (
          <div>
            <div className="sig-month-select-row">
              <label className="sig-field-lbl">View month:</label>
              <select className="sig-select" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                {[...snapshots].reverse().map(snap => (
                  <option key={snap.month} value={snap.month}>{snap.label}</option>
                ))}
              </select>
              <span className="sig-data-note">Data: NSE prices at signal date vs current price · NSE NASI index as benchmark</span>
            </div>
            <div>
              <table className="sig-tbl">
                <thead>
                  <tr>
                    <th>#</th><th>Stock</th><th>Signal</th><th>Model Score</th>
                    <th>Entry Price</th><th>Current Price</th>
                    <th>Signal Return</th><th>NSE NASI Return</th><th>vs Index</th><th>Signal Rationale</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const beatLbl = Math.abs(r.diff) < 0.5
                      ? <span className="sig-beat t">≈ Index</span>
                      : r.diff > 0
                        ? <span className="sig-beat y">Beat +{r.diff.toFixed(1)}%</span>
                        : <span className="sig-beat n">Lagged {r.diff.toFixed(1)}%</span>
                    const naseStr = (r.naseRet >= 0 ? '+' : '') + r.naseRet.toFixed(1) + '%'
                    return (
                      <tr key={r.sym}>
                        <td><strong>{r.i + 1}</strong></td>
                        <td>
                          <Link href={`/stocks/${r.sym}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                            <span className="pill">{r.sym}</span>{' '}
                            <span style={{ fontSize: 11.5, color: 'var(--txd)' }}>{r.name}</span>
                          </Link>
                        </td>
                        <td><span className="sig-badge-sm">Strong Match</span></td>
                        <td><span className="sig-score-pill">{r.score}/100</span></td>
                        <td style={{ fontFamily: 'var(--fm)' }}>KES {r.entryPx.toFixed(2)}</td>
                        <td style={{ fontFamily: 'var(--fm)' }}>{r.currPx > 0 ? `KES ${r.currPx.toFixed(2)}` : '—'}</td>
                        <td>
                          <span className={`sig-ret ${r.retPct >= 0 ? 'pos' : 'neg'}`}>
                            {r.retPct >= 0 ? '+' : ''}{r.retPct.toFixed(1)}%
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--fm)', color: 'var(--txd)' }}>{naseStr}</td>
                        <td>{beatLbl}</td>
                        <td style={{ fontSize: 11.5, color: 'var(--txd)', maxWidth: 220 }}>{r.note}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {stats && (
              <div className="sig-month-stats">
                <div className="sig-stat-box">
                  <div className={`sig-stat-val ${stats.avgRet >= 0 ? 'p' : 'n'}`}>
                    {stats.avgRet >= 0 ? '+' : ''}{stats.avgRet.toFixed(1)}%
                  </div>
                  <div className="sig-stat-lbl">Avg Signal Return</div>
                </div>
                <div className="sig-stat-box">
                  <div className="sig-stat-val" style={{ color: 'var(--gold)' }}>
                    {stats.naseR >= 0 ? '+' : ''}{stats.naseR.toFixed(1)}%
                  </div>
                  <div className="sig-stat-lbl">NSE NASI Return</div>
                </div>
                <div className="sig-stat-box">
                  <div className={`sig-stat-val ${stats.outpf >= 0 ? 'p' : 'n'}`}>
                    {stats.outpf >= 0 ? '+' : ''}{stats.outpf.toFixed(1)}%
                  </div>
                  <div className="sig-stat-lbl">vs Index (outperformance)</div>
                </div>
                <div className="sig-stat-box">
                  <div className="sig-stat-val">{stats.winners}/{stats.total}</div>
                  <div className="sig-stat-lbl">Signals Positive</div>
                </div>
                <div className="sig-stat-box">
                  <div className="sig-stat-val p">+{stats.best.toFixed(1)}%</div>
                  <div className="sig-stat-lbl">Best Signal</div>
                </div>
                <div className="sig-stat-box">
                  <div className={`sig-stat-val ${stats.worst >= 0 ? 'p' : 'n'}`}>
                    {stats.worst >= 0 ? '+' : ''}{stats.worst.toFixed(1)}%
                  </div>
                  <div className="sig-stat-lbl">Worst Signal</div>
                </div>
              </div>
            )}
          </div>
        )}

        {mode === 'cumulative' && (
          <div>
            <div className="sig-data-note" style={{ marginBottom: 16 }}>
              Cumulative return = equal-weight average of top-5 Strong Match signals each month vs NSE NASI index.
              Each signal is tracked from signal date to current date or until a new signal replaces it.
            </div>
            <div>
              <div className="sig-note-row">
                <strong>Model Performance Summary:</strong> Sense&Stock signals returned{' '}
                <strong className="p">+{cumulative.totalModelRet.toFixed(1)}%</strong> cumulative vs NSE NASI{' '}
                +{cumulative.totalNaseRet.toFixed(1)}% over the same period.
                Outperformance: +{cumulative.totalOutpf.toFixed(1)}%.
                Equal-weight average of top-5 Strong Match signals per month. Not investment advice.
              </div>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 'var(--r12)', overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ padding: '12px 16px', background: 'var(--bg3)', borderBottom: '1px solid var(--bd)', fontFamily: 'var(--fd)', fontSize: 13, fontWeight: 700 }}>
                  Monthly Performance Breakdown
                </div>
                <div style={{ padding: '8px 16px' }}>
                  {cumulative.monthly.map(m => (
                    <div key={m.label} className="sig-idx-row">
                      <div style={{ fontWeight: 600 }}>{m.label}</div>
                      <div>
                        <span style={{ fontFamily: 'var(--fm)', fontSize: 13 }}>
                          {m.avgRet >= 0 ? '+' : ''}{m.avgRet.toFixed(1)}%
                        </span>{' '}
                        <span style={{ fontSize: 10.5, color: 'var(--txd)' }}>model</span>
                      </div>
                      <div>
                        <span style={{ fontFamily: 'var(--fm)', fontSize: 13, color: 'var(--gold)' }}>
                          {m.naseR >= 0 ? '+' : ''}{m.naseR.toFixed(1)}%
                        </span>{' '}
                        <span style={{ fontSize: 10.5, color: 'var(--txd)' }}>NSE NASI</span>
                      </div>
                      <div className={m.outpf >= 0 ? 'p' : 'n'} style={{ fontFamily: 'var(--fm)', fontSize: 13 }}>
                        {m.outpf >= 0 ? '+' : ''}{m.outpf.toFixed(1)}% vs index
                      </div>
                      <div style={{ fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--txd)' }}>
                        Rebased: {m.cumModel.toFixed(1)} vs {m.cumNase.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <CumulativeChart
              labels={cumulative.labels}
              modelPts={cumulative.modelPts}
              nasePts={cumulative.nasePts}
            />
            <div style={{ fontSize: 10.5, color: 'var(--txdd)', marginTop: 8, lineHeight: 1.6 }}>
              Chart shows cumulative equal-weight model performance vs NSE NASI index. Rebased to 100 at Oct 2025.
            </div>
          </div>
        )}
      </div>
    </>
  )
}
