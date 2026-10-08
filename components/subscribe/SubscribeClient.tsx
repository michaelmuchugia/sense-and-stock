'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Phase = 'idle' | 'starting' | 'waiting' | 'success' | 'failed'

interface Props {
  defaultPhone: string
  configured: boolean
  renew?: boolean
}

export function SubscribeClient({ defaultPhone, configured, renew = false }: Props) {
  const router = useRouter()
  const [phone, setPhone] = useState(defaultPhone)
  const [phase, setPhase] = useState<Phase>('idle')
  const [message, setMessage] = useState('')
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function stopPolling() {
    if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null }
  }

  async function poll(checkoutRequestId: string, triesLeft: number) {
    if (triesLeft <= 0) {
      setPhase('failed')
      setMessage('We did not get a confirmation in time. If you approved the prompt, your Plus will activate shortly. Otherwise try again.')
      return
    }
    try {
      const res = await fetch(`/api/mpesa/status?checkoutRequestId=${encodeURIComponent(checkoutRequestId)}`, { cache: 'no-store' })
      const data = await res.json()
      if (data.status === 'success') {
        setPhase('success')
        setMessage('Payment received. Plus is now active.')
        router.refresh()
        return
      }
      if (data.status === 'failed' || data.status === 'cancelled') {
        setPhase('failed')
        setMessage(data.status === 'cancelled' ? 'The prompt was cancelled. You were not charged.' : (data.note || 'The payment did not go through. You were not charged.'))
        return
      }
    } catch {
      // transient; keep polling
    }
    pollRef.current = setTimeout(() => poll(checkoutRequestId, triesLeft - 1), 3000)
  }

  async function startPayment() {
    stopPolling()
    setPhase('starting')
    setMessage('')
    try {
      const res = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setPhase('failed')
        setMessage(data.error ?? 'Could not start the payment. Please try again.')
        return
      }
      setPhase('waiting')
      setMessage(data.message ?? 'Check your phone and enter your M-Pesa PIN.')
      poll(data.checkoutRequestId, 30) // ~90 seconds
    } catch {
      setPhase('failed')
      setMessage('Network problem. Please try again.')
    }
  }

  if (!configured) {
    return <p role="status" style={{ color: 'var(--txd)' }}>M-Pesa payments are being set up. Please check back shortly.</p>
  }

  if (phase === 'success') {
    return (
      <div role="status">
        <p style={{ color: 'var(--g)', fontWeight: 600 }}>{message}</p>
        <a className="plan-action primary" href="/account">Go to your account</a>
      </div>
    )
  }

  const busy = phase === 'starting' || phase === 'waiting'

  return (
    <div>
      <label htmlFor="mpesa-phone" style={{ display: 'block', fontSize: 13, color: 'var(--txd)', marginBottom: 6 }}>Safaricom number</label>
      <input
        id="mpesa-phone"
        className="nl-input"
        type="tel"
        inputMode="numeric"
        placeholder="07XX XXX XXX"
        value={phone}
        disabled={busy}
        onChange={e => setPhone(e.target.value)}
        style={{ width: '100%', maxWidth: 320 }}
      />
      <div style={{ marginTop: 16 }}>
        <button type="button" className="plan-action primary" onClick={startPayment} disabled={busy || phone.trim().length < 9} style={{ maxWidth: 320 }}>
          {phase === 'starting' ? 'Starting...' : phase === 'waiting' ? 'Waiting for your approval...' : renew ? 'Renew Plus for KES 750' : 'Pay KES 750 with M-Pesa'}
        </button>
      </div>
      {message && (
        <p role="status" style={{ marginTop: 14, color: phase === 'failed' ? '#ff7a8e' : 'var(--txd)', fontSize: 14, lineHeight: 1.6 }}>
          {message}
        </p>
      )}
      {phase === 'waiting' && (
        <p style={{ marginTop: 6, color: 'var(--txdd)', fontSize: 12 }}>A prompt was sent to {phone}. Enter your PIN to confirm.</p>
      )}
    </div>
  )
}
