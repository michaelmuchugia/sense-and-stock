import { getAllStocks } from '@/lib/api/stocks'
import { getAllSnapshots } from '@/lib/api/snapshots'
import { SignalsPerformance } from '@/components/signals/SignalsPerformance'

export const revalidate = 3600

export default async function SignalsPage() {
  const [stocksResolved, snapshotsResolved] = await Promise.all([
    getAllStocks(),
    getAllSnapshots(),
  ])

  // Strip _provenance before passing to the client component.
  const stocks = stocksResolved.map(({ _provenance, ...s }) => s)
  const snapshots = snapshotsResolved.map(({ _provenance, ...s }) => s)

  return <SignalsPerformance snapshots={snapshots} stocks={stocks} />
}
