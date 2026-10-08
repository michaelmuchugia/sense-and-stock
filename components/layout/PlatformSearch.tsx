'use client'

import Link from 'next/link'
import { useId, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SearchIndex } from './Navbar'

export function PlatformSearch({ searchIndex, prominent = false }: { searchIndex: SearchIndex; prominent?: boolean }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const router = useRouter()
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const hits = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return [
      ...searchIndex.stocks.filter(s => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)).slice(0, 6).map(s => ({ href: `/stocks/${s.ticker}`, title: s.ticker, subtitle: s.name, kind: 'Stock' })),
      ...searchIndex.analysts.filter(a => a.nm.toLowerCase().includes(q) || a.firm.toLowerCase().includes(q)).slice(0, 4).map(a => ({ href: `/analysts/${a.id}`, title: a.nm, subtitle: a.firm, kind: 'Analyst' })),
    ]
  }, [query, searchIndex])
  const expanded = open && query.trim().length > 0
  function go(href: string) { setOpen(false); setQuery(''); setActive(-1); router.push(href) }
  return <div className={`platform-search${prominent ? ' prominent' : ''}`} ref={root}
    onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false) }}>
    <label htmlFor={`${id}-input`} className="sr-only">Search stocks or analysts</label>
    <span className="search-symbol" aria-hidden="true">⌕</span>
    <input id={`${id}-input`} role="combobox" aria-expanded={expanded} aria-controls={`${id}-results`} aria-autocomplete="list"
      aria-activedescendant={expanded && active >= 0 ? `${id}-${active}` : undefined}
      value={query} placeholder="Search a stock or analyst" autoComplete="off"
      onChange={e => { setQuery(e.target.value); setOpen(true); setActive(-1) }} onFocus={() => setOpen(true)}
      onKeyDown={e => {
        if (e.key === 'Escape') { setOpen(false); setActive(-1) }
        if (e.key === 'ArrowDown' && hits.length) { e.preventDefault(); setOpen(true); setActive(a => (a + 1) % hits.length) }
        if (e.key === 'ArrowUp' && hits.length) { e.preventDefault(); setActive(a => (a <= 0 ? hits.length - 1 : a - 1)) }
        if (e.key === 'Enter' && hits.length && expanded) { e.preventDefault(); go(hits[Math.max(0, active)].href) }
      }} />
    {expanded && <div id={`${id}-results`} role="listbox" className="search-results" aria-label="Search results">
      {hits.length ? hits.map((h, i) => <Link id={`${id}-${i}`} role="option" aria-selected={active === i} key={h.href} href={h.href}
        className={`search-result${active === i ? ' selected' : ''}`} onClick={() => { setQuery(''); setOpen(false) }}>
        <span><strong>{h.title}</strong><small>{h.subtitle}</small></span><span className="search-kind">{h.kind}</span>
      </Link>) : <div className="search-empty">No matches. Try a company name, ticker, analyst, or firm.</div>}
    </div>}
  </div>
}
