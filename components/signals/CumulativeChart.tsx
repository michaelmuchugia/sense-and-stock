'use client'

import { useEffect, useRef } from 'react'

interface CumulativeChartProps {
  labels: string[]
  modelPts: number[]
  nasePts: number[]
}

export function CumulativeChart({ labels, modelPts, nasePts }: CumulativeChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    canvas.width = wrap.offsetWidth - 32
    canvas.height = 260

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    const pad = { t: 24, r: 24, b: 44, l: 56 }
    const cW = W - pad.l - pad.r
    const cH = H - pad.t - pad.b
    const allV = [...modelPts, ...nasePts]
    const minV = Math.min(...allV) * 0.97
    const maxV = Math.max(...allV) * 1.02
    const n = labels.length
    const toX = (i: number) => pad.l + (i / (n - 1)) * cW
    const toY = (v: number) => pad.t + (1 - (v - minV) / (maxV - minV)) * cH

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#0F1520'
    ctx.fillRect(0, 0, W, H)

    for (let g = 0; g < 5; g++) {
      const gy = pad.t + (g / 4) * cH
      ctx.strokeStyle = 'rgba(255,255,255,0.045)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(pad.l, gy)
      ctx.lineTo(W - pad.r, gy)
      ctx.stroke()
      ctx.fillStyle = 'rgba(110,128,153,0.7)'
      ctx.font = '9.5px DM Mono,monospace'
      ctx.textAlign = 'right'
      ctx.fillText((maxV - g * (maxV - minV) / 4).toFixed(1), pad.l - 6, gy + 3)
    }

    ctx.fillStyle = 'rgba(245,197,24,0.05)'
    ctx.beginPath()
    ctx.moveTo(toX(0), toY(nasePts[0]))
    nasePts.forEach((p, i) => ctx.lineTo(toX(i), toY(p)))
    ctx.lineTo(toX(n - 1), H - pad.b)
    ctx.lineTo(toX(0), H - pad.b)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = '#F5C518'
    ctx.lineWidth = 2
    ctx.beginPath()
    nasePts.forEach((p, i) => i === 0 ? ctx.moveTo(toX(i), toY(p)) : ctx.lineTo(toX(i), toY(p)))
    ctx.stroke()

    ctx.fillStyle = 'rgba(0,200,150,0.07)'
    ctx.beginPath()
    ctx.moveTo(toX(0), toY(modelPts[0]))
    modelPts.forEach((p, i) => ctx.lineTo(toX(i), toY(p)))
    ctx.lineTo(toX(n - 1), H - pad.b)
    ctx.lineTo(toX(0), H - pad.b)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = '#00C896'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    modelPts.forEach((p, i) => i === 0 ? ctx.moveTo(toX(i), toY(p)) : ctx.lineTo(toX(i), toY(p)))
    ctx.stroke()

    modelPts.forEach((p, i) => {
      ctx.fillStyle = '#00C896'
      ctx.beginPath()
      ctx.arc(toX(i), toY(p), 3.5, 0, Math.PI * 2)
      ctx.fill()
    })
    nasePts.forEach((p, i) => {
      ctx.fillStyle = '#F5C518'
      ctx.beginPath()
      ctx.arc(toX(i), toY(p), 3, 0, Math.PI * 2)
      ctx.fill()
    })

    ctx.fillStyle = 'rgba(110,128,153,0.7)'
    ctx.font = '10px DM Mono,monospace'
    ctx.textAlign = 'center'
    labels.forEach((l, i) => ctx.fillText(l, toX(i), H - 10))

    ctx.textAlign = 'left'
    ctx.fillStyle = '#00C896'
    ctx.fillText('— Sense&Stock Model', pad.l, pad.t - 6)
    ctx.fillStyle = '#F5C518'
    ctx.fillText('— NSE NASI Index', pad.l + 140, pad.t - 6)
  }, [labels, modelPts, nasePts])

  return (
    <div ref={wrapRef}>
      <canvas
        ref={canvasRef}
        style={{ marginTop: 24, borderRadius: 'var(--r12)', background: 'var(--bg2)', padding: 16 }}
      />
    </div>
  )
}
