import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Reveal from '@/app/_design-system/Reveal'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbs } from '@/lib/structuredData'
import { getShopProducts } from '@/lib/products'
import BackInStockList from './BackInStockList'

export const metadata = {
  title: 'Back in stock: Kingston Energies',
  description: 'Sold out for now — join the waitlist and we’ll email you the moment it’s back.',
}

const breadcrumbs = buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Back in stock' }])

const overline = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  letterSpacing: '.3em',
  color: 'var(--ke-green-400)',
} as const

export default async function BackInStockPage() {
  const products = await getShopProducts()
  const soldOut = products.filter((p) => p.inStock === false)

  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--ke-dark-text)', background: 'var(--ke-dark-bg)', minHeight: '100vh' }}>
      <JsonLd data={breadcrumbs} />
      <Navbar />
      <main style={{ paddingTop: 64 }}>
        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '96px 32px 48px' }}>
          <Reveal>
            <div style={overline}>BACK IN STOCK</div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 'clamp(40px,7vw,72px)',
                lineHeight: 1.02,
                letterSpacing: '-.03em',
                color: '#fff',
                margin: '18px 0 0',
                maxWidth: 780,
              }}
            >
              Sold out now, not for long.
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.65, color: 'rgba(234,242,236,.72)', margin: '24px 0 0', maxWidth: 600 }}>
              Leave your email on any sold-out item below and we&apos;ll notify you the moment it&apos;s back — no spam,
              one message, right when it lands.
            </p>
          </Reveal>
        </section>

        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px 96px' }}>
          {soldOut.length === 0 ? (
            <Reveal>
              <div
                style={{
                  background: 'var(--ke-dark-card)',
                  border: '1px solid var(--ke-dark-hairline)',
                  borderRadius: 20,
                  padding: 48,
                  textAlign: 'center',
                }}
              >
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: '#fff', margin: 0 }}>
                  Everything&apos;s in stock right now.
                </p>
                <p style={{ fontSize: 15, color: 'rgba(234,242,236,.6)', margin: '10px 0 0' }}>
                  Good time to shop — check back here if that ever changes.
                </p>
              </div>
            </Reveal>
          ) : (
            <BackInStockList
              products={soldOut.map((p) => ({ id: p.id, name: p.name, spec: p.spec, price: p.price, image: p.image }))}
            />
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}
