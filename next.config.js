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
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com",
  "frame-src 'self' https://jm.wipayfinancial.com https://accounts.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "form-action 'self' https://jm.wipayfinancial.com",
  'upgrade-insecure-requests',
].join('; ')

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
