interface TimelineEntry {
  date: string
  title: string
  detail: string
}

const EVENTS: TimelineEntry[] = [
  { date: 'Apr 21, 2026', title: 'Ngugi Waweru upgrades SCOM', detail: 'Faida IB raises SCOM target from KES 34 to KES 37.50 · BUY · Upside: +25.6%' },
  { date: 'Apr 18, 2026', title: 'AIB-AXYS revises KCB target upward', detail: 'AIB-AXYS Africa raises KCB to KES 85 from KES 78 · BUY maintained' },
  { date: 'Apr 14, 2026', title: 'NCBA IB initiates coverage on SLAM', detail: 'NCBA Investment Bank issues BUY on Sanlam Allianz Kenya · Target KES 12.00' },
  { date: 'Apr 10, 2026', title: 'Genghis Capital maintains KNRE Buy', detail: 'Caleb Mugendi reiterates BUY on KNRE · Target KES 7.20 · Upside: 113%' },
  { date: 'Apr 7, 2026', title: 'FIB Research publishes April Stock Picks', detail: 'Faida IB monthly note covers 10 counters · COOP, KCB, EQTY headline picks' },
]

export function AnalystTimeline() {
  return (
    <div className="dash-card" style={{ marginBottom: 24 }}>
      <div className="dash-ttl">Recent Analyst Activity</div>
      <div className="tl">
        {EVENTS.map((e, i) => (
          <div key={i} className="tl-item">
            <div className="tl-dot"></div>
            <div className="tl-date">{e.date}</div>
            <div className="tl-box">
              <div className="tl-ttl">{e.title}</div>
              <div className="tl-det">{e.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
