'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'

const TOPICS = [
  'General inquiry',
  'Media inquiry',
  'Data & coverage',
  'Technical support',
  'Partnership',
  'Something else',
] as const

export function ContactForm() {
  const { user } = useUser()
  const prefillEmail = user?.primaryEmailAddress?.emailAddress ?? ''

  const [message, setMessage] = useState('')
  const [email, setEmail] = useState(prefillEmail)
  const [topic, setTopic] = useState<string>('')
  const [company, setCompany] = useState('') // honeypot
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'sending') return
    setError(null)

    if (!topic) { setError('Please choose a topic.'); return }
    if (message.trim().length < 5) { setError('Please write a bit more in your message.'); return }

    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), topic, message: message.trim(), company }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Could not send your message.')
      }
      setStatus('sent')
      setMessage('')
      setTopic('')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Could not send your message.')
    }
  }

  if (status === 'sent') {
    return (
      <div className="contact-card">
        <div className="contact-success">
          <div className="contact-success-title">Message sent</div>
          <p>Thanks for reaching out. We&apos;ll get back to you at <strong>{email}</strong> as soon as we can.</p>
          <button type="button" className="bg" onClick={() => setStatus('idle')} style={{ marginTop: 12 }}>
            Send another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="contact-card">
      <form onSubmit={handleSubmit}>
        {error && <div className="auth-error" role="alert">{error}</div>}

        <div className="contact-field">
          <label className="auth-label" htmlFor="message">Message</label>
          <textarea
            id="message"
            className="contact-textarea"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="How can we help you?"
            maxLength={5000}
            rows={6}
            required
          />
        </div>

        <div className="contact-field">
          <label className="auth-label" htmlFor="email">Your email</label>
          <input
            id="email"
            className="auth-input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="contact-field">
          <label className="auth-label" htmlFor="topic">Topic</label>
          <select
            id="topic"
            className="contact-select"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            required
          >
            <option value="" disabled>Your topic</option>
            {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Honeypot — hidden from users, catches bots */}
        <input
          type="text"
          name="company"
          value={company}
          onChange={e => setCompany(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
        />

        <button type="submit" className="auth-submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending...' : 'Send message'}
        </button>
      </form>
    </div>
  )
}
