import type { Metadata } from 'next'
import { LegalPage, LegalSection } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms that govern your use of Kingston Energies and purchases made through our site.',
}

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="July 2026">
      <p>
        These terms govern your use of the Kingston Energies website and any purchase you make through it. By using the
        site you agree to them.
      </p>

      <LegalSection heading="Orders & pricing">
        <p>
          All prices are shown in the currency displayed at checkout and include applicable taxes unless stated
          otherwise. We may correct pricing errors and cancel affected orders with a full refund. An order is confirmed
          once you receive an order number.
        </p>
      </LegalSection>

      <LegalSection heading="Delivery">
        <p>
          We deliver Kingston-wide. Delivery is free on orders over J$10,000, otherwise a flat J$800 fee applies. Estimated
          delivery times are guidance, not guarantees.
        </p>
      </LegalSection>

      <LegalSection heading="Accounts">
        <p>
          You are responsible for keeping your account credentials secure and for activity under your account. Do not
          use the site for unlawful purposes.
        </p>
      </LegalSection>

      <LegalSection heading="Limitation of liability">
        <p>
          To the fullest extent permitted by law, Kingston Energies is not liable for indirect or consequential losses
          arising from use of the site. Nothing in these terms limits liability that cannot lawfully be limited.
        </p>
      </LegalSection>

      <LegalSection heading="Governing law">
        <p>These terms are governed by the laws of Jamaica.</p>
      </LegalSection>
    </LegalPage>
  )
}
