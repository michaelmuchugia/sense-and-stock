'use client'

import { useMemo, useState } from 'react'
import clsx from 'clsx'
import Link from 'next/link'
import type { Analyst } from '@/lib/types/analyst'

interface AnalystTableProps {
  analysts: Analyst[]
}

function firmLabel(firm: string): string {
  return firm.replace('Investment Bank', 'IB').replace('Securities', 'Sec.')
}

export function AnalystTable({ analysts }: AnalystTableProps) {
  const [firm, setFirm] = useState<string>('all')

  // Firm chips come from the analysts actually present, not a fixed list.
  const firms = useMemo(
    () => ['all', ...Array.from(new Set(analysts.map(a => a.firm).filter(Boolean))).sort()],
    [analysts],
  )

  // Measured analysts rank first by score, then the rest by number of calls.
  const ordered = useMemo(() => {
    return [...analysts].sort((a, b) => {
      const am = a.measured ? 1 : 0, bm = b.measured ? 1 : 0
      if (am !== bm) return bm - am
      if (am) return b.score - a.score
      return b.targets - a.targets
    })
  }, [analysts])

  const filtered = useMemo(
    () => firm === 'all' ? ordered : ordered.filter(a => a.firm === firm),
    [ordered, firm],
  )

  return (
    <>
      <div className="filt">
        {firms.map(f => (
          <button
            key={f}
            type="button"
            className={clsx('fb', { active: firm === f })}
            onClick={() => setFirm(f)}
          >
            {f === 'all' ? 'All Firms' : firmLabel(f)}
          </button>
        ))}
      </div>
      <table className="dt">
        <thead>
          <tr>
            <th>#</th><th>Analyst</th><th>Firm</th><th>Stocks</th>
            <th>Hit Ratio</th><th>Avg Return</th><th>Avg Days</th>
            <th>Total Targets</th><th>Score</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((a, i) => {
            const confCls = a.score >= 70 ? 'high' : a.score >= 50 ? 'med' : 'low'
            return (
              <tr key={a.id} onClick={() => { window.location.href = `/analysts/${a.id}` }}>
                <td><div className={`rn${a.measured && i < 3 ? ' t' : ''}`}>{i + 1}</div></td>
                <td style={{ fontWeight: 500 }}>
                  <Link href={`/analysts/${a.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{a.nm}</Link>
                </td>
                <td><span className="fp">{a.firm}</span></td>
                <td>
                  {a.stocks.map(s => (
                    <span key={s} className="pill" style={{ margin: 1 }}>{s}</span>
                  ))}
                </td>
                <td>
                  {a.measured ? (
                    <div className="hb">
                      <div className="hp"><div className="hf" style={{ width: `${a.hit}%` }}></div></div>
                      <span style={{ fontFamily: 'var(--fm)', fontSize: 11.5 }}>{a.hit.toFixed(1)}%</span>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--txd)', fontSize: 12 }}>Insufficient history</span>
                  )}
                </td>
                <td className="p" style={{ fontFamily: 'var(--fm)' }}>{a.ret >= 0 ? '+' : ''}{a.ret.toFixed(1)}%</td>
                <td style={{ fontFamily: 'var(--fm)' }}>{a.measured && a.days > 0 ? `${a.days}d` : '—'}</td>
                <td style={{ fontFamily: 'var(--fm)' }}>{a.targets}</td>
                <td>{a.measured ? <span className={`conf ${confCls}`}>{a.score.toFixed(0)}</span> : <span style={{ color: 'var(--txd)' }}>—</span>}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
  )
}
