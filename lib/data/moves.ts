export interface DailyMoveEntry {
  analyst: string
  firm: string
  sym: string
  rating: 'Buy' | 'Hold' | 'Sell'
  ptFrom: number
  ptTo: number
  days: number
  upside: number
  hit: string
}

export const DAILY_MOVES: DailyMoveEntry[] = [
  {analyst:'Ngugi Waweru',firm:'Faida Investment Bank',sym:'SCOM',rating:'Buy',ptFrom:34.00,ptTo:37.50,days:208,upside:25.6,hit:'49/68 (72.1%)'},
  {analyst:'Caleb Mugendi',firm:'Genghis Capital',sym:'ABSA',rating:'Buy',ptFrom:34.00,ptTo:38.00,days:206,upside:22.4,hit:'34/48 (70.8%)'},
  {analyst:'AIB-AXYS Research',firm:'AIB-AXYS Africa',sym:'KCB',rating:'Buy',ptFrom:78.00,ptTo:85.00,days:215,upside:21.9,hit:'50/74 (67.6%)'},
  {analyst:'FIB Research Team',firm:'Faida Investment Bank',sym:'COOP',rating:'Buy',ptFrom:32.00,ptTo:38.50,days:193,upside:19.2,hit:'57/82 (69.5%)'},
  {analyst:'NCBA IB Research',firm:'NCBA Investment Bank',sym:'EQTY',rating:'Hold',ptFrom:90.00,ptTo:98.00,days:238,upside:28.9,hit:'41/62 (66.1%)'},
  {analyst:'FIB Research Team',firm:'Faida Investment Bank',sym:'KPLC',rating:'Buy',ptFrom:15.50,ptTo:18.50,days:318,upside:10.8,hit:'43/82 (52.4%)'},
  {analyst:'Genghis Research',firm:'Genghis Capital',sym:'KNRE',rating:'Buy',ptFrom:3.38,ptTo:7.20,days:372,upside:113.0,hit:'37/55 (67.3%)'},
  {analyst:'SIB Research Team',firm:'Standard Investment Bank',sym:'EABL',rating:'Hold',ptFrom:260.00,ptTo:295.00,days:272,upside:18.4,hit:'34/51 (66.7%)'},
  {analyst:'Sterling Capital',firm:'Sterling Capital',sym:'KPC',rating:'Buy',ptFrom:9.40,ptTo:12.00,days:305,upside:27.7,hit:'27/42 (64.3%)'},
  {analyst:'AIB-AXYS Equity',firm:'AIB-AXYS Africa',sym:'KUKZ',rating:'Buy',ptFrom:400.00,ptTo:480.00,days:265,upside:14.1,hit:'21/34 (61.8%)'},
]

export interface LiveSignalEntry {
  sym: string
  signalDate: string
  signalType: 'Strong Match' | 'Watch' | 'Neutral' | 'Low Match'
  scoreAtSignal: number
  entryPx: number
  status: 'Tracking' | 'Closed'
}

export const LIVE_SIGNALS: LiveSignalEntry[] = [
  {sym:'KCB', signalDate:'2026-03-01', signalType:'Strong Match', scoreAtSignal:86, entryPx:67.50, status:'Tracking'},
  {sym:'EQTY',signalDate:'2026-03-01', signalType:'Strong Match', scoreAtSignal:84, entryPx:74.00, status:'Tracking'},
  {sym:'NCBA',signalDate:'2026-03-01', signalType:'Strong Match', scoreAtSignal:81, entryPx:87.00, status:'Tracking'},
  {sym:'SCOM',signalDate:'2026-02-01', signalType:'Watch',        scoreAtSignal:77, entryPx:29.50, status:'Tracking'},
  {sym:'COOP',signalDate:'2026-02-01', signalType:'Watch',        scoreAtSignal:75, entryPx:31.50, status:'Tracking'},
  {sym:'ABSA',signalDate:'2026-01-01', signalType:'Watch',        scoreAtSignal:77, entryPx:29.50, status:'Tracking'},
  {sym:'KNRE',signalDate:'2025-12-01', signalType:'Strong Match', scoreAtSignal:76, entryPx:3.15,  status:'Tracking'},
  {sym:'BAMB',signalDate:'2026-02-15', signalType:'Watch',        scoreAtSignal:70, entryPx:52.00, status:'Closed'},
]
