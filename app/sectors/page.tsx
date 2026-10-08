import Link from 'next/link'
import { getAllStocks } from '@/lib/api/stocks'
import { getAllAnalysts } from '@/lib/api/analysts'
import { SECTORS } from '@/lib/utils/sectors'

export const revalidate = 3600

export default async function SectorsPage() {
  const [stocks, analysts] = await Promise.all([getAllStocks(), getAllAnalysts()])

  return (
    <div className="C pb40">
      <div className="shdr">
        <div className="sht">NSE Sectors Overview</div>
        <div className="shm">Coverage by sector</div>
      </div>

      <div className="secg">
        {SECTORS.map(sec => {
          const sts = stocks.filter(s => s.sec === sec.name)
          if (!sts.length) return null
          const avgH = Math.round(sts.reduce((t, s) => t + s.hit, 0) / sts.length)
          const topU = Math.max(
            ...sts.map(s => s.p > 0 ? ((s.avgPT - s.p) / s.p) * 100 : 0),
          )
          return (
            <Link key={sec.name} href={`/stocks?sec=${encodeURIComponent(sec.name)}`} className="secc" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <div className="seci" style={{ color: sec.color, fontFamily: 'var(--fd)', fontSize: 22, fontWeight: 800, letterSpacing: '0.06em' }}>
                {sec.abbr}
              </div>
              <div className="secn">{sec.name}</div>
              <div className="secd">{sts.length} stocks · Avg hit: {avgH}% · Top upside: +{topU.toFixed(1)}%</div>
              <div className="secbar">
                <div className="secbf" style={{ width: `${Math.min(avgH, 100)}%`, background: sec.color }}></div>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="shdr" style={{ paddingTop: 8 }}>
        <div className="sht">Top Analysts by Sector</div>
      </div>

      <div className="tbsg">
        {SECTORS.map(sec => {
          const sectorTickers = new Set(stocks.filter(s => s.sec === sec.name).map(s => s.s))
          const sList = analysts
            .filter(a => a.stocks.some(sym => sectorTickers.has(sym)))
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
          if (!sList.length) return null
          return (
            <div key={sec.name} className="tbsc">
              <div className="tbst">{sec.name}</div>
              {sList.map(a => (
                <Link key={a.id} href={`/analysts/${a.id}`} className="tbsr">
                  <div className="tbsa">{a.ini}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{a.nm}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--txd)' }}>{a.firm}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--g)' }}>
                    {a.hit.toFixed(0)}% hit
                  </div>
                </Link>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
