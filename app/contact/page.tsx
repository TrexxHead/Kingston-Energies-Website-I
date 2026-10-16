import type { Metadata } from 'next'
import ContactForm from './ContactForm'

export const metadata: Metadata = {
  title: 'Contact us',
  description: 'Get in touch with Kingston Energies — ask a question, request a quote, or start a bulk order for power banks, chargers and accessories.',
}

export default function ContactPage() {
  return <ContactForm />
}
