import Link from 'next/link'
import { getAllAnalysts } from '@/lib/api/analysts'

export async function HeroLeaderboard() {
  const analysts = await getAllAnalysts()
  const top5 = [...analysts].sort((a, b) => b.score - a.score).slice(0, 5)
  return (
    <div className="hcard">
      <div className="hcard-ttl">Top Analysts &middot; 2026</div>
      <div>
        {top5.map((a, i) => (
          <Link key={a.id} href={`/analysts/${a.id}`} className="hcr">
            <div className={`hcrk${i < 3 ? ' t' : ''}`}>{i + 1}</div>
            <div className="hcri">
              <div className="hcrn">{a.nm}</div>
              <div className="hcrf">{a.firm}</div>
            </div>
            <div className="hcrs">
              <div className="hcrh">{a.hit.toFixed(1)}%</div>
              <div className="hcrd">{a.days}d avg</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
