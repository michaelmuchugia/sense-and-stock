interface RatingDonutProps {
  buy: number
  hold: number
  sell: number
  size?: number
}

export function RatingDonut({ buy, hold, sell, size = 110 }: RatingDonutProps) {
  const r = size / 2 - 8
  const cx = size / 2
  const cy = size / 2
  const circ = 2 * Math.PI * r
  const total = buy + hold + sell || 1

  const segments = [
    { val: buy, color: '#00C896' },
    { val: hold, color: '#F5C518' },
    { val: sell, color: '#FF4D6A' },
  ]

  let offset = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="14" />
      {segments.map((seg, i) => {
        if (seg.val <= 0) return null
        const dash = (seg.val / total) * circ
        const elem = (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="14"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset}
          />
        )
        offset += dash
        return elem
      })}
    </svg>
  )
}
