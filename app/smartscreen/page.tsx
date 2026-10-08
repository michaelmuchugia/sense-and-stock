import { getAllStocks } from '@/lib/api/stocks'
import { getScoresMap } from '@/lib/api/scores'
import { SmartScreen, type ScoredStockProp } from '@/components/smartscreen/SmartScreen'

export const revalidate = 3600

export default async function SmartScreenPage() {
  const [stocks, scoresMap] = await Promise.all([getAllStocks(), getScoresMap()])

  const data: ScoredStockProp[] = stocks
    .map(({ _provenance, ...stock }) => {
      const aq = scoresMap.get(stock.s)
      if (!aq) return null
      return { stock, aq }
    })
    .filter((x): x is ScoredStockProp => x !== null)

  return (
    <>
      <div className="disc-ribbon">
        <strong>For informational purposes only.</strong>
        Sense&Stock Smart Screen uses published analyst research to surface stocks matching user-defined criteria. This is not investment advice. Criteria Match Signals are automated and do not constitute buy or sell recommendations.
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--fm)' }}>
          Data: Faida IB · AIB-AXYS · NCBA IB · Genghis · Nov 2025
        </span>
      </div>
      <SmartScreen data={data} />
    </>
  )
}
