'use client'

import { useState } from 'react'
import { useToast } from '@/components/layout/Toast'

export function NewsletterSection() {
  const [email, setEmail] = useState('')
  const { showToast } = useToast()

  function subscribe() {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Please enter a valid email address.')
      return
    }
    showToast('You are subscribed. The Sense&Stock Weekly lands every Monday.')
    setEmail('')
  }

  return (
    <div className="nl-section">
      <h2>Stay Ahead of the <em>NSE Research Cycle</em></h2>
      <p>Get the Sense&Stock Weekly. Analyst moves, price target changes, and accuracy updates, every Monday.</p>
      <div className="nl-form">
        <input
          className="nl-input"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Your email address"
        />
        <button type="button" className="bp" onClick={subscribe}>Subscribe</button>
      </div>
    </div>
  )
}
