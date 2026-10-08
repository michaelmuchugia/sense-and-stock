import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAnalystByExternalId, getAllAnalystExternalIds } from '@/lib/api/analysts'
import { getAllStocks } from '@/lib/api/stocks'

export const revalidate = 3600

export async function generateStaticParams() {
  const ids = await getAllAnalystExternalIds()
  return ids.map(id => ({ id: String(id) }))
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AnalystDetailPage({ params }: PageProps) {
  const { id } = await params
  const numId = parseInt(id, 10)
  if (Number.isNaN(numId)) notFound()
  const analyst = await getAnalystByExternalId(numId)
  if (!analyst) notFound()

  const allStocks = await getAllStocks()
  const stockByTicker = new Map(allStocks.map(s => [s.s, s]))
  const coverage = analyst.stocks
    .map(sym => stockByTicker.get(sym))
    .filter((x): x is NonNullable<typeof x> => Boolean(x))

  return (
    <div className="C pb40" style={{ paddingTop: 26 }}>
      <div className="aprof">
        <div className="aava">{analyst.ini}</div>
        <div className="ameta">
          <h2>{analyst.nm}</h2>
          <div className="afirm">{analyst.firm}</div>
          <div className="asince">Covering NSE since {analyst.since} · {analyst.bio}</div>
        </div>
        <div className="ascores">
          <div className="sci"><div className="scv">{analyst.hit.toFixed(1)}%</div><div className="scl">Hit Ratio</div></div>
          <div className="sci"><div className="scv">+{analyst.ret.toFixed(1)}%</div><div className="scl">Avg Return</div></div>
          <div className="sci"><div className="scv">{analyst.days}d</div><div className="scl">Avg Days</div></div>
          <div className="sci"><div className="scv">{analyst.score.toFixed(2)}</div><div className="scl">Perf. Score</div></div>
          <div className="sci"><div className="scv">{analyst.targets}</div><div className="scl">Total Calls</div></div>
        </div>
      </div>

      <div className="shdr" style={{ paddingTop: 0 }}>
        <div className="sht">Analyst Coverage</div>
      </div>

      <table className="dt">
        <thead>
          <tr>
            <th>Stock</th><th>Sector</th><th>Rating</th>
            <th>Current Target</th><th>Prev Target</th>
            <th>Upside</th><th>Hit Ratio</th><th>Date</th>
          </tr>
        </thead>
        <tbody>
          {coverage.length === 0 ? (
            <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--txd)', padding: 24 }}>No coverage data</td></tr>
          ) : (
            coverage.map(stock => {
              const target = stock.p > 0 ? `KES ${(stock.p * (1 + analyst.ret / 100)).toFixed(2)}` : '—'
              const up = stock.p > 0 ? `+${analyst.ret.toFixed(1)}%` : '—'
              const prev = stock.p > 0 ? `KES ${(stock.p * (1 + analyst.ret / 100) * 0.95).toFixed(2)}` : '—'
              return (
                <tr key={stock.s}>
                  <td>
                    <Link href={`/stocks/${stock.s}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      <span className="pill">{stock.s}</span>{' '}
                      <span style={{ color: 'var(--txd)', fontSize: 11.5 }}>{stock.n}</span>
                    </Link>
                  </td>
                  <td style={{ fontSize: 11.5, color: 'var(--txd)' }}>{stock.sec}</td>
                  <td><span className="rb">Buy</span></td>
                  <td style={{ fontFamily: 'var(--fm)' }}>{target}</td>
                  <td style={{ fontFamily: 'var(--fm)', color: 'var(--txd)' }}>{prev}</td>
                  <td className="p" style={{ fontFamily: 'var(--fm)' }}>{up}</td>
                  <td>
                    <div className="hb">
                      <div className="hp"><div className="hf" style={{ width: `${analyst.hit}%` }}></div></div>
                      <span style={{ fontFamily: 'var(--fm)', fontSize: 10.5 }}>{analyst.hit.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 11.5, color: 'var(--txd)' }}>Apr 2026</td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
