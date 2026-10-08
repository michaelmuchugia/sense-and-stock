import { notFound } from 'next/navigation'
import { getAllTickers, getStockByTicker } from '@/lib/api/stocks'
import { getScoreByTicker } from '@/lib/api/scores'
import { getAnalystsForStock } from '@/lib/api/analysts'
import { StockDetailHeader } from '@/components/stocks/StockDetailHeader'
import { SimpleView } from '@/components/stocks/SimpleView'
import { DeepView } from '@/components/stocks/DeepView'
import { StockDetailViewToggle } from '@/components/stocks/StockDetailViewToggle'

export const revalidate = 3600

// Phase 3: skip build-time prerendering to avoid hammering Neon's HTTP
// endpoint with 65 concurrent worker queries. Pages generate on first
// request and are then ISR-cached for 1 hour. Set `dynamicParams = true`
// explicitly so an unknown ticker still falls through to notFound().
export const dynamicParams = true

export async function generateStaticParams() {
  // Returning an empty array tells Next not to prerender any /stocks/<ticker>
  // path at build time. The function is kept so `getAllTickers` stays
  // imported and refactor-safe if we ever want to selectively prerender
  // (e.g. only the top-10 most-traded stocks).
  void getAllTickers
  return []
}

interface PageProps {
  params: Promise<{ ticker: string }>
}

export default async function StockDetailPage({ params }: PageProps) {
  const { ticker } = await params
  const stock = await getStockByTicker(ticker)
  if (!stock) notFound()

  const [aq, covering] = await Promise.all([
    getScoreByTicker(stock.s),
    getAnalystsForStock(stock.s),
  ])

  if (!aq) notFound() // every active stock should have a precomputed score

  const topAnalyst = covering[0]
  const { _provenance, ...stockShape } = stock

  return (
    <>
      <StockDetailHeader stock={stockShape} aq={aq} provenance={_provenance} />
      <StockDetailViewToggle
        simple={<SimpleView stock={stockShape} aq={aq} topAnalyst={topAnalyst} />}
        deep={<DeepView stock={stockShape} covering={covering} />}
      />
    </>
  )
}
