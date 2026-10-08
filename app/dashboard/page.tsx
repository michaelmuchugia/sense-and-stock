import { getAllStocks } from '@/lib/api/stocks'
import { getScoresMap } from '@/lib/api/scores'
import { getDailyMoves } from '@/lib/api/moves'
import { Dashboard } from '@/components/dashboard/Dashboard'

export const revalidate = 3600

export default async function DashboardPage() {
  const [stocks, scoresMap, dailyMovesResolved] = await Promise.all([
    getAllStocks(),
    getScoresMap(),
    getDailyMoves(),
  ])

  const movers = stocks
    .filter(s => s.p > 0)
    .sort((a, b) => Math.abs(b.c) - Math.abs(a.c))
    .slice(0, 10)
    .map(({ _provenance, ...stock }) => {
      const aq = scoresMap.get(stock.s)
      return aq ? { stock, aq } : null
    })
    .filter((x): x is { stock: Parameters<typeof Dashboard>[0]['movers'][number]['stock']; aq: NonNullable<ReturnType<typeof scoresMap.get>> } => x !== null)

  // Strip _provenance from daily moves before passing — Dashboard's prop type
  // is the prototype `DailyMoveEntry` shape.
  const dailyMoves = dailyMovesResolved.map(({ _provenance, ...m }) => m)

  return <Dashboard movers={movers} dailyMoves={dailyMoves} />
}
