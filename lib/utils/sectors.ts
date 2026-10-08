/**
 * Static sector metadata — name, three-letter abbreviation, accent colour.
 *
 * The DB-backed counterpart of the old `getStocksBySector` / `getSectorStockCount`
 * helpers lives in the page that needs it: it filters the array returned by
 * `lib/api/stocks.getAllStocks()`. Keeping this file as a pure metadata
 * module means it no longer needs to touch `lib/data/*`.
 */

export interface SectorMeta {
  name: string
  abbr: string
  color: string
}

export const SECTORS: SectorMeta[] = [
  { name: 'Banking', abbr: 'BNK', color: '#00C896' },
  { name: 'Telecoms', abbr: 'TEL', color: '#4A9EFF' },
  { name: 'Manufacturing', abbr: 'MFG', color: '#F5C518' },
  { name: 'Insurance', abbr: 'INS', color: '#C084FC' },
  { name: 'Energy', abbr: 'ENG', color: '#FF4D6A' },
  { name: 'Construction', abbr: 'CON', color: '#FFA500' },
  { name: 'Agriculture', abbr: 'AGR', color: '#90EE90' },
  { name: 'Commercial & Services', abbr: 'C&S', color: '#87CEEB' },
  { name: 'Investment', abbr: 'INV', color: '#DDA0DD' },
  { name: 'Automobiles', abbr: 'AUT', color: '#FFB6C1' },
  { name: 'REIT & ETF', abbr: 'REIT', color: '#B0C4DE' },
]

export function getSectorMeta(name: string): SectorMeta {
  return SECTORS.find(s => s.name === name)
    ?? { name, abbr: name.slice(0, 3).toUpperCase(), color: '#6E8099' }
}
