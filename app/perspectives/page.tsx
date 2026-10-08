import { PerspectivesClient } from '@/components/perspectives/PerspectivesClient'

const PERSPECTIVES = [
  { cat: 'an' as const, catL: 'Analysis', title: 'Who Called the 2024–25 NSE Banking Rally?', exc: 'Six of Kenya’s ten brokerages issued at least one banking upgrade between January and June 2024. Sense&Stock examines whose calls came early enough to count.', date: 'Apr 18, 2026', rt: '9 min' },
  { cat: 'dd' as const, catL: 'Deep Dive', title: 'Safaricom’s Ethiopia Problem: What the Numbers Say', exc: 'Safaricom continues to post US$325mn annual losses in Ethiopia. Five of six analysts have Buy ratings. Sense&Stock examines whether the bullish consensus adequately prices the Ethiopia drag.', date: 'Apr 14, 2026', rt: '12 min' },
  { cat: 'dn' as const, catL: 'Data Note', title: 'Faida IB Oct–Nov 2025 Portfolio: A +6.6% Weighted Return', exc: 'Sense&Stock tracked Faida IB’s published monthly stock picks from Sep–Nov 2025. The October portfolio returned +1.7% and November +4.9% on a weighted average basis.', date: 'Apr 10, 2026', rt: '6 min' },
  { cat: 'an' as const, catL: 'Analysis', title: 'The KNRE Deep Value Case: 113% Upside and Three Analyst Buys', exc: 'Kenya Re-Insurance trades at KES 3.38 against book value of KES 9.27/share. All three analysts have Buy ratings. Sense&Stock examines why value has not unlocked.', date: 'Apr 7, 2026', rt: '8 min' },
  { cat: 'dd' as const, catL: 'Deep Dive', title: 'NCBA–Stanbic Merger Speculation: What Analyst Coverage Tells Us', exc: 'NCBA Group hit an all-time high of KES 90.25 on merger speculation. Sense&Stock maps the coverage landscape and what a combined entity would mean for price targets.', date: 'Apr 3, 2026', rt: '10 min' },
  { cat: 'dn' as const, catL: 'Data Note', title: 'Q1 2026 NSE Analyst Accuracy Scorecard: Top 16 Ranked', exc: 'Ngugi Waweru of Faida Investment Bank leads Sense&Stock’s Q1 2026 accuracy rankings with a 72.4% hit ratio across 68 price targets.', date: 'Mar 28, 2026', rt: '5 min' },
]

const FAQS = [
  { q: 'What is Sense&Stock?', a: 'Sense&Stock is Kenya’s first analyst tracking platform for the NSE. We track every public price target and rating issued by NSE-registered brokerages and calculate each analyst’s accuracy, average return, and time to target.' },
  { q: 'Where does the data come from?', a: 'Sense&Stock sources data from monthly and quarterly stock picks reports published by licensed brokerages, analyst research notes, and media coverage of analyst calls. We cross-reference with NSE closing prices to calculate hit ratios.' },
  { q: 'What is a Price Target Hit Ratio?', a: 'A hit ratio tells you what percentage of an analyst’s price targets were actually reached by the stock within a defined window. If the stock reaches the target within 12 months, that target is counted as met.' },
  { q: 'Which brokerages does Sense&Stock track?', a: 'We currently track: Faida Investment Bank, AIB-AXYS Africa, NCBA Investment Bank, Genghis Capital, Standard Investment Bank, Sterling Capital, Suntra Investment Bank, Old Mutual Securities Kenya, and ABC Capital.' },
  { q: 'How is the Sense&Stock Score calculated?', a: 'Score = (Analyst Confidence × 0.30) + (Analyst Accuracy × 0.25) + (Upside Potential × 0.20) + (Momentum × 0.25). Each pillar scores 0–100. A data quality multiplier reduces the score when coverage is thin.' },
  { q: 'Is Sense&Stock a registered investment adviser?', a: 'No. Sense&Stock is not a licensed investment adviser and does not provide investment recommendations. Always consult a CMA-licensed investment adviser before making investment decisions.' },
]

export default function PerspectivesPage() {
  return (
    <div className="C pb40">
      <div className="shdr">
        <div className="sht">Sense&Stock Perspectives</div>
        <div className="shm">Research analysis &amp; data notes</div>
      </div>
      <PerspectivesClient perspectives={PERSPECTIVES} faqs={FAQS} />
    </div>
  )
}
