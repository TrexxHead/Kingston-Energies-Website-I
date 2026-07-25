import type { Metadata } from 'next'
import { LegalPage, LegalSection } from '@/components/legal/LegalPage'
import { PICKUP_LOCATIONS } from '@/lib/delivery'
import { fmt } from '@/lib/catalog'

export const metadata: Metadata = {
  title: 'Delivery & Rate Sheet',
  description: 'Kingston Energies delivery methods, coverage areas and rates, including Knutsford Express islandwide shipping and free pickup.',
}

const RATE_ROWS: { zone: string; standard: number; express: number; note?: string }[] = [
  { zone: 'Kingston', standard: 800, express: 1500 },
  { zone: 'St. Andrew', standard: 800, express: 1500, note: 'Same rate as Kingston' },
  { zone: 'St. Catherine', standard: 1500, express: 2500 },
  { zone: 'All other parishes', standard: 700, express: 1400, note: 'Via Knutsford Express — see below' },
]

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      style={{
        textAlign: align,
        padding: '0 0 10px',
        borderBottom: '2px solid var(--color-text)',
        fontFamily: 'var(--font-mono)',
        fontSize: 10.5,
        letterSpacing: '.09em',
        textTransform: 'uppercase',
        color: 'var(--color-text-muted)',
      }}
    >
      {children}
    </th>
  )
}

function Td({ children, align = 'left', strong = false }: { children: React.ReactNode; align?: 'left' | 'right'; strong?: boolean }) {
  return (
    <td
      style={{
        textAlign: align,
        padding: '12px 0',
        borderBottom: '1px solid var(--color-border)',
        fontWeight: strong ? 700 : 400,
        color: strong ? 'var(--color-text)' : 'var(--color-text)',
      }}
    >
      {children}
    </td>
  )
}

export default function DeliveryRateSheetPage() {
  return (
    <LegalPage title="Delivery & Rate Sheet" updated="July 2026">
      <p>
        Every order can be delivered by our own courier, shipped islandwide via Knutsford Express, or collected free
        at one of our pickup locations. Rates below are per order, based on the parish you&apos;re shipping to and
        how fast you need it.
      </p>

      <LegalSection heading="Rate table">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15, minWidth: 420 }}>
            <thead>
              <tr>
                <Th>Parish / area</Th>
                <Th align="right">Standard</Th>
                <Th align="right">Express</Th>
              </tr>
            </thead>
            <tbody>
              {RATE_ROWS.map((r) => (
                <tr key={r.zone}>
                  <Td strong>
                    {r.zone}
                    {r.note && (
                      <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', fontWeight: 400, marginTop: 2 }}>{r.note}</div>
                    )}
                  </Td>
                  <Td align="right">{fmt(r.standard)}</Td>
                  <Td align="right">{fmt(r.express)}</Td>
                </tr>
              ))}
              <tr>
                <Td strong>Pickup — any location below</Td>
                <Td align="right" strong>
                  Free
                </Td>
                <Td align="right" strong>
                  Free
                </Td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', marginTop: 12 }}>
          Standard delivers in 1–3 business days (1–2 days via Knutsford Express); Express is next-day. Rates are shown
          and charged automatically at checkout once you select your parish and delivery method.
        </p>
      </LegalSection>

      <LegalSection heading="Kingston & St. Andrew — direct courier">
        <p>
          Orders shipping within Kingston or St. Andrew are delivered by our own courier. Standard delivery is{' '}
          {fmt(800)} (1–3 days); Express is {fmt(1500)} (next day). St. Andrew is priced identically to Kingston.
        </p>
      </LegalSection>

      <LegalSection heading="St. Catherine — direct courier">
        <p>
          Orders shipping to St. Catherine are also delivered by our own courier. Standard delivery is {fmt(1500)}{' '}
          (1–3 days); Express is {fmt(2500)} (next day).
        </p>
      </LegalSection>

      <LegalSection heading="Islandwide — Knutsford Express">
        <p>
          Orders shipping to any other parish (Clarendon, Manchester, St. James, and the rest of the island) travel
          via <strong>Knutsford Express</strong>, Jamaica&apos;s islandwide coach/courier network. You collect your
          package at your nearest Knutsford Express location and pay a clearance fee directly to Knutsford at pickup:{' '}
          {fmt(700)} for standard shipping, or {fmt(1400)} for their express/priority service. This fee is charged as
          part of your order total, and Knutsford will have your parcel ready for collection once it clears at their
          depot.
        </p>
      </LegalSection>

      <LegalSection heading="Free pickup">
        <p>Skip delivery entirely and collect your order, free, from either of these locations:</p>
        <ul style={{ margin: '10px 0 0', paddingLeft: 20, lineHeight: 1.8 }}>
          {PICKUP_LOCATIONS.map((loc) => (
            <li key={loc.name}>
              <strong>{loc.name}</strong> — {loc.address}
            </li>
          ))}
        </ul>
        <p style={{ marginTop: 10 }}>
          We&apos;ll notify you by email/phone once your order is ready for collection — usually the same day it&apos;s
          placed.
        </p>
      </LegalSection>

      <LegalSection heading="Delivery times">
        <p>
          Standard and Express timeframes above are estimates from when your order is confirmed, not from when it&apos;s
          placed — orders paid by bank transfer, Lynk or PayPal are confirmed once we&apos;ve matched your payment to
          your order number. Card payments are confirmed instantly.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
