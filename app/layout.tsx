import type { Metadata } from 'next'
import './globals.css'
import './_design-system/tokens.css'
import Providers from '@/components/Providers'
import Camille from '@/components/camille/DeferredCamille'
import CookieConsent from '@/components/CookieConsent'
import CampaignClickCapture from '@/components/CampaignClickCapture'
import AnnouncementBar from '@/components/AnnouncementBar'
import JsonLd from '@/components/JsonLd'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import { WebVitals } from '@/components/WebVitals'
import StorefrontTheme from '@/components/StorefrontTheme'
import { siteGraph } from '@/lib/structuredData'
import { keFontVariables } from './_design-system/fonts'

// Runs during HTML parsing, before first paint — pins <html> to the light
// theme unless this is an admin route (which sets its own data-theme via
// ThemeToggle). Without this, a customer's OS dark mode alone flips
// `color-scheme` to dark site-wide, and any text relying on the browser's
// unstyled default color renders near-white on the storefront's light
// backgrounds. StorefrontTheme (mounted below) covers client-side
// navigation; this covers the first, server-rendered paint.
const storefrontThemeInitScript = `(function(){try{if(!location.pathname.startsWith('/admin')){document.documentElement.setAttribute('data-theme','light')}}catch(e){}})()`

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Kingston Energies: Portable Power, Built in Kingston',
    template: '%s · Kingston Energies',
  },
  description:
    'Premium portable power for everyone: power banks, fast chargers, cables and power stations, built in Kingston, Jamaica. Free delivery over J$10,000, 14-day replacement guarantee.',
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
    title: 'Kingston Energies: Portable Power, Built in Kingston',
    description:
      'Premium portable power for everyone: power banks, fast chargers and power stations, built in Kingston, Jamaica.',
    url: siteUrl,
    locale: 'en_JM',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kingston Energies: Portable Power, Built in Kingston',
    description: 'Premium portable power for everyone, built in Kingston, Jamaica.',
  },
  robots: { index: true, follow: true },
  // Google Search Console's "HTML tag" verification method — paste the
  // content value it gives you (Settings → Ownership verification) into
  // NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION. Renders nothing until it's set.
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${keFontVariables} ke-root`}
        style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <script dangerouslySetInnerHTML={{ __html: storefrontThemeInitScript }} />
        {/* Organization + WebSite — on every page, so Google always has a
            stable answer for who runs the site, independent of which page
            it crawled first. */}
        <JsonLd data={siteGraph()} />
        <Providers>
          <AnnouncementBar />
          {children}
          <Camille />
          <CampaignClickCapture />
          <CookieConsent />
          <GoogleAnalytics />
          <WebVitals />
          <StorefrontTheme />
        </Providers>
      </body>
    </html>
  )
}
