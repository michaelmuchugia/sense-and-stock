'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/components/layout/Toast'

interface AlertModalProps {
  open: boolean
  onClose: () => void
  symbol?: string | null
}

export function AlertModal({ open, onClose, symbol }: AlertModalProps) {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [opts, setOpts] = useState({
    signalChanges: true,
    newTarget: false,
    ratingChange: false,
    weeklyDigest: false,
  })
  const { showToast } = useToast()

  useEffect(() => {
    if (open) {
      setEmail('')
      setPhone('')
    }
  }, [open])

  function submit() {
    if (!email && !phone) {
      showToast('Please enter an email or phone number')
      return
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Please enter a valid email address')
      return
    }
    onClose()
    showToast('Alert set! We will notify ' + (email || phone) + ' when criteria change.')
  }

  function toggleOpt(key: keyof typeof opts) {
    setOpts(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const sub = symbol
    ? `Get notified when analyst criteria change for ${symbol}.`
    : 'Get notified when any watchlist stock criteria changes.'

  return (
    <div className={`mo${open ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="mbox">
        <button type="button" className="mx" onClick={onClose}>×</button>
        <h3>Save &amp; Set Alert</h3>
        <p>{sub}</p>
        <input
          className="mi"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email address"
        />
        <input
          className="mi"
          type="text"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="Phone +254... (optional)"
        />
        <div style={{ fontSize: 11, color: 'var(--txdd)', fontFamily: 'var(--fm)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
          Alert me when:
        </div>
        {([
          ['signalChanges', 'Signal changes'],
          ['newTarget', 'New price target issued'],
          ['ratingChange', 'Rating upgraded or downgraded'],
          ['weeklyDigest', 'Weekly digest'],
        ] as const).map(([key, label]) => (
          <div
            key={key}
            className={'mopt' + (opts[key] ? ' sel' : '')}
            onClick={() => toggleOpt(key)}
          >
            <div className="mck">{opts[key] ? '✓' : ''}</div>
            <span>{label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 9, marginTop: 12 }}>
          <button type="button" className="bp" style={{ flex: 1 }} onClick={submit}>Save &amp; Activate Alert</button>
          <button type="button" className="bg" onClick={onClose}>Cancel</button>
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--txdd)', marginTop: 10, lineHeight: 1.5 }}>
          Sense&Stock alerts are informational notifications based on published analyst data. They do not constitute financial advice. You can unsubscribe at any time by replying STOP to any SMS or clicking unsubscribe in any email.
        </div>
      </div>
    </div>
  )
}
