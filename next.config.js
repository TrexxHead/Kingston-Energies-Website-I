// Baseline hardening headers — not a nonce-based strict CSP (this app relies on
// inline style props throughout and Next's own hydration scripts), but blocks
// framing/clickjacking, MIME sniffing, and restricts fetch/connect targets to
// the services we actually call.
//
// 'unsafe-eval' and the api.anthropic.com / *.supabase.co connect-src entries
// were removed in the 2026-07 security review: nothing in this codebase calls
// eval/new Function, and both origins are only ever called from server-side
// route handlers — the browser never talks to either directly, so allowing
// them in connect-src (a directive that only matters for browser
// fetch/XHR/WebSocket) served no purpose and was pure attack surface.
// Hosts the Kingston Energies map (MapLibre + OpenStreetMap tiles + terrain)
// fetches from. Mirrors lib/map/openStyle.ts: OpenFreeMap and AWS Terrain
// Tiles by default, or the hosts set in NEXT_PUBLIC_OPEN_MAP_TILES_URL /
// _GLYPHS_URL / _TERRAIN_URL ("off" disables).
function openMapOrigins() {
  const pick = (raw, fallback) => {
    const v = (raw || '').trim()
    if (v.toLowerCase() === 'off') return null
    return v || fallback
  }
  const urls = [
    pick(process.env.NEXT_PUBLIC_OPEN_MAP_TILES_URL, 'https://tiles.openfreemap.org/planet'),
    pick(process.env.NEXT_PUBLIC_OPEN_MAP_GLYPHS_URL, ''),
    pick(process.env.NEXT_PUBLIC_OPEN_MAP_TERRAIN_URL, 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'),
  ]
  return [...new Set(urls.filter((u) => u && /^https:\/\//.test(u)).map((u) => new URL(u.replace(/\{[^}]+\}/g, 'x')).origin))]
}

function buildCsp({ googleMaps = false } = {}) {
  // Google's allowlist for the Maps JavaScript API includes 'unsafe-eval' and
  // blob: workers; it is granted on the map page only, never site-wide.
  const maps = googleMaps ? " 'unsafe-eval' blob: https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.ggpht.com" : ''
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com" + maps,
    "style-src 'self' 'unsafe-inline'" + (googleMaps ? ' https://fonts.googleapis.com' : ''),
    "img-src 'self' https: data: blob:",
    "font-src 'self' data:" + (googleMaps ? ' https://fonts.gstatic.com' : ''),
    "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com" + (googleMaps ? ' https://*.googleapis.com https://*.gstatic.com https://*.google.com data: blob: ' + openMapOrigins().join(' ') : ''),
    "frame-src 'self' https://jm.wipayfinancial.com https://accounts.google.com" + (googleMaps ? ' https://*.google.com' : ''),
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    "worker-src 'self'" + (googleMaps ? ' blob:' : ''),
    "manifest-src 'self'",
    "form-action 'self' https://jm.wipayfinancial.com",
    'upgrade-insecure-requests',
  ].join('; ')
}
const csp = buildCsp()
// The Jamaica Energy Map page alone loads the Google Maps JavaScript API and
// OpenStreetMap vector tiles for the Kingston Energies map, and may ask (on a
// tap of "Nearby") for the visitor's location — so only that route widens
// script/connect sources and allows same-origin geolocation.
const mapCsp = buildCsp({ googleMaps: true })

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://jm.wipayfinancial.com")' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Stop advertising the framework in responses — real, one-line fix from
  // the same review (ZAP: "X-Powered-By: Next.js" disclosure, CWE-497).
  poweredByHeader: false,
  images: {
    remotePatterns: [
      // Public product images served from Supabase Storage.
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Later rules override earlier ones for the same header key.
      {
        source: '/energy-map',
        headers: [
          { key: 'Content-Security-Policy', value: mapCsp },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
        ],
      },
      // MapLibre fetches street tiles from inside its web worker, and a worker
      // runs under its own script's CSP — so the worker files need the map
      // policy too, or every tile request is silently blocked.
      {
        source: '/maps/vendor/:path*',
        headers: [{ key: 'Content-Security-Policy', value: mapCsp }],
      },
      // Order/account/admin pages carry another person's data if a shared or
      // CDN cache ever stored a response for them — never let that happen.
      {
        source: '/(track|hub|admin|cart)(/.*)?',
        headers: [{ key: 'Cache-Control', value: 'private, no-cache, no-store, must-revalidate' }],
      },
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ]
  },
}

module.exports = nextConfig
