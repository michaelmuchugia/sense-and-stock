import type { SignalSnapshot } from '@/lib/types/signal'

export const SIG_SNAPSHOTS: SignalSnapshot[] = [
  {month:'2025-10',label:'Oct 2025',naseRet:2.1,signals:[
    {sym:'KCB', entryPx:55.25,score:81,note:'Strong Buy consensus, 6 analysts, +38% upside'},
    {sym:'EQTY',entryPx:62.00,score:79,note:'High hit ratio, NCBA IB and Faida both active'},
    {sym:'COOP',entryPx:28.50,score:76,note:'5 analysts, majority Buy, strong momentum'},
    {sym:'KNRE',entryPx:3.10, score:74,note:'Deep value, 113% upside vs consensus target'},
    {sym:'SCOM',entryPx:27.50,score:72,note:'Faida IB upgraded, +25% upside to KES 34'},
  ]},
  {month:'2025-11',label:'Nov 2025',naseRet:1.4,signals:[
    {sym:'KCB', entryPx:58.00,score:83,note:'Target raised to KES 85 by AIB-AXYS'},
    {sym:'EQTY',entryPx:65.50,score:80,note:'NCBA IB reiterates Buy, Faida raises target'},
    {sym:'NCBA',entryPx:78.50,score:78,note:'Merger speculation, AIB-AXYS active coverage'},
    {sym:'KNRE',entryPx:3.15, score:76,note:'Genghis Capital maintains Buy at KES 7.20'},
    {sym:'COOP',entryPx:29.75,score:74,note:'Consistent Buy consensus across 4 brokerages'},
  ]},
  {month:'2025-12',label:'Dec 2025',naseRet:0.8,signals:[
    {sym:'KCB', entryPx:61.00,score:84,note:'3 active price targets, all above KES 80'},
    {sym:'EQTY',entryPx:68.00,score:81,note:'Highest hit ratio on this counter: 72.4%'},
    {sym:'NCBA',entryPx:80.00,score:79,note:'Analysts pricing in merger synergies'},
    {sym:'ABSA',entryPx:28.50,score:75,note:'AIB-AXYS Dec 2024 target: KES 38, +33% upside'},
    {sym:'SCOM',entryPx:28.75,score:73,note:'Faida monthly picks include SCOM as top hold'},
  ]},
  {month:'2026-01',label:'Jan 2026',naseRet:3.2,signals:[
    {sym:'KCB', entryPx:63.00,score:85,note:'Maintained through quarter, strong consensus'},
    {sym:'EQTY',entryPx:70.50,score:82,note:'Q3 results beat, analyst upgrades followed'},
    {sym:'NCBA',entryPx:82.00,score:80,note:'All 3 brokerages maintain Buy post-results'},
    {sym:'ABSA',entryPx:29.50,score:77,note:'Target unchanged, upside narrows slightly'},
    {sym:'KNRE',entryPx:3.20, score:75,note:'Value case intact, no catalyst yet'},
  ]},
  {month:'2026-02',label:'Feb 2026',naseRet:1.8,signals:[
    {sym:'KCB', entryPx:66.00,score:85,note:'Strong quarter, dividend announced'},
    {sym:'EQTY',entryPx:72.00,score:83,note:'FY 2025 results: net profit up 18%'},
    {sym:'NCBA',entryPx:85.00,score:81,note:'Near all-time high on merger speculation'},
    {sym:'SCOM',entryPx:29.50,score:76,note:'Ethiopia losses stabilising per Faida note'},
    {sym:'ABSA',entryPx:30.00,score:75,note:'Coverage expanded to 3 brokerages'},
  ]},
  {month:'2026-03',label:'Mar 2026',naseRet:2.4,signals:[
    {sym:'KCB', entryPx:67.50,score:86,note:'Highest score this cycle — 6 analysts, +22% upside'},
    {sym:'EQTY',entryPx:74.00,score:84,note:'Ngugi Waweru top analyst on this counter'},
    {sym:'NCBA',entryPx:87.00,score:81,note:'AIB-AXYS reiterates Buy at KES 100 target'},
    {sym:'SCOM',entryPx:28.50,score:77,note:'Faida raises target to KES 37.50 in Apr'},
    {sym:'COOP',entryPx:31.50,score:75,note:'Genghis reiterates Buy, target KES 40'},
  ]},
]
