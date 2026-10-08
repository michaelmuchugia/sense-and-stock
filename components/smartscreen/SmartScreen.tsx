'use client'

import { useMemo, useState } from 'react'
import clsx from 'clsx'
import Link from 'next/link'
import type { Stock } from '@/lib/types/stock'
import type { AQScore } from '@/lib/types/signal'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useToast } from '@/components/layout/Toast'
import { WhyMatchedModal } from '@/components/smartscreen/WhyMatchedModal'
import { WatchlistPanel } from '@/components/smartscreen/WatchlistPanel'
import { AlertModal } from '@/components/ui/AlertModal'

export interface ScoredStockProp {
  stock: Stock
  aq: AQScore
}

interface SmartScreenProps {
  data: ScoredStockProp[]
}

type FilterKey = 'all' | 'sm' | 'wa' | 'ne' | 'Banking' | 'Insurance' | 'Energy' | 'Telecoms' | 'Manufacturing'

const FILTER_LABELS: Record<FilterKey, string> = {
  all: 'All Stocks',
  sm: 'Strong Match',
  wa: 'Watch',
  ne: 'Neutral',
  Banking: 'Banking',
  Insurance: 'Insurance',
  Energy: 'Energy',
  Telecoms: 'Telecoms',
  Manufacturing: 'Manufacturing',
}

const CRIT_LABELS: Record<string, string> = {
  all: 'All NSE Stocks',
  sm: 'Strong Match, all top criteria met',
  wa: 'Watch, partial criteria match',
  ne: 'Neutral, few criteria met',
  Banking: 'Banking sector stocks',
  Insurance: 'Insurance sector stocks',
  Energy: 'Energy sector stocks',
  Telecoms: 'Telecoms sector stocks',
  Manufacturing: 'Manufacturing sector stocks',
  Agriculture: 'Agriculture sector stocks',
}

const PAGE_SIZE = 20

const SCORE_COLORS = {
  sm: '#00C896',
  wa: '#F5C518',
  ne: '#6E8099',
  lm: '#FF4D6A',
}

function scoreColorLocal(score: number): string {
  if (score >= 72) return SCORE_COLORS.sm
  if (score >= 55) return SCORE_COLORS.wa
  if (score >= 38) return SCORE_COLORS.ne
  return SCORE_COLORS.lm
}

function confLabelShort(conf: 'high' | 'med' | 'low'): string {
  return conf === 'high' ? 'High' : conf === 'med' ? 'Medium' : 'Low'
}

function calculateRiskLocal(stock: Stock): { label: 'Low' | 'Medium' | 'High'; cls: string } {
  let label: 'Low' | 'Medium' | 'High'
  if (!stock.a || stock.a === 0) label = 'High'
  else if (stock.a >= 4 || stock.hit >= 70) label = 'Low'
  else if (stock.a >= 2 || stock.hit >= 50) label = 'Medium'
  else label = 'High'
  return {
    label,
    cls: label === 'Low' ? 'risk-low' : label === 'Medium' ? 'risk-med' : 'risk-high',
  }
}

export function SmartScreen({ data }: SmartScreenProps) {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'score' | 'upside' | 'hit' | 'analysts'>('score')
  const [page, setPage] = useState(1)
  const [detailed, setDetailed] = useState(false)
  const [wmStock, setWmStock] = useState<Stock | null>(null)
  const [wmAq, setWmAq] = useState<AQScore | null>(null)
  const [wlPanelOpen, setWlPanelOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertSymbol, setAlertSymbol] = useState<string | null>(null)

  const { watchlist, has, toggle, remove, hydrated } = useWatchlist()
  const { showToast } = useToast()

  const stocks = useMemo(() => data.map(d => d.stock), [data])

  const rows = useMemo(() => {
    const onlyWithPrice = data.filter(d => d.stock.p > 0)
    let filtered = onlyWithPrice
    if (filter === 'sm') filtered = filtered.filter(r => r.aq.sigClass === 'sm')
    else if (filter === 'wa') filtered = filtered.filter(r => r.aq.sigClass === 'wa')
    else if (filter === 'ne') filtered = filtered.filter(r => r.aq.sigClass === 'ne')
    else if (filter !== 'all') filtered = filtered.filter(r => r.stock.sec === filter)

    const q = search.trim().toLowerCase()
    if (q) {
      filtered = filtered.filter(r =>
        r.stock.s.toLowerCase().includes(q) || r.stock.n.toLowerCase().includes(q),
      )
    }

    const sorted = [...filtered]
    if (sort === 'upside') sorted.sort((a, b) => b.aq.upside_pct - a.aq.upside_pct)
    else if (sort === 'hit') sorted.sort((a, b) => b.stock.hit - a.stock.hit)
    else if (sort === 'analysts') sorted.sort((a, b) => b.stock.a - a.stock.a)
    else sorted.sort((a, b) => b.aq.score - a.aq.score)

    return sorted
  }, [data, filter, search, sort])

  const total = rows.length
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.min(page, pages)
  const start = (currentPage - 1) * PAGE_SIZE
  const pageRows = rows.slice(start, start + PAGE_SIZE)

  function handleFilterClick(f: FilterKey) {
    setFilter(f)
    setPage(1)
  }

  function handleToggleWl(sym: string) {
    const nowSaved = toggle(sym)
    showToast(nowSaved ? `${sym} added to watchlist` : `${sym} removed from watchlist`)
  }

  function openWhyMatched(stock: Stock, aq: AQScore) {
    setWmStock(stock)
    setWmAq(aq)
  }

  function openAlert(sym: string | null) {
    setAlertSymbol(sym)
    setAlertOpen(true)
  }

  return (
    <>
      <div className="ss-hdr">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
          <div>
            <div className="ss-title">Sense&Stock Smart Screen</div>
            <div className="ss-sub">
              Screen all 65 NSE stocks against published analyst criteria.{' '}
              <Link href="/signals" style={{ color: 'var(--g)', fontWeight: 500 }}>View Signals Performance →</Link>
            </div>
            <div className="ss-src">Data from CMA-licensed NSE brokerages. Updated monthly.</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              className="bg"
              style={{ fontSize: 12, padding: '7px 13px' }}
              onClick={() => setWlPanelOpen(p => !p)}
            >
              Watchlist ({hydrated ? watchlist.length : 0})
            </button>
            <button
              type="button"
              className="bp"
              style={{ fontSize: 12, padding: '7px 13px' }}
              onClick={() => openAlert(null)}
            >
              Bulk Alert
            </button>
          </div>
        </div>

        <WatchlistPanel
          open={wlPanelOpen}
          onClose={() => setWlPanelOpen(false)}
          watchlist={watchlist}
          stocks={stocks}
          onRemove={remove}
        />

        <div className="filt">
          {(Object.keys(FILTER_LABELS) as FilterKey[]).map(f => (
            <button
              key={f}
              type="button"
              className={clsx('fb', { active: filter === f })}
              onClick={() => handleFilterClick(f)}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        <div className="crit-bar">
          <span className="crit-lbl">Showing stocks that match:</span>
          <span className="crit-val">{CRIT_LABELS[filter] ?? filter}</span>
        </div>

        <div className="ss-srow">
          <div className="ss-sw">
            <input
              className="ss-sinput"
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              aria-label="Search screening results"
              placeholder="Search ticker or name..."
            />
          </div>
          <span className="ss-cnt">{total} stock{total !== 1 ? 's' : ''} matched</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--txd)' }}>Sort:</span>
            <select
              aria-label="Sort screening results"
              className="ss-sort"
              value={sort}
              onChange={e => setSort(e.target.value as typeof sort)}
            >
              <option value="score">Sense&Stock Score</option>
              <option value="upside">Upside Potential</option>
              <option value="hit">Hit Ratio</option>
              <option value="analysts">Coverage</option>
            </select>
          </div>
        </div>
      </div>

      <div className="sc-legend" style={{ marginTop: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--txdd)', fontFamily: 'var(--fm)' }}>Sense&Stock Score:</span>
        <div className="sc-leg-i"><div className="sc-leg-d" style={{ background: '#00C896' }}></div>72–100 Strong Match</div>
        <div className="sc-leg-i"><div className="sc-leg-d" style={{ background: '#F5C518' }}></div>55–71 Watch</div>
        <div className="sc-leg-i"><div className="sc-leg-d" style={{ background: '#6E8099' }}></div>38–54 Neutral</div>
        <div className="sc-leg-i"><div className="sc-leg-d" style={{ background: '#FF4D6A' }}></div>0–37 Low Match</div>
        <span style={{ fontSize: 10, color: 'var(--txdd)', marginLeft: 'auto', fontFamily: 'var(--fm)' }}>
          Confidence×0.30 + Accuracy×0.25 + Upside×0.20 + Momentum×0.25
        </span>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 40px' }}>
        <div className="screen-display"><span>Table view</span><button type="button" className="bg" aria-pressed={detailed} onClick={() => setDetailed(v => !v)}>{detailed ? 'Show essentials' : 'Show all metrics'}</button></div>
        <div className="ss-mobile-cards">
          {pageRows.map(({ stock: s, aq }) => <article className="screen-stock-card" key={s.s}>
            <div className="screen-card-heading"><Link href={`/stocks/${s.s}`}><strong>{s.s}</strong><span>{s.n}</span></Link><button type="button" className={clsx('wl-star', { saved: hydrated && has(s.s) })} aria-label={`${hydrated && has(s.s) ? 'Remove' : 'Save'} ${s.s} ${hydrated && has(s.s) ? 'from' : 'to'} watchlist`} onClick={() => handleToggleWl(s.s)}>{hydrated && has(s.s) ? '★' : '☆'}</button></div>
            <dl><div><dt>Price</dt><dd>KES {s.p.toFixed(2)}</dd></div><div><dt>Avg target</dt><dd>KES {s.avgPT}</dd></div><div><dt>Upside</dt><dd className={aq.upside_pct >= 0 ? 'p' : 'n'}>{aq.upside_pct >= 0 ? '+' : ''}{aq.upside_pct.toFixed(1)}%</dd></div><div><dt>Score</dt><dd>{aq.score}/100</dd></div></dl>
            <button type="button" className={`sig ${aq.sigClass}`} onClick={() => openWhyMatched(s, aq)}>{aq.signal} · Why this matched</button>
            <details><summary>More metrics</summary><dl><div><dt>Sector</dt><dd>{s.sec}</dd></div><div><dt>Day change</dt><dd>{s.c.toFixed(2)}%</dd></div><div><dt>Analysts</dt><dd>{s.a}</dd></div><div><dt>Hit ratio</dt><dd>{s.hit.toFixed(1)}%</dd></div><div><dt>Risk</dt><dd>{calculateRiskLocal(s).label}</dd></div><div><dt>Confidence</dt><dd>{confLabelShort(aq.conf)}</dd></div></dl></details>
          </article>)}
          {pageRows.length === 0 && <p className="search-empty">No stocks match the current criteria.</p>}
        </div>
        <div className="ss-wrap" tabIndex={0} role="region" aria-label="Stock screening table">
          <table className={`ss-tbl${detailed ? ' detailed' : ' compact'}`}>
            <thead>
              <tr>
                <th className="sticky" style={{ minWidth: 90 }}>Ticker</th>
                <th style={{ minWidth: 150 }}>Company</th>
                <th style={{ minWidth: 80 }}>Sector</th>
                <th style={{ minWidth: 80 }}>Price</th>
                <th style={{ minWidth: 65 }}>Day Chg</th>
                <th style={{ minWidth: 60 }}>Analysts</th>
                <th style={{ minWidth: 85 }}>Avg Target</th>
                <th style={{ minWidth: 70 }}>Upside</th>
                <th style={{ minWidth: 75 }}>Hit Ratio</th>
                <th className="ss-risk-th">Risk</th>
                <th style={{ minWidth: 120 }}>SS Score</th>
                <th style={{ minWidth: 130 }}>
                  <div className="th-tip">
                    Criteria Match<span className="th-ti">?</span>
                    <div className="th-tt">
                      Match indicates how closely a stock fits selected criteria based on published analyst data. It is not a recommendation to buy or sell any security. Sense&Stock is not a licensed investment adviser.
                    </div>
                  </div>
                </th>
                <th style={{ minWidth: 80 }}>Save</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(({ stock: s, aq }) => {
                const col = scoreColorLocal(aq.score)
                const uCls = aq.upside_pct >= 0 ? 'p' : 'n'
                const risk = calculateRiskLocal(s)
                const saved = hydrated && has(s.s)
                return (
                  <tr key={s.s}>
                    <td className="sticky">
                      <Link href={`/stocks/${s.s}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        <span className="pill">{s.s}</span>
                      </Link>
                    </td>
                    <td style={{ maxWidth: 150, fontSize: 12 }}>{s.n}</td>
                    <td style={{ fontSize: 11.5, color: 'var(--txd)' }}>{s.sec}</td>
                    <td style={{ fontFamily: 'var(--fm)' }}>KES {s.p.toFixed(2)}</td>
                    <td className={s.c >= 0 ? 'p' : 'n'} style={{ fontFamily: 'var(--fm)' }}>
                      {s.c >= 0 ? '+' : ''}{s.c.toFixed(2)}%
                    </td>
                    <td style={{ fontFamily: 'var(--fm)' }}>{s.a}</td>
                    <td style={{ fontFamily: 'var(--fm)' }}>KES {s.avgPT}</td>
                    <td className={uCls} style={{ fontFamily: 'var(--fm)' }}>
                      {aq.upside_pct >= 0 ? '+' : ''}{aq.upside_pct.toFixed(1)}%
                    </td>
                    <td style={{ fontFamily: 'var(--fm)' }}>{s.hit.toFixed(1)}%</td>
                    <td><span className={`risk-badge ${risk.cls}`}>{risk.label}</span></td>
                    <td>
                      <div className="sc-cell">
                        <span className="sc-num" style={{ color: col }}>{aq.score}</span>
                        <div className="sc-bar"><div className="sc-fill" style={{ width: `${aq.score}%`, background: col }}></div></div>
                        <span className={`conf ${aq.conf}`}>{confLabelShort(aq.conf)}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <button
                          type="button"
                          className={`sig ${aq.sigClass}`}
                          onClick={() => openWhyMatched(s, aq)}
                        >
                          <span className="sig-d"></span>{aq.signal}
                        </button>
                        <button
                          type="button"
                          aria-label={`Why ${s.s} matched`}
                          className="sig-tip"
                          onClick={() => openWhyMatched(s, aq)}
                          title="Why this matched"
                        >?</button>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={clsx('wl-star', { saved })}
                        aria-label={saved ? 'Remove from watchlist' : 'Add to watchlist'}
                        onClick={() => handleToggleWl(s.s)}
                      >
                        {saved ? '★' : '☆'}
                      </button>
                    </td>
                  </tr>
                )
              })}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={detailed ? 13 : 8} style={{ textAlign: 'center', color: 'var(--txd)', padding: 24 }}>
                    No stocks match the current criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pag">
          <span>
            Showing {total === 0 ? 0 : start + 1}–{Math.min(start + PAGE_SIZE, total)} of {total}
          </span>
          <div className="pag-btns">
            <button
              type="button"
              className="pag-btn"
              disabled={currentPage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              ←
            </button>
            <span style={{ alignSelf: 'center', fontSize: 12 }}>{currentPage} / {pages}</span>
            <button
              type="button"
              className="pag-btn"
              disabled={currentPage >= pages}
              onClick={() => setPage(p => Math.min(pages, p + 1))}
            >
              →
            </button>
          </div>
        </div>
      </div>

      <WhyMatchedModal
        open={!!wmStock}
        onClose={() => { setWmStock(null); setWmAq(null) }}
        stock={wmStock}
        aq={wmAq}
        isInWatchlist={wmStock ? has(wmStock.s) : false}
        onToggleWatchlist={handleToggleWl}
      />

      <AlertModal
        open={alertOpen}
        onClose={() => setAlertOpen(false)}
        symbol={alertSymbol}
      />
    </>
  )
}
