import type { Metadata } from 'next'
import { LegalPage, LegalSection } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Returns & Refunds',
  description: 'How to return a Kingston Energies product and how refunds are handled.',
}

export default function ReturnsPage() {
  return (
    <LegalPage title="Returns & Refunds" updated="July 2026">
      <p>
        We want you to be happy with your purchase. If something isn&apos;t right, here&apos;s how returns and refunds
        work.
      </p>

      <LegalSection heading="14-day returns">
        <p>
          You may return most items within 14 days of delivery for a refund or exchange, provided they are unused, in
          original condition, and in their original packaging. Some items (e.g. opened cables for hygiene/safety
          reasons) may be non-returnable unless faulty.
        </p>
      </LegalSection>

      <LegalSection heading="Faulty or damaged items">
        <p>
          If an item arrives faulty or damaged, contact us within 48 hours of delivery and we&apos;ll arrange a
          replacement or full refund at no cost to you. This is in addition to your rights under the 12-month warranty.
        </p>
      </LegalSection>

      <LegalSection heading="How to start a return">
        <p>
          Email <a href="mailto:kingstonenergygroup@outlook.com" style={{ color: 'var(--ke-green-700)' }}>kingstonenergygroup@outlook.com</a>{' '}
          with your order number and reason, or call 876-338-9958. We&apos;ll confirm the return address and next steps.
        </p>
      </LegalSection>

      <LegalSection heading="Refund timing">
        <p>
          Once we receive and inspect your return, refunds are issued to your original payment method, typically within
          5–10 business days.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
