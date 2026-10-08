'use client'

import Link from 'next/link'
import clsx from 'clsx'
import { useState } from 'react'
import type { Stock } from '@/lib/types/stock'
import type { Analyst } from '@/lib/types/analyst'
import { RatingDonut } from '@/components/stocks/RatingDonut'
import { PriceTargetChart } from '@/components/stocks/PriceTargetChart'

type Tab = 'coverage' | 'analysts' | 'chart' | 'profile'

interface DeepViewProps {
  stock: Stock
  covering: Analyst[]
}

export function DeepView({ stock, covering }: DeepViewProps) {
  const [tab, setTab] = useState<Tab>('coverage')
  const upside = stock.p > 0 ? ((stock.avgPT - stock.p) / stock.p) * 100 : 0

  return (
    <>
      <div className="tabs" role="group" aria-label="Stock research">
        {(['coverage', 'analysts', 'chart', 'profile'] as Tab[]).map(t => (
          <button
            type="button"
            aria-pressed={tab === t}
            key={t}
            className={clsx('tab', { active: tab === t })}
            onClick={() => setTab(t)}
          >
            {t === 'coverage' ? 'Coverage' : t === 'analysts' ? 'Analysts' : t === 'chart' ? 'Price Targets Chart' : 'Company Profile'}
          </button>
        ))}
      </div>

      {tab === 'coverage' && (
        <CoverageTab stock={stock} covering={covering} upside={upside} />
      )}

      {tab === 'analysts' && (
        <AnalystsTab stock={stock} covering={covering} />
      )}

      {tab === 'chart' && (
        <>
          <PriceTargetChart stock={stock} covering={covering} />
          <div style={{ fontSize: 11, color: 'var(--txdd)', paddingTop: 6, lineHeight: 1.6 }}>
            All prices in KES. Dashed lines = analyst price targets. Solid = NSE closing price.
          </div>
        </>
      )}

      {tab === 'profile' && (
        <div className="ib" style={{ fontSize: 13, lineHeight: 1.8 }}>
          {stock.prof || 'No company profile available.'}
        </div>
      )}
    </>
  )
}

function CoverageTab({ stock, covering, upside }: { stock: Stock; covering: Analyst[]; upside: number }) {
  return (
    <>
      <div className="ib">
        <strong>{stock.s}</strong> is covered by <strong>{stock.a} analysts</strong> with avg target KES {stock.avgPT},
        representing <strong className="p">+{upside.toFixed(1)}%</strong> upside from KES {stock.p.toFixed(2)}.
      </div>
      <div className="cg">
        <div className="cs"><div className="csl">Active Analysts</div><div className="csv">{stock.a}</div><div className="css">Currently covering</div></div>
        <div className="cs"><div className="csl">Avg Price Target</div><div className="csv">KES {stock.avgPT}</div><div className="css p">+{upside.toFixed(1)}% upside</div></div>
        <div className="cs"><div className="csl">Avg Hit Ratio</div><div className="csv">{stock.hit.toFixed(1)}%</div><div className="css">Targets materialized</div></div>
        <div className="cs"><div className="csl">Buy Consensus</div><div className="csv">{stock.buy}%</div><div className="css">BUY rated</div></div>
        <div className="cs"><div className="csl">Hold Consensus</div><div className="csv">{stock.hold}%</div><div className="css">HOLD rated</div></div>
        <div className="cs"><div className="csl">Avg Days to Hit</div><div className="csv">{stock.days}d</div><div className="css">Historical avg</div></div>
      </div>

      <div className="dbox">
        <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: 13, marginBottom: 14 }}>
          Rating Distribution
        </div>
        <div className="dwrap">
          <RatingDonut buy={stock.buy} hold={stock.hold} sell={stock.sell} />
          <div style={{ minWidth: 130, flex: 1 }}>
            <div className="lit"><div className="ld" style={{ background: '#00C896' }}></div><div className="ln">Buy</div><div className="lp" style={{ color: '#00C896' }}>{stock.buy}%</div></div>
            <div className="lit"><div className="ld" style={{ background: '#F5C518' }}></div><div className="ln">Hold</div><div className="lp" style={{ color: '#F5C518' }}>{stock.hold}%</div></div>
            <div className="lit"><div className="ld" style={{ background: '#FF4D6A' }}></div><div className="ln">Sell</div><div className="lp" style={{ color: '#FF4D6A' }}>{stock.sell}%</div></div>
          </div>
        </div>
      </div>

      {covering.length > 0 && (
        <>
          <div className="shdr" style={{ paddingTop: 0 }}>
            <div className="sht">Best Analysts on This Stock</div>
          </div>
          <div className="atags">
            {covering.map(a => (
              <Link key={a.id} href={`/analysts/${a.id}`} className="atag">
                {a.nm} <span style={{ color: 'var(--txdd)' }}>({a.firm})</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  )
}

function AnalystsTab({ stock, covering }: { stock: Stock; covering: Analyst[] }) {
  if (!covering.length) {
    return (
      <table className="dt">
        <thead>
          <tr><th colSpan={9} style={{ textAlign: 'center', color: 'var(--txd)', padding: 24 }}>No analyst coverage data available</th></tr>
        </thead>
      </table>
    )
  }
  return (
    <div className="research-table-scroll" tabIndex={0} role="region" aria-label="Analyst comparison table">
    <table className="dt">
      <thead>
        <tr>
          <th>Analyst</th><th>Firm</th><th>Rating</th><th>Target</th><th>Upside</th>
          <th>Updated</th><th>Hit Ratio</th><th>Avg Return</th><th>Avg Days</th>
        </tr>
      </thead>
      <tbody>
        {covering.map(a => {
          const target = stock.p > 0 ? `KES ${(stock.p * (1 + a.ret / 100)).toFixed(2)}` : '—'
          const up = stock.p > 0 ? `+${a.ret.toFixed(1)}%` : '—'
          return (
            <tr key={a.id} onClick={() => { window.location.href = `/analysts/${a.id}` }}>
              <td style={{ fontWeight: 500 }}>{a.nm}</td>
              <td><span className="fp">{a.firm}</span></td>
              <td><span className="rb">Buy</span></td>
              <td style={{ fontFamily: 'var(--fm)' }}>{target}</td>
              <td className="p" style={{ fontFamily: 'var(--fm)' }}>{up}</td>
              <td style={{ fontSize: 11.5, color: 'var(--txd)' }}>Apr 2026</td>
              <td>
                <div className="hb">
                  <div className="hp"><div className="hf" style={{ width: `${a.hit}%` }}></div></div>
                  <span style={{ fontFamily: 'var(--fm)', fontSize: 10.5 }}>{a.hit.toFixed(0)}%</span>
                </div>
              </td>
              <td className="p" style={{ fontFamily: 'var(--fm)' }}>+{a.ret.toFixed(1)}%</td>
              <td style={{ fontFamily: 'var(--fm)' }}>{a.days}d</td>
            </tr>
          )
        })}
      </tbody>
    </table>
    </div>
  )
}
