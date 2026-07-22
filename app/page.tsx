import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Hero from '@/components/home/Hero'
import Story from '@/components/home/Story'
import ProductChapter from '@/components/home/ProductChapter'
import Lineup from '@/components/home/Lineup'
import Roadmap from '@/components/home/Roadmap'
import Stats from '@/components/home/Stats'
import Reviews from '@/components/home/Reviews'
import CTA from '@/components/home/CTA'

// Re-render at most every 2 minutes so newly submitted reviews surface and the
// featured strip reshuffles, without making the marketing homepage fully dynamic.
export const revalidate = 120

export default function Home() {
  return (
    <div style={{ fontFamily: 'var(--font-body)', color: '#eaf2ec', background: '#0d1714', minHeight: '100vh' }}>
      <Navbar />
      <main>
        <Hero />
        <Story />
        <ProductChapter />
        <Lineup />
        <Roadmap />
        <Stats />
        <Reviews />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
