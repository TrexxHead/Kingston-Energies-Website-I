import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbs } from '@/lib/structuredData'
import { getStormPrepContent } from '@/lib/stormPrepContent'
import StormWatch from './_components/StormWatch'
import BackupRuntime from './_components/BackupRuntime'
import Shelters from './_components/Shelters'
import StormChecklist from './_components/StormChecklist'
import { STORM_READY_CSS } from './_components/styles'

export const metadata = {
  title: 'Storm ready: hurricanes, shelters and backup power in Jamaica',
  description: 'Active Atlantic storms from the National Hurricane Center, emergency shelters, how long your battery backup will last, and a power checklist for hurricane season.',
}

// Checklist content is admin-editable; refresh it at most every 10 minutes.
export const revalidate = 600

const breadcrumbs = buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Storm ready' }])

// Widely published safety guidance (ODPEM, JPS, US CDC on carbon monoxide).
const SAFETY = [
  { h: 'Generators', items: ['Run a generator outdoors only — never in a house, garage or on a veranda near open windows. Exhaust carbon monoxide can kill without warning.', 'Never connect a generator to your house wiring without a proper transfer switch installed by a licensed electrician — it can back-feed the lines and kill line workers.', 'Turn it off and let it cool before refuelling.'] },
  { h: 'After the storm', items: ['Stay away from downed or low-hanging power lines and anything touching them, including water. Report them to JPS.', 'Don’t switch on equipment that got wet until an electrician has checked it.', 'Turn off large appliances before the power returns, then switch them back on one at a time.'] },
]

export default async function StormReadyPage() {
  const content = await getStormPrepContent()
  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--ke-dark-text)', background: 'var(--ke-dark-bg)', minHeight: '100vh' }}>
      <JsonLd data={breadcrumbs} />
      <style>{STORM_READY_CSS}</style>
      <Navbar />
      <main style={{ paddingTop: 64 }}>
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 20px 28px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '.3em', color: 'var(--ke-green-400)' }}>STORM READY</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(34px,6vw,56px)', lineHeight: 1.04, letterSpacing: '-.03em', color: '#fff', margin: '16px 0 0' }}>
            Ready before the lights go out
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: 'rgba(234,242,236,.72)', margin: '18px 0 0', maxWidth: 680 }}>
            What’s out in the Atlantic, where the shelters are, how long your backup power will last, and what to charge before the storm. For watches and warnings, always follow the Meteorological Service and ODPEM.
          </p>
        </section>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 80px', display: 'grid', gap: 20 }}>
          <StormWatch />
          <BackupRuntime />
          <div className="ke-sr-two">
            <StormChecklist items={content.checklist} />
            <section className="ke-sr-safety" aria-labelledby="sf-title">
              <h2 id="sf-title" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: '#fff', margin: 0 }}>
                Electrical safety
              </h2>
              {SAFETY.map((g) => (
                <div key={g.h}>
                  <h3 className="ke-sr-h3">{g.h}</h3>
                  <ul>
                    {g.items.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          </div>
          <Shelters />
        </div>
      </main>
      <Footer />
    </div>
  )
}
