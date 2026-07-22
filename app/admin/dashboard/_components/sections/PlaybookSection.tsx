'use client'

import { useState } from 'react'
import { cardStyle, h3Style } from '../ui/card'
import { VALUE_TIERS, CUSTOMER_NEEDS, type ValueTier } from '@/lib/crm'

/**
 * Service Playbook — the customer-centric guide distilled from the MGMT 3069
 * course material (IDIC, SERVQUAL/RATER, service culture, customer value,
 * complaints & guarantees). Doubles as the staff-facing policy reference and
 * documents how each framework is wired into this platform.
 */

interface Section {
  id: string
  title: string
  intro: string
  body: React.ReactNode
}

export default function PlaybookSection() {
  const [open, setOpen] = useState<string>('idic')

  const sections: Section[] = [
    {
      id: 'idic',
      title: 'IDIC — our CRM backbone',
      intro: 'Peppers & Rogers’ four-stage model. Treat different customers differently, and let every interaction teach us more.',
      body: (
        <Steps
          items={[
            ['Identify', 'Know who each customer is — capture their contact details and their primary need (see below). Live on signup, checkout and the Hub profile.'],
            ['Differentiate', 'Rank customers by value and need. The Customers tab auto-tags each into a value tier from their order history.'],
            ['Interact', 'Learn through every touchpoint. We collect an NPS score after each order and after a Jordyn chat (Analytics tab).'],
            ['Customize', 'Act on what we learn — the Hub tailors product recommendations to each customer’s stated need.'],
          ]}
        />
      ),
    },
    {
      id: 'needs',
      title: 'Customer needs (Identify)',
      intro: 'Every customer is asked what they mainly need power for. Use it to guide recommendations and conversations.',
      body: (
        <ul style={listStyle}>
          {CUSTOMER_NEEDS.map((n) => (
            <li key={n.id} style={liStyle}>
              <strong>{n.label}</strong> — {n.detail}
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: 'tiers',
      title: 'Value tiers (Differentiate)',
      intro: 'From "The Value of Customers": customers differ by Actual Value and Growth Potential. Each tier gets a different strategy.',
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(Object.keys(VALUE_TIERS) as ValueTier[]).map((t) => (
            <div key={t} style={rowStyle}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, minWidth: 42 }}>{t}</span>
              <span style={{ flex: 1 }}>
                <strong>{VALUE_TIERS[t].label}</strong> — {VALUE_TIERS[t].strategy}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'servqual',
      title: 'Service quality — RATER',
      intro: 'SERVQUAL measures the gap between what customers expect and what they perceive, across five dimensions.',
      body: (
        <ul style={listStyle}>
          <li style={liStyle}><strong>Reliability</strong> — deliver on the promise: accurate ETAs, correct orders, honest warranties.</li>
          <li style={liStyle}><strong>Assurance</strong> — knowledgeable, courteous staff; clear specs and certifications that build trust.</li>
          <li style={liStyle}><strong>Tangibles</strong> — the site, packaging and product condition on arrival.</li>
          <li style={liStyle}><strong>Empathy</strong> — individual care, especially for outage-driven urgent purchases.</li>
          <li style={liStyle}><strong>Responsiveness</strong> — fast help on chat, WhatsApp and phone.</li>
        </ul>
      ),
    },
    {
      id: 'culture',
      title: 'Service culture',
      intro: 'A branded service culture keeps the experience consistent across every channel. Position: the reliable power partner — Service + Convenience leader.',
      body: (
        <ul style={listStyle}>
          <li style={liStyle}><strong>Mission</strong> — keep Jamaica powered with dependable, honestly-priced portable energy.</li>
          <li style={liStyle}><strong>Consistency</strong> — same tone and quality online, in person and over WhatsApp.</li>
          <li style={liStyle}><strong>Empowerment</strong> — front-line staff may resolve small issues (replacements, expedited delivery) without escalation.</li>
          <li style={liStyle}><strong>Proactive</strong> — flag delays before the customer has to ask.</li>
        </ul>
      ),
    },
    {
      id: 'complaints',
      title: 'Handling complaints',
      intro: 'From "Complaints & Guarantees": most unhappy customers never complain, so treat every complaint as a gift and follow the same steps.',
      body: (
        <>
          <Steps
            items={[
              ['Listen', 'Let them finish without interrupting.'],
              ['Apologise', 'Own it, even if the cause is unclear.'],
              ['Clarify', 'Paraphrase to confirm you understand the issue.'],
              ['Take responsibility', 'Acknowledge and set expectations for the fix.'],
              ['Fix & follow up', 'Resolve per policy, then check back.'],
            ]}
          />
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '12px 0 0' }}>
            When a complaint type spikes, run the <strong>5 Whys</strong> to find the root cause before changing policy or supplier.
          </p>
        </>
      ),
    },
    {
      id: 'guarantee',
      title: 'Service guarantee design',
      intro: 'A good guarantee is meaningful, pays out fairly, and is easy to invoke.',
      body: (
        <ul style={listStyle}>
          <li style={liStyle}><strong>Meaningful</strong> — promise something beyond the ordinary (e.g. on-time delivery or it’s credited).</li>
          <li style={liStyle}><strong>Fair payout</strong> — make the customer whole.</li>
          <li style={liStyle}><strong>Easy to invoke</strong> — the return/RMA flow should be one simple form, never a runaround.</li>
        </ul>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={cardStyle}>
        <h3 style={h3Style}>Customer-centric service playbook</h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
          The working guide for how Kingston Energies wins and keeps customers — distilled from the
          MGMT 3069 frameworks and wired into this platform. Use it for onboarding, day-to-day service
          decisions, and as the reference behind the CRM tools in the other tabs.
        </p>
      </div>

      {sections.map((s) => {
        const isOpen = open === s.id
        return (
          <div key={s.id} style={cardStyle}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? '' : s.id)}
              aria-expanded={isOpen}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                textAlign: 'left',
              }}
            >
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>{s.title}</span>
              <span style={{ fontSize: 18, color: 'var(--color-text-subtle)', lineHeight: 1 }}>{isOpen ? '−' : '+'}</span>
            </button>
            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '6px 0 0' }}>{s.intro}</p>
            {isOpen && <div style={{ marginTop: 14 }}>{s.body}</div>}
          </div>
        )
      })}
    </div>
  )
}

function Steps({ items }: { items: [string, string][] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map(([label, detail], i) => (
        <div key={label} style={{ display: 'flex', gap: 12 }}>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'var(--ke-green-500)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            {i + 1}
          </span>
          <span style={{ fontSize: 13 }}>
            <strong>{label}</strong> — <span style={{ color: 'var(--color-text-muted)' }}>{detail}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

const listStyle: React.CSSProperties = { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }
const liStyle: React.CSSProperties = { fontSize: 13, color: 'var(--color-text)' }
const rowStyle: React.CSSProperties = { display: 'flex', gap: 12, fontSize: 13, alignItems: 'baseline' }
