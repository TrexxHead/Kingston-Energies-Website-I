import type { MetadataRoute } from 'next'

/**
 * Makes the site installable (Add to Home Screen) — primarily so Storm prep
 * can be opened straight from a phone's home screen during an outage,
 * without hunting for a browser tab or typing the URL from memory.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kingston Energies',
    short_name: 'Kingston Energies',
    description: 'Portable power, backup kits, and storm-prep tools for Jamaica.',
    start_url: '/hub/storm-prep',
    display: 'standalone',
    background_color: '#0d1714',
    theme_color: '#1f6b45',
    icons: [{ src: '/icon.png', sizes: '701x701', type: 'image/png' }],
  }
}
