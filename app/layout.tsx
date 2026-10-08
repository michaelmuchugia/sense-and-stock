import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Navbar, type SearchIndex } from '@/components/layout/Navbar'
import { TickerTape } from '@/components/layout/TickerTape'
import { MobileNav } from '@/components/layout/MobileNav'
import { Footer } from '@/components/layout/Footer'
import { DemoBanner } from '@/components/ui/DemoBanner'
import { ToastProvider } from '@/components/layout/Toast'
import { WatchlistMigrationPrompt } from '@/components/auth/WatchlistMigrationPrompt'
import { getAllStocks } from '@/lib/api/stocks'
import { getAllAnalysts } from '@/lib/api/analysts'
import '@/styles/globals.css'
import '@/styles/ui-refresh.css'

export const metadata: Metadata = {
  title: 'Sense&Stock: NSE Analyst Intelligence Platform',
  description: 'Kenya\'s analyst intelligence platform. Track NSE price target accuracy and make more informed investment decisions.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [stocks, analysts] = await Promise.all([getAllStocks(), getAllAnalysts()])

  const tickerItems = stocks
    .filter(s => s.p > 0)
    .map(s => ({ sym: s.s, price: s.p, change: s.c }))

  const searchIndex: SearchIndex = {
    stocks:   stocks.map(s   => ({ ticker: s.s, name: s.n, sector: s.sec })),
    analysts: analysts.map(a => ({ id: a.id, nm: a.nm, firm: a.firm })),
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <ClerkProvider>
          <ToastProvider>
            <Navbar searchIndex={searchIndex} />
            <DemoBanner />
            <details className="market-tape-disclosure"><summary>Market prices</summary><TickerTape items={tickerItems} /></details>
            {children}
            <Footer />
            <MobileNav />
            <WatchlistMigrationPrompt />
          </ToastProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
