'use client'

import { useState } from 'react'

interface Perspective {
  cat: 'an' | 'dd' | 'dn'
  catL: string
  title: string
  exc: string
  date: string
  rt: string
}

interface FaqItem {
  q: string
  a: string
}

interface PerspectivesClientProps {
  perspectives: Perspective[]
  faqs: FaqItem[]
}

export function PerspectivesClient({ perspectives, faqs }: PerspectivesClientProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  return (
    <>
      <div className="pg">
        {perspectives.map((p, i) => (
          <div key={i} className="pc">
            <span className={`pcat ${p.cat}`}>{p.catL}</span>
            <div className="ptit">{p.title}</div>
            <div className="pex">{p.exc}</div>
            <div className="pft">
              <span>{p.date} · {p.rt} read</span>
              <a>Read →</a>
            </div>
          </div>
        ))}
      </div>

      <div className="shdr" style={{ paddingTop: 8 }}>
        <div className="sht">Frequently Asked Questions</div>
      </div>
      <div className="fl">
        {faqs.map((f, i) => {
          const isOpen = openFaq === i
          return (
            <div key={i} className="fi">
              <button
                type="button"
                className="fq"
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', color: 'inherit', font: 'inherit' }}
                onClick={() => setOpenFaq(isOpen ? null : i)}
                aria-expanded={isOpen}
              >
                <span>{f.q}</span>
                <span>{isOpen ? '−' : '+'}</span>
              </button>
              <div className={isOpen ? 'fa open' : 'fa'}>
                <p>{f.a}</p>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
