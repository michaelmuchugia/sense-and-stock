interface TickerTapeItem {
  sym: string
  price: number
  change: number
}

interface TickerTapeProps {
  items: TickerTapeItem[]
}

/**
 * Server-rendered scrolling ticker at the top of every page.
 * The parent layout passes in resolved stock data so this component
 * stays a pure presentational renderer.
 */
export function TickerTape({ items }: TickerTapeProps) {
  const renderItem = (s: TickerTapeItem, key: number) => (
    <span className="ti" key={key}>
      <b>{s.sym}</b>
      <span>KES {s.price.toFixed(2)}</span>
      <span className={s.change >= 0 ? 'p' : 'n'}>
        {s.change >= 0 ? '+' : ''}{s.change.toFixed(2)}%
      </span>
    </span>
  )

  return (
    <div className="tape">
      <div className="tape-inner">
        {items.map((s, i) => renderItem(s, i))}
        {items.map((s, i) => renderItem(s, i + items.length))}
      </div>
    </div>
  )
}
