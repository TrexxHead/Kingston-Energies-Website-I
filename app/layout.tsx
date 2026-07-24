import type { Metadata } from 'next'
import './globals.css'
import './_design-system/tokens.css'
import Providers from '@/components/Providers'
import Camille from '@/components/camille/Camille'
import CookieConsent from '@/components/CookieConsent'
import AnnouncementBar from '@/components/AnnouncementBar'
import { keFontVariables } from './_design-system/fonts'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Kingston Energies — Portable Power, Built in Kingston',
    template: '%s · Kingston Energies',
  },
  description:
    'Premium portable power for everyone — power banks, fast chargers, cables and power stations, built in Kingston, Jamaica. Free delivery over J$10,000, 14-day replacement guarantee.',
  keywords: [
    'Kingston Energies',
    'power bank Jamaica',
    'portable charger Kingston',
    'fast charger',
    'power station',
    'USB-C charger',
    'solar power Jamaica',
  ],
  applicationName: 'Kingston Energies',
  authors: [{ name: 'Kingston Energies' }],
  openGraph: {
    type: 'website',
    siteName: 'Kingston Energies',
    title: 'Kingston Energies — Portable Power, Built in Kingston',
    description:
      'Premium portable power for everyone — power banks, fast chargers and power stations, built in Kingston, Jamaica.',
    url: siteUrl,
    locale: 'en_JM',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kingston Energies — Portable Power, Built in Kingston',
    description: 'Premium portable power for everyone, built in Kingston, Jamaica.',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${keFontVariables} ke-root bg-light text-dark`}>
        <Providers>
          <AnnouncementBar />
          {children}
          <Camille />
          <CookieConsent />
        </Providers>
      </body>
    </html>
  )
}
