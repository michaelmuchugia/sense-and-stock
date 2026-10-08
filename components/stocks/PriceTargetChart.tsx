'use client'

import { useEffect, useRef } from 'react'
import type { Stock } from '@/lib/types/stock'
import type { Analyst } from '@/lib/types/analyst'

interface PriceTargetChartProps {
  stock: Stock
  covering: Analyst[]
}

export function PriceTargetChart({ stock, covering }: PriceTargetChartProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    canvas.width = wrap.offsetWidth - 44
    canvas.height = 260

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    const pad = { t: 22, r: 14, b: 38, l: 56 }
    const cW = W - pad.l - pad.r
    const cH = H - pad.t - pad.b

    const months = ['Jan 25', 'Mar 25', 'May 25', 'Jul 25', 'Sep 25', 'Nov 25', 'Jan 26', 'Mar 26', 'Apr 26']
    const n = months.length
    const base = stock.p * 0.60

    // Deterministic noise so SSR/CSR differ less and re-renders are stable
    let seed = 1
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }

    const prices = months.map((_, i) => base + (stock.p - base) * (i / (n - 1)) + (rand() - 0.45) * stock.p * 0.065)
    prices[n - 1] = stock.p

    const limited = covering.slice(0, 4)
    const cols = ['#00C896', '#F5C518', '#FF7B45', '#4A9EFF']
    const ptLines = limited.map(a => {
      return months.map((_, i) => {
        const b2 = stock.p * (1 + a.ret / 100) * 0.76
        const t2 = stock.p * (1 + a.ret / 100) * 1.07
        return b2 + (t2 - b2) * (i / (n - 1)) + (rand() - 0.38) * stock.p * 0.04
      })
    })

    const allV = [...prices]
    ptLines.forEach(pl => pl.forEach(v => allV.push(v)))
    const minV = Math.min(...allV) * 0.93
    const maxV = Math.max(...allV) * 1.05
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
      ctx.fillStyle = 'rgba(110,128,153,0.65)'
      ctx.font = '9.5px DM Mono,monospace'
      ctx.textAlign = 'right'
      ctx.fillText((maxV - g * (maxV - minV) / 4).toFixed(0), pad.l - 5, gy + 3)
    }

    ptLines.forEach((pts, ai) => {
      ctx.strokeStyle = cols[ai]
      ctx.lineWidth = 1.5
      ctx.setLineDash([5, 4])
      ctx.beginPath()
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(toX(i), toY(p)) : ctx.lineTo(toX(i), toY(p)))
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = cols[ai]
      ctx.beginPath()
      ctx.arc(toX(n - 1), toY(pts[n - 1]), 3.5, 0, Math.PI * 2)
      ctx.fill()
    })

    ctx.strokeStyle = '#8BA3BB'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    prices.forEach((p, i) => i === 0 ? ctx.moveTo(toX(i), toY(p)) : ctx.lineTo(toX(i), toY(p)))
    ctx.stroke()

    ctx.fillStyle = 'rgba(139,163,187,0.05)'
    ctx.beginPath()
    ctx.moveTo(toX(0), toY(prices[0]))
    prices.forEach((p, i) => ctx.lineTo(toX(i), toY(p)))
    ctx.lineTo(toX(n - 1), H - pad.b)
    ctx.lineTo(toX(0), H - pad.b)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = '#8BA3BB'
    ctx.beginPath()
    ctx.arc(toX(n - 1), toY(stock.p), 4.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = 'rgba(110,128,153,0.7)'
    ctx.font = '9.5px DM Mono,monospace'
    ctx.textAlign = 'center'
    months.forEach((m, i) => {
      if (i % 2 === 0) ctx.fillText(m, toX(i), H - 8)
    })

    ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(139,163,187,.8)'
    ctx.fillText('— NSE Price', pad.l, pad.t + 10)
    limited.forEach((a, ai) => {
      ctx.fillStyle = cols[ai]
      ctx.fillText('·· ' + a.nm.split(' ')[0], pad.l + 76 + ai * 94, pad.t + 10)
    })
  }, [stock, covering])

  return (
    <div ref={wrapRef} className="cbox">
      <div className="cttl">{stock.s} Analyst Price Targets vs Historical Price (KES)</div>
      <canvas ref={canvasRef} />
    </div>
  )
}
