import 'server-only'

import type { Stock } from '@/lib/types/stock'

export type RiskLevel = 'Low' | 'Medium' | 'High'

export function calculateRiskLevel(stock: Stock): RiskLevel {
  if (!stock.a || stock.a === 0) return 'High'
  if (stock.a >= 4 || stock.hit >= 70) return 'Low'
  if (stock.a >= 2 || stock.hit >= 50) return 'Medium'
  return 'High'
}

export function calculateHiddenGemScore(stock: Stock): number {
  if (!stock.p || stock.p <= 0) return 0
  const upside = stock.avgPT > 0 ? ((stock.avgPT - stock.p) / stock.p) * 100 : 0
  const pos52 = stock.h52 > stock.l52
    ? ((stock.p - stock.l52) / (stock.h52 - stock.l52)) * 100
    : 50
  const dayScore = Math.max(0, Math.min(((stock.c + 5) / 10) * 100, 100))
  const score = (upside / 60) * 40 + pos52 * 0.30 + dayScore * 0.20 + stock.a * 5
  return Math.round(Math.min(score, 100))
}
