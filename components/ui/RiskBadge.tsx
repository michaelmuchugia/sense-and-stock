import type { RiskLevel } from '@/lib/engine/risk'

interface RiskBadgeProps {
  risk: RiskLevel
}

export function RiskBadge({ risk }: RiskBadgeProps) {
  const cls = risk === 'Low' ? 'risk-low' : risk === 'Medium' ? 'risk-med' : 'risk-high'
  return <span className={`risk-badge ${cls}`}>{risk} Risk</span>
}
