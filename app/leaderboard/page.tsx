import { getAllAnalysts } from '@/lib/api/analysts'
import { LeaderboardClient } from '@/components/leaderboard/LeaderboardClient'

export const revalidate = 3600

export default async function LeaderboardPage() {
  const analysts = await getAllAnalysts()
  return (
    <div className="C pb40">
      <div className="shdr">
        <div className="sht">Top Performing NSE Analysts</div>
        <div className="shm">Ranked by hit ratio × avg return</div>
      </div>
      <LeaderboardClient analysts={analysts} />
    </div>
  )
}
