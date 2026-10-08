import 'server-only'

import { normalizeStockName } from './utils'

/**
 * Canonical mapping from our internal ticker to the company name as it appears
 * on NSE's daily price PDF (with the "Ord X.XX" denomination suffix stripped).
 * Used by the CSV ingest pipeline to match each NSE row to our `stocks` table.
 *
 * When NSE adds, renames, or removes a stock:
 *   1. The CSV ingest logs the unmatched row as a warning.
 *   2. Operator updates this map and re-runs.
 *
 * Note: This intentionally lives in code (not the DB) so changes are
 * code-reviewed, version-controlled, and rolled out via deploy.
 */
export const NSE_NAME_TO_TICKER: Record<string, string> = {
  // Agricultural
  'eaagads': 'EGAD',
  'kakuzi': 'KUKZ',
  'kapchorua tea kenya': 'KAPC',
  'limuru tea': 'LIMT',
  'sasini': 'SASN',
  'williamson tea kenya': 'WTK',
  // Automobiles
  'car general k': 'CGEN',
  // Banking
  'absa bank kenya': 'ABSA',
  'bk group': 'BKG',
  'diamond trust bank kenya': 'DTK',
  'equity group holdings': 'EQTY',
  'hf group': 'HFCK',
  'i m group': 'IMH',
  'kcb group': 'KCB',
  'ncba group': 'NCBA',
  'stanbic holdings': 'SBIC',
  'standard chartered bank kenya': 'SCBK',
  'co-operative bank of kenya': 'COOP',
  'co operative bank of kenya': 'COOP',
  // Commercial & Services
  'deacons east africa': 'XPRS',
  'eveready east africa': 'EVRD',
  'express kenya': 'XPRS',
  'kenya airways': 'KQ',
  'longhorn publishers': 'LKL',
  'nairobi business ventures': 'NBV',
  'nation media group': 'NMG',
  'sameer africa': 'SMER',
  'standard group': 'SGL',
  'tps eastern africa': 'TPSE',
  'uchumi supermarket': 'UCHM',
  'wpp scangroup': 'SCAN',
  // Construction & Allied
  'arm cement': 'ARM',
  'bamburi cement': 'BAMB',
  'crown paints kenya': 'CRWN',
  'e a cables': 'CABL',
  'east african cables': 'CABL',
  'e a portland cement': 'PORT',
  'east african portland cement': 'PORT',
  // Energy & Petroleum
  'kengen': 'KEGN',
  'kenya pipeline company': 'KPC',
  'kenya power lighting': 'KPLC',
  'kenya power lighting 4 pref': 'KPLC',
  'kenya power lighting 7 pref': 'KPLC',
  'totalenergies marketing kenya': 'TOTL',
  'umeme': 'UMME',
  // Insurance
  'britam holdings': 'BRIT',
  'cic insurance group': 'CIC',
  'jubilee holdings': 'JUB',
  'kenya re insurance corporation': 'KNRE',
  'liberty kenya holdings': 'LBTY',
  'sanlam allianz holdings kenya': 'SLAM',
  // Investment
  'centum investment': 'CTUM',
  'home afrika': 'HAFR',
  'kurwitu ventures': 'KURV',
  'olympia capital holdings': 'OCH',
  'trans century': 'TCL',
  'trans-century': 'TCL',
  // Investment Services
  'nairobi securities exchange': 'NSE',
  // Manufacturing
  'b o c kenya': 'BOC',
  'bat kenya': 'BAT',
  'british american tobacco kenya': 'BAT',
  'carbacid investments': 'CARB',
  'east african breweries': 'EABL',
  'mumias sugar': 'MSC',
  'unga group': 'UNGA',
  'africa mega agricorp': 'AMAC',
  'flame tree group holdings': 'FTGH',
  'shri krishana overseas': 'SKL',
  // Telecoms
  'safaricom': 'SCOM',
  // REIT & ETF
  'laptrust imara i reit': 'LAPR',
  'alp industrial real estate investment trust': 'ALP',
  'newgold issuer rp': 'GLD',
  'new gold issuer rp': 'GLD',
  'satrix msci world feeder etf': 'SMWF',
  'satrix msci world feeder': 'SMWF',
}

/**
 * Match a raw NSE company name (possibly including "Ord X.XX" suffix and weird
 * casing) to one of our tickers. Returns null if no match.
 */
export function matchNseNameToTicker(rawName: string): string | null {
  const normalized = normalizeStockName(rawName)
  if (NSE_NAME_TO_TICKER[normalized]) return NSE_NAME_TO_TICKER[normalized]

  // Substring fallback: try every map key against the normalized name. This
  // catches small differences (extra "PLC", trailing tags). Pick the longest
  // matching key to avoid false positives ("group" matching everything).
  let bestKey: string | null = null
  for (const key of Object.keys(NSE_NAME_TO_TICKER)) {
    if (normalized.includes(key) && (!bestKey || key.length > bestKey.length)) {
      bestKey = key
    }
  }
  return bestKey ? NSE_NAME_TO_TICKER[bestKey] : null
}
