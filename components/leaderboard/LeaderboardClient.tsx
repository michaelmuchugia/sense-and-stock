'use client'

import { useMemo, useState } from 'react'
import clsx from 'clsx'
import Link from 'next/link'
import type { Analyst } from '@/lib/types/analyst'

type SortKey = 'score' | 'hit' | 'return' | 'days' | 'targets'

interface LeaderboardClientProps {
  analysts: Analyst[]
}

const SORT_LABELS: Record<SortKey, string> = {
  score: 'Performance Score',
  hit: 'Hit Ratio',
  return: 'Avg Return',
  days: 'Fastest Calls',
  targets: 'Most Active',
}

const RANK_LABELS = ['1st', '2nd', '3rd']

export function LeaderboardClient({ analysts }: LeaderboardClientProps) {
  const [sortKey, setSortKey] = useState<SortKey>('score')

  const sorted = useMemo(() => {
    const arr = [...analysts]
    if (sortKey === 'hit') arr.sort((a, b) => b.hit - a.hit)
    else if (sortKey === 'return') arr.sort((a, b) => b.ret - a.ret)
    else if (sortKey === 'days') arr.sort((a, b) => a.days - b.days)
    else if (sortKey === 'targets') arr.sort((a, b) => b.targets - a.targets)
    else arr.sort((a, b) => b.score - a.score)
    return arr
  }, [analysts, sortKey])

  const top3 = sorted.slice(0, 3)

  return (
    <>
      <div className="filt">
        {(['score', 'hit', 'return', 'days', 'targets'] as SortKey[]).map(k => (
          <button
            key={k}
            type="button"
            className={clsx('fb', { active: sortKey === k })}
            onClick={() => setSortKey(k)}
          >
            {SORT_LABELS[k]}
          </button>
        ))}
      </div>
      <div className="podium">
        {top3.map((a, i) => (
          <Link
            key={a.id}
            href={`/analysts/${a.id}`}
            className={clsx('pcard', { first: i === 0 })}
          >
            <div className="pmed">{RANK_LABELS[i]}</div>
            <div className="pnm">{a.nm}</div>
            <div className="pfm">{a.firm}</div>
            <div className="psc">{a.score.toFixed(2)}</div>
            <div className="psb">{a.hit.toFixed(1)}% hit · +{a.ret.toFixed(1)}% avg</div>
          </Link>
        ))}
      </div>
      <table className="dt">
        <thead>
          <tr>
            <th>Rank</th><th>Analyst</th><th>Firm</th>
            <th>Hit Ratio</th><th>Avg Return</th><th>Avg Days</th>
            <th>Total Targets</th><th>Perf. Score</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((a, i) => {
            const confCls = a.score >= 1.8 ? 'high' : a.score >= 1.4 ? 'med' : 'low'
            return (
              <tr key={a.id} onClick={() => { window.location.href = `/analysts/${a.id}` }}>
                <td><div className={`rn${i < 3 ? ' t' : ''}`}>{i + 1}</div></td>
                <td style={{ fontWeight: 600 }}>{a.nm}</td>
                <td><span className="fp">{a.firm}</span></td>
                <td>
                  <div className="hb">
                    <div className="hp"><div className="hf" style={{ width: `${a.hit}%` }}></div></div>
                    <span style={{ fontFamily: 'var(--fm)', fontSize: 11.5 }}>{a.hit.toFixed(1)}%</span>
                  </div>
                </td>
                <td className="p" style={{ fontFamily: 'var(--fm)' }}>+{a.ret.toFixed(1)}%</td>
                <td style={{ fontFamily: 'var(--fm)' }}>{a.days}d</td>
                <td style={{ fontFamily: 'var(--fm)' }}>{a.targets}</td>
                <td><span className={`conf ${confCls}`}>{a.score.toFixed(2)}</span></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
  )
}
