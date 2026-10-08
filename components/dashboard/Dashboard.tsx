'use client'

import Link from 'next/link'
import clsx from 'clsx'
import type { Stock } from '@/lib/types/stock'
import type { AQScore } from '@/lib/types/signal'
import type { DailyMoveEntry } from '@/lib/data/moves'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { DcSignalBadge } from '@/components/ui/SignalBadge'
import { SectorHeatmap } from '@/components/dashboard/SectorHeatmap'
import { AnalystTimeline } from '@/components/dashboard/AnalystTimeline'

const ACTIVE_STOCKS = [
  { sym: 'SCOM', price: 29.85, chg: 0.84, vol: '10.8M' },
  { sym: 'KNRE', price: 3.38, chg: 0.00, vol: '7.86M' },
  { sym: 'EQTY', price: 76.00, chg: 1.33, vol: '4.2M' },
  { sym: 'COOP', price: 32.30, chg: -0.31, vol: '3.6M' },
  { sym: 'KPLC', price: 16.70, chg: -1.47, vol: '2.3M' },
  { sym: 'ABSA', price: 31.05, chg: -1.58, vol: '2.1M' },
  { sym: 'KCB', price: 69.75, chg: 0.72, vol: '1.9M' },
  { sym: 'NCBA', price: 89.75, chg: -0.28, vol: '1.1M' },
]

interface DashboardProps {
  movers: { stock: Stock; aq: AQScore }[]
  dailyMoves: DailyMoveEntry[]
}

export function Dashboard({ movers, dailyMoves }: DashboardProps) {
  return (
    <div className="C pb40">
      <div className="shdr">
        <div className="sht">NSE Market Dashboard</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="shm">Live data · Apr 21, 2026</div>
          <Link href="/signals" className="ab" style={{ fontSize: 12, padding: '6px 13px' }}>
            Signals Performance →
          </Link>
        </div>
      </div>

      <div className="dash-grid">
        <div className="dash-card">
          <div className="dash-ttl">NSE Indices &amp; Macro</div>
          {[
            { nm: 'NASI (All Share Index)', sub: 'Broad market', val: '119.4', chg: '+2.1% YTD', vCls: 'p', cCls: 'p' },
            { nm: 'NSE 20 Share Index', sub: 'Blue chips', val: '3,580', chg: '+4.8% YTD', vCls: 'p', cCls: 'p' },
            { nm: 'Banking Sector Index', sub: '', val: '186.4', chg: '+18.2% YTD', vCls: 'p', cCls: 'p' },
            { nm: 'CBR (Central Bank Rate)', sub: '', val: '8.75%', chg: 'On hold', vCls: 'gold', cCls: 'txd' },
            { nm: 'USD/KES Rate', sub: '', val: '129.8', chg: 'Stable', vCls: 'tx', cCls: 'p' },
            { nm: 'Headline Inflation', sub: '', val: '4.1%', chg: 'Within CBK range', vCls: 'tx', cCls: 'txd' },
          ].map((row, i) => (
            <div key={i} className="idx-row">
              <div>
                <div className="idx-nm">{row.nm}</div>
                {row.sub && <div style={{ fontSize: 11, color: 'var(--txd)' }}>{row.sub}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className={clsx('idx-val', { p: row.vCls === 'p' })} style={{
                  color: row.vCls === 'gold' ? 'var(--gold)' : undefined,
                }}>
                  {row.val}
                </div>
                <div className={clsx('idx-chg', { p: row.cCls === 'p' })} style={{
                  color: row.cCls === 'txd' ? 'var(--txd)' : undefined,
                }}>
                  {row.chg}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="dash-card">
          <div className="dash-ttl">Today&apos;s Most Active</div>
          <table className="dt" style={{ fontSize: 12 }}>
            <thead><tr><th>Ticker</th><th>Price</th><th>Change</th><th>Volume</th></tr></thead>
            <tbody>
              {ACTIVE_STOCKS.map(s => (
                <tr key={s.sym} onClick={() => { window.location.href = `/stocks/${s.sym}` }}>
                  <td><span className="pill">{s.sym}</span></td>
                  <td style={{ fontFamily: 'var(--fm)' }}>KES {s.price.toFixed(2)}</td>
                  <td className={s.chg >= 0 ? 'p' : 'n'} style={{ fontFamily: 'var(--fm)' }}>
                    {s.chg >= 0 ? '+' : ''}{s.chg.toFixed(2)}%
                  </td>
                  <td style={{ fontFamily: 'var(--fm)', color: 'var(--txd)' }}>{s.vol}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SectorHeatmap />
      <AnalystTimeline />

      <div className="shdr" style={{ paddingTop: 8 }}>
        <div className="sht">Today&apos;s Top Analyst Moves</div>
        <div className="shm">Updated 21 Apr 2026 &middot; 15:00 EAT</div>
      </div>
      <table className="dt" style={{ marginBottom: 36 }}>
        <thead>
          <tr>
            <th>#</th><th>Analyst</th><th>Firm</th><th>Stock</th>
            <th>Rating</th><th>Target Change</th><th>Avg Days</th>
            <th>Upside</th><th>Hit Ratio</th>
          </tr>
        </thead>
        <tbody>
          {dailyMoves.map((m, i) => {
            const rc = m.rating === 'Buy' ? 'rb' : m.rating === 'Hold' ? 'rh' : 'rs'
            const cp = ((m.ptTo - m.ptFrom) / m.ptFrom * 100).toFixed(1)
            const hitPct = parseFloat(m.hit)
            return (
              <tr key={i} onClick={() => { window.location.href = `/stocks/${m.sym}` }}>
                <td><div className={`rn${i < 3 ? ' t' : ''}`}>{i + 1}</div></td>
                <td style={{ fontWeight: 500 }}>{m.analyst}</td>
                <td><span className="fp">{m.firm}</span></td>
                <td><span className="pill">{m.sym}</span></td>
                <td><span className={rc}>{m.rating}</span></td>
                <td style={{ fontFamily: 'var(--fm)' }}>
                  KES {m.ptFrom}→{m.ptTo} <span className="p" style={{ fontSize: 10.5 }}>+{cp}%</span>
                </td>
                <td style={{ fontFamily: 'var(--fm)' }}>{m.days}d</td>
                <td className="p" style={{ fontFamily: 'var(--fm)' }}>+{m.upside.toFixed(1)}%</td>
                <td>
                  <div className="hb">
                    <div className="hp"><div className="hf" style={{ width: `${hitPct}%` }}></div></div>
                    <span style={{ fontFamily: 'var(--fm)', fontSize: 10.5 }}>{m.hit}</span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="shdr">
        <div className="sht">NSE Market Movers</div>
        <Link href="/stocks" className="shl">All 65 stocks →</Link>
      </div>
      <div className="g4" style={{ marginBottom: 36 }}>
        {movers.map(({ stock: s, aq }) => (
          <Link key={s.s} href={`/stocks/${s.s}`} className={`dc ${aq.sigClass}`}>
            <div className="dc-top">
              <ScoreRing score={aq.score} size={64} stroke={5} numberSize={16} />
              <div className="dc-meta">
                <div className="dc-sym">{s.s}</div>
                <div className="dc-name">{s.n}</div>
                <DcSignalBadge sigClass={aq.sigClass} signal={aq.signal} />
              </div>
            </div>
            <div className="dc-bottom">
              <div className="dc-price">KES {s.p.toFixed(2)}</div>
              <div className={`dc-chg ${s.c >= 0 ? 'p' : 'n'}`}>
                {s.c >= 0 ? '+' : ''}{s.c.toFixed(2)}%
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
