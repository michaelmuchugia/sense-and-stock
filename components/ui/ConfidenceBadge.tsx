import type { Confidence } from '@/lib/types/signal'

interface ConfidenceBadgeProps {
  conf: Confidence
}

export function ConfidenceBadge({ conf }: ConfidenceBadgeProps) {
  const label = conf === 'high' ? 'High' : conf === 'med' ? 'Medium' : 'Low'
  return <span className={`conf ${conf}`}>{label}</span>
}
