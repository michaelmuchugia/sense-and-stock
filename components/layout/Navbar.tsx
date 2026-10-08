'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { UserMenu } from '@/components/auth/UserMenu'
import { PlatformSearch } from './PlatformSearch'

export interface SearchIndexStock { ticker: string; name: string; sector: string }
export interface SearchIndexAnalyst { id: number; nm: string; firm: string }
export interface SearchIndex { stocks: SearchIndexStock[]; analysts: SearchIndexAnalyst[] }

const PRIMARY = [ { href: '/stocks', label: 'Stocks' }, { href: '/analysts', label: 'Analysts' }, { href: '/pricing', label: 'Pricing' }, { href: '/learn', label: 'Learn' } ]
const TOOLS = [
  { href: '/leaderboard', label: 'Analyst leaderboard', description: 'Compare analyst track records' },
  { href: '/sectors', label: 'Browse by sector', description: 'Explore companies by industry' },
  { href: '/smartscreen', label: 'Smart Screen', description: 'Filter stocks by your criteria' },
  { href: '/compare', label: 'Compare stocks', description: 'Review stocks side by side' },
  { href: '/signals', label: 'Signals', description: 'Explore model output history' },
  { href: '/dashboard', label: 'Dashboard', description: 'Open your research overview' },
]
export function Navbar({ searchIndex }: { searchIndex: SearchIndex }) {
  const pathname = usePathname()
  const [menu, setMenu] = useState(false)
  const root = useRef<HTMLElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => { setMenu(false) }, [pathname])
  useEffect(() => {
    const outside = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setMenu(false) }
    window.addEventListener('mousedown', outside)
    return () => window.removeEventListener('mousedown', outside)
  }, [])
  const active = (href: string) => pathname === href || pathname.startsWith(href + '/')
  return <nav className="ss-nav" aria-label="Main navigation" ref={root}
    onKeyDown={e => { if (e.key === 'Escape' && menu) { setMenu(false); trigger.current?.focus() } }}>
    <Link href="/" className="nl-logo" aria-label="Sense & Stock home"><img src="/ss-mark-dark.png" alt="" width={23} height={30} />Sense <em>&amp;</em> Stock</Link>
    <div className="nav-links">{PRIMARY.map(l => <Link key={l.href} href={l.href} className={clsx('nl', { active: active(l.href) })} aria-current={active(l.href) ? 'page' : undefined}>{l.label}</Link>)}</div>
    <div className="nav-r"><PlatformSearch searchIndex={searchIndex} />
      <button className={clsx('tools-trigger', { active: TOOLS.some(l => active(l.href)) })} ref={trigger} type="button" aria-expanded={menu} aria-controls="research-tools" onClick={() => setMenu(v => !v)}>Explore <span aria-hidden="true">{menu ? '−' : '+'}</span></button>
      <UserMenu />
    </div>
    {menu && <div id="research-tools" className="tools-menu" onBlur={e => { if (!root.current?.contains(e.relatedTarget)) setMenu(false) }}>
      <div className="mobile-primary">{PRIMARY.map(l => <Link key={l.href} href={l.href} onClick={() => setMenu(false)}>{l.label}</Link>)}</div>
      <div className="tools-title">Research tools</div><div className="tools-grid">{TOOLS.map(l => <Link key={l.href} href={l.href} onClick={() => setMenu(false)} className={active(l.href) ? 'active' : ''}><strong>{l.label}</strong><span>{l.description}</span></Link>)}</div>
    </div>}
  </nav>
}
