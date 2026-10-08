import 'server-only'

import { ANALYSTS } from '@/lib/data/analysts'
import type { Stock } from '@/lib/types/stock'
import type { AQScore } from '@/lib/types/signal'
import { calcScoreFromInputs } from './score-pure'

export function calcScore(stock: Stock): AQScore {
  const covering = ANALYSTS.filter(a => a.stocks.includes(stock.s))
  return calcScoreFromInputs({
    analystCount: stock.a,
    averagePriceTarget: stock.avgPT,
    price: stock.p,
    buyPct: stock.buy,
    hitRatio: stock.hit,
    high52w: stock.h52,
    low52w: stock.l52,
    dayChangePct: stock.c,
    coveringAnalystScores: covering.map(a => a.score),
  })
}

export function genInsight(stock: Stock, aq: AQScore): string {
  if (!stock.a) return 'Matches no criteria — no analyst coverage data available.'
  const covering = ANALYSTS
    .filter(a => a.stocks.includes(stock.s))
    .sort((a, b) => b.score - a.score)
  const top = covering[0]
  const uStr = (aq.upside_pct >= 0 ? '+' : '') + aq.upside_pct.toFixed(0) + '% upside'
  const cl: string[] = []
  if (aq.upside_pct >= 12) cl.push(uStr)
  if (stock.hit >= 68) cl.push(stock.hit.toFixed(0) + '% hit ratio')
  if (stock.buy >= 75) cl.push('strong Buy consensus')
  else if (stock.buy >= 50) cl.push('majority Buy rated')
  if (stock.a >= 5) cl.push(stock.a + ' analysts covering')
  if (top && top.score >= 1.8) cl.push('top analyst ' + top.nm.split(' ')[0] + ' (score ' + top.score.toFixed(2) + ')')
  if (!cl.length) return 'Matches weak criteria — limited upside, coverage, or consensus.'
  return 'Matches ' + cl.slice(0, 3).join(' · ')
}
