export type SignalClass = 'sm' | 'wa' | 'ne' | 'lm'

export type Confidence = 'high' | 'med' | 'low'

export interface AQScore {
  score: number
  signal: string
  sigClass: SignalClass
  conf: Confidence
  upside_pct: number
  pillars: {
    confidence: number
    accuracy: number
    upside: number
    momentum: number
  }
}

export interface SignalSnapshot {
  month: string
  label: string
  naseRet: number
  signals: {
    sym: string
    entryPx: number
    score: number
    note: string
  }[]
}

export interface DailyMove {
  s: string
  c: number
}

export interface TickerTapeItem {
  sym: string
  px: number
  chg: number
}
