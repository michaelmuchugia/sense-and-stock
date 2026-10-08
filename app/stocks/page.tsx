import { getAllStocks } from '@/lib/api/stocks'
import { getScoresMap } from '@/lib/api/scores'
import { StockGrid } from '@/components/stocks/StockGrid'

export const revalidate = 3600

export default async function StocksPage() {
  const [stocks, scoresMap] = await Promise.all([getAllStocks(), getScoresMap()])

  const scored = stocks.map(({ _provenance, ...stock }) => {
    const aq = scoresMap.get(stock.s)
    return {
      stock,
      score:      aq?.score ?? 0,
      signal:     aq?.signal ?? 'No Data',
      provenance: _provenance,
    }
  })

  return (
    <div className="C pb40">
      <StockGrid stocks={scored} />
    </div>
  )
}
