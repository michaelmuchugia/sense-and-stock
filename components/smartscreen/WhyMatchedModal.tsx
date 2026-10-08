'use client'

import Link from 'next/link'
import type { Stock } from '@/lib/types/stock'
import type { AQScore } from '@/lib/types/signal'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { SignalBadge } from '@/components/ui/SignalBadge'
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge'

interface WhyMatchedModalProps {
  open: boolean
  onClose: () => void
  stock: Stock | null
  aq: AQScore | null
  isInWatchlist: boolean
  onToggleWatchlist: (sym: string) => void
}

const VARIANT_NOTES: Record<string, string> = {
  sm: 'meeting strong criteria. This is a criteria match only, not a buy recommendation.',
  wa: 'partially meeting criteria. Some pillars are strong while others need improvement.',
  ne: 'meeting few criteria. Analyst coverage may be thin or data quality limited.',
  lm: 'meeting weak criteria. Low confidence or unfavourable analyst signals. Not investment advice.',
}

export function WhyMatchedModal({ open, onClose, stock, aq, isInWatchlist, onToggleWatchlist }: WhyMatchedModalProps) {
  if (!stock || !aq) return null

  const pillars = [
    { lbl: 'Analyst Confidence', val: aq.pillars.confidence, wt: '30%', color: '#00C896' },
    { lbl: 'Analyst Accuracy', val: aq.pillars.accuracy, wt: '25%', color: '#4A9EFF' },
    { lbl: 'Upside Potential', val: aq.pillars.upside, wt: '20%', color: '#F5C518' },
    { lbl: 'Momentum (Approx.)', val: aq.pillars.momentum, wt: '25%', color: '#C084FC' },
  ]
  const note = VARIANT_NOTES[aq.sigClass]

  return (
    <div className={`mo${open ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="mbox">
        <button type="button" className="mx" onClick={onClose}>×</button>
        <h3>Why This Matched</h3>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '10px 0 16px', background: 'var(--bg3)', padding: 12, borderRadius: 8 }}>
            <span className="pill" style={{ fontSize: 13 }}>{stock.s}</span>
            <span style={{ fontWeight: 500, flex: 1 }}>{stock.n}</span>
            <ScoreRing score={aq.score} size={56} stroke={5} numberSize={14} label="" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <SignalBadge sigClass={aq.sigClass} signal={aq.signal} />
            <ConfidenceBadge conf={aq.conf} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--txdd)', fontFamily: 'var(--fm)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
            Sense&Stock Score Breakdown, 4 Pillars
          </div>
          {pillars.map(p => (
            <div key={p.lbl} className="pl-row">
              <div className="pl-lbl">{p.lbl}</div>
              <div className="pl-bar"><div className="pl-fill" style={{ width: `${p.val}%`, background: p.color }}></div></div>
              <div className="pl-val" style={{ color: p.color }}>{p.val}</div>
              <div className="pl-wt">{p.wt}</div>
            </div>
          ))}
          <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 8, fontSize: 13, lineHeight: 1.65, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--bd)' }}>
            This stock scores <strong>{aq.score}/100</strong>, {note}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <Link href={`/stocks/${stock.s}`} className="bp" onClick={onClose}>View Stock Page</Link>
            <button
              type="button"
              className="bg"
              onClick={() => { onToggleWatchlist(stock.s); onClose() }}
            >
              {isInWatchlist ? 'Remove from' : 'Add to'} Watchlist
            </button>
          </div>
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--txdd)', lineHeight: 1.6, marginTop: 12, background: 'rgba(245,197,24,.03)', padding: 10, borderRadius: 8 }}>
          Sense&Stock Smart Screen surfaces stocks matching user-defined criteria using published analyst research. This is not investment advice. Always consult a CMA-licensed investment adviser before making investment decisions.
        </div>
      </div>
    </div>
  )
}
