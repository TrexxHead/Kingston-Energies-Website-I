import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Reveal from '@/components/Reveal'
import Hero from '@/components/home/Hero'
import HeroPromos from '@/components/home/HeroPromos'
import Promos from '@/components/home/Promos'
import Story from '@/components/home/Story'
import ProductChapter from '@/components/home/ProductChapter'
import Lineup from '@/components/home/Lineup'
import Roadmap from '@/components/home/Roadmap'
import Stats from '@/components/home/Stats'
import Reviews from '@/components/home/Reviews'
import FaqTeaser from '@/components/home/FaqTeaser'
import CTA from '@/components/home/CTA'
import { getShopProducts } from '@/lib/products'

// Re-render at most every 2 minutes so newly submitted reviews surface and the
// featured strip reshuffles, without making the marketing homepage fully dynamic.
export const revalidate = 120

// Groupings for the "lineup" category cards — chargers & cables are shown
// together (matching the card's own copy), even though they're two separate
// catalog categories.
const LINEUP_GROUPS: Record<string, string[]> = {
  powerbanks: ['powerbanks'],
  chargers: ['chargers', 'components'],
  accessories: ['accessories'],
  stations: ['stations'],
}

export default async function Home() {
  const products = await getShopProducts()
  const flagship = products.find((p) => p.id === 'pb10')

  const minPriceByGroup: Record<string, number | null> = {}
  for (const [group, cats] of Object.entries(LINEUP_GROUPS)) {
    const inGroup = products.filter((p) => cats.includes(p.cat))
    minPriceByGroup[group] = inGroup.length ? Math.min(...inGroup.map((p) => p.price)) : null
  }
  const stationsFeatured = products.find((p) => p.id === 'st300')

  return (
    <div style={{ fontFamily: 'var(--font-body)', color: '#eaf2ec', background: '#0d1714', minHeight: '100vh' }}>
      <Navbar />
      <main>
        <div style={{ position: 'relative' }}>
          <Hero />
          <HeroPromos />
        </div>
        <Promos />
        <Reveal><Story /></Reveal>
        <Reveal>
          <ProductChapter price={flagship?.price ?? 5500} inStock={flagship?.inStock ?? true} productId={flagship?.id ?? 'pb10'} />
        </Reveal>
        <Reveal>
          <Lineup
            minPrices={minPriceByGroup}
            powerbanksImage={flagship?.image ?? null}
            stationsImage={stationsFeatured?.image ?? null}
          />
        </Reveal>
        <Reveal><Roadmap /></Reveal>
        <Reveal><Stats /></Reveal>
        <Reveal><Reviews /></Reveal>
        <Reveal><FaqTeaser /></Reveal>
        <Reveal><CTA /></Reveal>
      </main>
      <Footer />
    </div>
  )
}
