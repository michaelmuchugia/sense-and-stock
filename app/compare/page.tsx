import { getAllAnalysts } from '@/lib/api/analysts'
import { CompareClient } from '@/components/compare/CompareClient'

export const revalidate = 3600

export default async function ComparePage() {
  const resolved = await getAllAnalysts()
  const analysts = resolved.map(({ _provenance, ...a }) => a)
  return <CompareClient analysts={analysts} />
}
