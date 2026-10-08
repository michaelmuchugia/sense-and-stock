import type { Metadata } from 'next'
import { ContactForm } from '@/components/contact/ContactForm'

export const metadata: Metadata = {
  title: 'Contact Sense&Stock',
  description: 'Get in touch with the Sense&Stock team.',
}

export default function ContactPage() {
  return (
    <div className="C pb40" style={{ maxWidth: 760 }}>
      <div style={{ textAlign: 'center', paddingTop: 48 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: 32, fontWeight: 800 }}>Get in touch</h1>
        <p style={{ color: 'var(--txd)', fontSize: 14, marginTop: 8 }}>
          We&apos;re Sense&Stock. How can we help you?
        </p>
      </div>
      <ContactForm />
    </div>
  )
}
