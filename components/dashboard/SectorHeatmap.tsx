'use client'

import Link from 'next/link'

const SECTOR_PERF: Record<string, number> = {
  'Banking': 1.8,
  'Insurance': 3.2,
  'Telecoms': 0.84,
  'Energy': -0.6,
  'Agriculture': 0.5,
  'Manufacturing': 0.2,
  'Construction': -1.1,
  'Commercial & Services': -0.3,
  'Investment': 1.4,
}

export function SectorHeatmap() {
  return (
    <div className="dash-card" style={{ marginBottom: 24 }}>
      <div className="dash-ttl">Today&apos;s Sector Heatmap</div>
      <div className="heat-grid">
        {Object.entries(SECTOR_PERF).map(([sec, chg]) => {
          const intensity = Math.min(Math.abs(chg) * 30, 80)
          const bg = chg >= 0
            ? `rgba(0,200,150,${(0.1 + intensity / 200).toFixed(3)})`
            : `rgba(255,77,106,${(0.1 + intensity / 200).toFixed(3)})`
          return (
            <Link
              key={sec}
              href={`/stocks?sec=${encodeURIComponent(sec)}`}
              className="heat-cell"
              style={{ background: bg, textDecoration: 'none', color: 'inherit' }}
            >
              <div className="heat-sym">{sec.split(' ')[0]}</div>
              <div className={`heat-chg ${chg >= 0 ? 'p' : 'n'}`}>
                {chg >= 0 ? '+' : ''}{chg.toFixed(2)}%
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
