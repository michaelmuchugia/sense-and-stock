export interface Analyst {
  id: number
  nm: string
  ini: string
  firm: string
  stocks: string[]
  hit: number
  ret: number
  days: number
  score: number
  targets: number
  since: string
  bio: string
  /** True when enough matured calls exist to publish an accuracy figure. */
  measured?: boolean
}
