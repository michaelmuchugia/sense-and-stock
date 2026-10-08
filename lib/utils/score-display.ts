import type { Confidence } from '@/lib/types/signal'

export function scoreColor(s: number): string {
  return s >= 72 ? '#00C896' : s >= 55 ? '#F5C518' : s >= 38 ? '#6E8099' : '#FF4D6A'
}

export function confLabel(c: Confidence): string {
  return c === 'high' ? 'High Confidence' : c === 'med' ? 'Medium Confidence' : 'Low Confidence'
}
