'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const MOB_LINKS = [
  { href: '/', label: 'Home', match: (p: string) => p === '/' },
  { href: '/stocks', label: 'Stocks', match: (p: string) => p === '/stocks' || p.startsWith('/stocks/') },
  { href: '/analysts', label: 'Analysts', match: (p: string) => p === '/analysts' || p.startsWith('/analysts/') },
  { href: '/smartscreen', label: 'Screen', match: (p: string) => p === '/smartscreen' },
  { href: '/dashboard', label: 'Dashboard', match: (p: string) => p === '/dashboard' },
]

export function MobileNav() {
  const pathname = usePathname()
  return (
    <nav className="mob-nav" aria-label="Mobile navigation">
      <div className="mob-inner">
        {MOB_LINKS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={clsx('mob-btn', { active: link.match(pathname) })}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
