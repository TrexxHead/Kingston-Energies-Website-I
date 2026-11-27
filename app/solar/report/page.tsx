import type { Metadata } from 'next'
import SolarReport from './SolarReport'

export const metadata: Metadata = {
  title: 'Your rooftop solar estimate',
  robots: { index: false, follow: false },
}

/** Printable solar estimate. The estimate travels in the URL fragment, so it never reaches our server. */
export default function SolarReportPage() {
  return <SolarReport />
}
