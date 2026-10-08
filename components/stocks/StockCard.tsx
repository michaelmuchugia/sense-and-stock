import Link from 'next/link'
import type { Stock } from '@/lib/types/stock'
import { calcScore } from '@/lib/engine/score'

interface StockCardProps {
  stock: Stock
}

export function StockCard({ stock }: StockCardProps) {
  const aq = calcScore(stock)
  const dCls = stock.c >= 0 ? 'p' : 'n'
  return (
    <Link href={`/stocks/${stock.s}`} className="tc">
      <div className="tcs">{stock.s}</div>
      <div className="tcn">{stock.n}</div>
      <div className="tcp">{stock.p > 0 ? `KES ${stock.p.toFixed(2)}` : 'Suspended'}</div>
      <div className={`tcc ${dCls}`}>
        {stock.c >= 0 ? '+' : ''}{stock.c.toFixed(2)}%
      </div>
      <div className="tcsc">
        Score: <strong>{aq.score}</strong> · {aq.signal}
      </div>
    </Link>
  )
}
