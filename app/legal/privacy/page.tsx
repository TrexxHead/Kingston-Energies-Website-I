import type { Metadata } from 'next'
import { LegalPage, LegalSection } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Kingston Energies collects, uses and protects your personal information.',
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 2026">
      <p>
        This policy explains what information Kingston Energies collects when you use our website and services, why we
        collect it, and the choices you have. We are based in Kingston, Jamaica.
      </p>

      <LegalSection heading="Information we collect">
        <p>
          We collect information you provide directly — your name, email, phone number, and delivery address when you
          create an account, place an order, or request a quote. We also collect limited technical data (device and
          browser type, pages viewed) to operate and improve the site.
        </p>
      </LegalSection>

      <LegalSection heading="How we use it">
        <p>
          To process and deliver orders, provide customer support, activate warranties, send order updates, and — where
          you&apos;ve opted in — occasional product news. We do not sell your personal information.
        </p>
      </LegalSection>

      <LegalSection heading="Payment data">
        <p>
          Card payments are processed by our payment provider. We never store full card numbers on our own servers.
        </p>
      </LegalSection>

      <LegalSection heading="Cookies">
        <p>
          We use essential cookies to keep you signed in and to remember your cart. You can control cookies through your
          browser settings.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          You can request access to, correction of, or deletion of your personal data at any time by contacting us. You
          may also close your account from your Kingston Hub.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
