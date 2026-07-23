import type { Metadata } from 'next'
import { LegalPage, LegalSection } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Warranty & Guarantee',
  description: 'Every Kingston Energies device comes with a 14-day replacement guarantee plus the manufacturer’s warranty. Here’s what that covers.',
}

export default function WarrantyPage() {
  return (
    <LegalPage title="Warranty & Guarantee" updated="July 2026">
      <p>
        Every Kingston Energies device comes with a <strong>14-day replacement guarantee</strong>, plus the{' '}
        <strong>manufacturer&apos;s warranty</strong> that ships with the product. We don&apos;t offer a blanket
        12-month Kingston warranty — instead you get our own 14-day cover on top of whatever the maker provides.
      </p>

      <LegalSection heading="Our 14-day guarantee">
        <p>
          If a device arrives faulty, or fails from a manufacturing defect within 14 days of delivery, we&apos;ll
          replace it or refund you in full at no cost — for example, a battery that won&apos;t hold charge, a port that
          stops working, or a charger that fails electrically. Just reach out with your order number.
        </p>
      </LegalSection>

      <LegalSection heading="Manufacturer's warranty">
        <p>
          After the first 14 days, your device is covered by the manufacturer&apos;s own warranty, which varies by brand
          and product (OtterBox, Anker, UGREEN and others each set their own terms). We&apos;ll happily help you start a
          manufacturer claim — keep your order number and the original packaging where possible.
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
          Register your device in your{' '}
          <a href="/hub" style={{ color: 'var(--ke-green-700)' }}>Kingston Hub</a> to keep your proof of purchase handy
          and earn loyalty points. Hold on to your order number either way.
        </p>
      </LegalSection>

      <LegalSection heading="Making a claim">
        <p>
          Contact us at <a href="mailto:kingstonenergygroup@outlook.com" style={{ color: 'var(--ke-green-700)' }}>kingstonenergygroup@outlook.com</a>{' '}
          or 876-338-9958 with your order number and a description of the issue. We&apos;ll assess it and, where covered,
          replace the device or help you claim with the manufacturer.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
