import { scoreColor } from '@/lib/utils/score-display'

interface ScoreRingProps {
  score: number
  size?: number
  stroke?: number
  numberSize?: number
  label?: string
}

export function ScoreRing({ score, size = 72, stroke = 5, numberSize = 18, label = 'Score' }: ScoreRingProps) {
  const col = scoreColor(score)
  const r = size / 2 - stroke
  const cx = size / 2
  const cy = size / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)', display: 'block' }}
      >
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={col}
          strokeWidth={stroke}
          strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="score-center">
        <span className="score-num" style={{ color: col, fontSize: numberSize }}>{score}</span>
        <span className="score-lbl">{label}</span>
      </div>
    </div>
  )
}
