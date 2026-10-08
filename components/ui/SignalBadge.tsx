import type { SignalClass } from '@/lib/types/signal'

interface SignalBadgeProps {
  sigClass: SignalClass
  signal: string
  className?: string
}

export function SignalBadge({ sigClass, signal, className }: SignalBadgeProps) {
  return (
    <span className={`sig ${sigClass}${className ? ' ' + className : ''}`}>
      <span className="sig-d"></span>
      {signal}
    </span>
  )
}

export function DcSignalBadge({ sigClass, signal }: SignalBadgeProps) {
  return (
    <span className={`dc-sig ${sigClass}`}>
      <span className="dc-sig-dot"></span>
      {signal}
    </span>
  )
}
