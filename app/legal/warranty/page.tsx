import type { Metadata } from 'next'
import { LegalPage, LegalSection } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Warranty',
  description: 'Every Kingston Energies device is covered by a 12-month warranty. Here is what that covers.',
}

export default function WarrantyPage() {
  return (
    <LegalPage title="12-Month Warranty" updated="July 2026">
      <p>
        Every Kingston Energies device is covered by a 12-month warranty against manufacturing defects, starting from
        the delivery date.
      </p>

      <LegalSection heading="What's covered">
        <p>
          Defects in materials and workmanship under normal use — for example, a battery that fails to hold charge, a
          port that stops working, or a charger that fails electrically.
        </p>
      </LegalSection>

      <LegalSection heading="What's not covered">
        <p>
          Accidental damage, water damage (beyond a product&apos;s stated rating), normal wear, cosmetic marks, and
          damage from misuse or unauthorised repairs.
        </p>
      </LegalSection>

      <LegalSection heading="Register your device">
        <p>
          Activate your cover and earn loyalty points by registering your device in your{' '}
          <a href="/hub" style={{ color: 'var(--ke-green-700)' }}>Kingston Hub</a>. Keep your order number as proof of
          purchase.
        </p>
      </LegalSection>

      <LegalSection heading="Making a claim">
        <p>
          Contact us at <a href="mailto:kingstonenergygroup@outlook.com" style={{ color: 'var(--ke-green-700)' }}>kingstonenergygroup@outlook.com</a>{' '}
          or 876-338-9958 with your order number and a description of the issue. We&apos;ll assess it and, where covered,
          repair or replace the device.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
