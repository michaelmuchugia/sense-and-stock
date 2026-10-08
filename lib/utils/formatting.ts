export function formatKES(value: number, decimals = 2): string {
  return 'KES ' + value.toFixed(decimals)
}

export function formatPercent(value: number, decimals = 2): string {
  const sign = value >= 0 ? '+' : ''
  return sign + value.toFixed(decimals) + '%'
}

export function changeClass(value: number): 'p' | 'n' {
  return value >= 0 ? 'p' : 'n'
}

export function priceOrSuspended(price: number, decimals = 2): string {
  return price > 0 ? 'KES ' + price.toFixed(decimals) : 'Suspended'
}
