import { getAllAnalysts } from '@/lib/api/analysts'
import { AnalystTable } from '@/components/analysts/AnalystTable'

export const revalidate = 3600

export default async function AnalystsPage() {
  const analysts = await getAllAnalysts()
  return (
    <div className="C pb40">
      <div className="shdr">
        <div className="sht">NSE Research Analysts</div>
        <div className="shm">{analysts.length} active · {new Set(analysts.map(a => a.firm).filter(Boolean)).size} brokerages</div>
      </div>
      <AnalystTable analysts={analysts} />
    </div>
  )
}
