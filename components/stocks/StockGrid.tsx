'use client'

import { useState, useMemo } from 'react'
import clsx from 'clsx'
import Link from 'next/link'
import type { Stock } from '@/lib/types/stock'
import type { Provenance } from '@/lib/api/meta'
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge'

interface ScoredStock {
  stock: Stock
  score: number
  signal: string
  provenance: Provenance
}

interface StockGridProps {
  stocks: ScoredStock[]
}

const SECTOR_FILTERS = [
  'all',
  'Agriculture',
  'Banking',
  'Commercial & Services',
  'Construction',
  'Energy',
  'Insurance',
  'Investment',
  'Manufacturing',
  'Telecoms',
  'REIT & ETF',
] as const

const SECTOR_LABELS: Record<string, string> = {
  all: 'All',
  'Agriculture': 'Agriculture',
  'Banking': 'Banking',
  'Commercial & Services': 'Commercial',
  'Construction': 'Construction',
  'Energy': 'Energy',
  'Insurance': 'Insurance',
  'Investment': 'Investment',
  'Manufacturing': 'Manufacturing',
  'Telecoms': 'Telecoms',
  'REIT & ETF': 'REIT',
}

export function StockGrid({ stocks }: StockGridProps) {
  const [sector, setSector] = useState<string>('all')

  const filtered = useMemo(
    () => sector === 'all' ? stocks : stocks.filter(x => x.stock.sec === sector),
    [stocks, sector],
  )

  return (
    <>
      <div className="shdr">
        <div className="sht">NSE Listed Stocks</div>
        <div className="shm">{filtered.length} stocks &middot; KES prices</div>
      </div>
      <div className="filt">
        {SECTOR_FILTERS.map(s => (
          <button
            key={s}
            type="button"
            className={clsx('fb', { active: sector === s })}
            onClick={() => setSector(s)}
          >
            {SECTOR_LABELS[s]}
          </button>
        ))}
      </div>
      <div className="tg">
        {filtered.map(({ stock, score, signal, provenance }) => {
          const dCls = stock.c >= 0 ? 'p' : 'n'
          return (
            <Link key={stock.s} href={`/stocks/${stock.s}`} className="tc">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                <div className="tcs">{stock.s}</div>
                <ProvenanceBadge provenance={provenance} size="xs" />
              </div>
              <div className="tcn">{stock.n}</div>
              <div className="tcp">{stock.p > 0 ? `KES ${stock.p.toFixed(2)}` : 'Suspended'}</div>
              <div className={`tcc ${dCls}`}>
                {stock.c >= 0 ? '+' : ''}{stock.c.toFixed(2)}%
              </div>
              <div className="tcsc">
                Score: <strong>{score}</strong> &middot; {signal}
              </div>
            </Link>
          )
        })}
      </div>
    </>
  )
}
