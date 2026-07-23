'use client'

export const dynamic = 'force-dynamic'

import { useMemo, useState } from 'react'
import { ChevronDown, Phone, Mail, MessageCircle } from 'lucide-react'
import Topbar from '../_components/Topbar'
import { hubScreen, hubCard, hubH3, hubEyebrow } from '../_components/ui'
import SupportChat from './_components/SupportChat'

interface Faq {
  q: string
  a: string
}
interface FaqGroup {
  category: string
  items: Faq[]
}

const FAQ_GROUPS: FaqGroup[] = [
  {
    category: 'Delivery',
    items: [
      {
        q: 'How much is delivery and how long does it take?',
        a: 'Standard delivery is free on orders over J$10,000, otherwise a flat J$800 and arrives in 2–3 business days. Express (next-day) delivery within Kingston is J$800.',
      },
      {
        q: 'Which areas do you deliver to?',
        a: 'We deliver islandwide across Jamaica. Kingston & St. Andrew get next-day express; other parishes typically arrive in 2–4 business days.',
      },
      {
        q: 'How do I track my order?',
        a: 'Open the Orders tab in your hub, or visit the Track page. You\'ll see live status move from Confirmed → Packed → Out for delivery → Delivered.',
      },
    ],
  },
  {
    category: 'Payment',
    items: [
      {
        q: 'What payment methods do you accept?',
        a: 'Visa/Mastercard, Google Pay, PayPal, and Cash on Delivery across Kingston. Your chosen method is saved with each order.',
      },
      {
        q: 'Are there any discounts?',
        a: 'Use code KINGSTON10 for 10% off your first order. Refer a friend from the Rewards tab and you each get J$1,000 in credit.',
      },
      {
        q: 'Is my payment information secure?',
        a: 'Yes. Card details are never stored on our servers — payments are handled by the payment provider directly.',
      },
    ],
  },
  {
    category: 'Warranty & returns',
    items: [
      {
        q: 'What warranty do products come with?',
        a: 'Every product includes a 14-day replacement guarantee against manufacturing defects, plus the manufacturer’s own warranty. Register your device in the My devices tab to keep your proof of purchase.',
      },
      {
        q: 'What is your return policy?',
        a: 'Unused items can be returned within 30 days for a full refund. Faulty items are replaced or refunded under warranty.',
      },
      {
        q: 'How do I make a warranty claim?',
        a: 'Chat with Jordyn below or call 876-338-9958 with your order number and the device serial number (found on the box or device label).',
      },
    ],
  },
  {
    category: 'Devices & rewards',
    items: [
      {
        q: 'How do I register a device?',
        a: 'Go to My devices, enter the serial number from the box or label, and you\'ll earn 25 loyalty points instantly.',
      },
      {
        q: 'How do loyalty points work?',
        a: 'Earn 1 point per J$100 spent, 25 points per device registered, and 50 points per review. 500 points = J$1,000 off your next order.',
      },
    ],
  },
  {
    category: 'Account',
    items: [
      {
        q: "I didn't receive my verification email.",
        a: 'Check your spam folder first. You can resend the confirmation link from the sign-in screen, or chat with Jordyn and we\'ll help verify your account.',
      },
    ],
  },
]

export default function SupportPage() {
  const [query, setQuery] = useState('')
  const [openKey, setOpenKey] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return FAQ_GROUPS
    return FAQ_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((it) => it.q.toLowerCase().includes(q) || it.a.toLowerCase().includes(q)),
    })).filter((g) => g.items.length > 0)
  }, [query])

  return (
    <>
      <Topbar title="Support" subtitle="Answers, guides and live help" />
      <div className="ke-screen" style={hubScreen}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help articles…"
          style={{
            width: '100%',
            height: 48,
            padding: '0 18px',
            borderRadius: 12,
            border: '1px solid var(--color-border)',
            fontSize: 14.5,
            outline: 'none',
            marginBottom: 18,
          }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, alignItems: 'start' }} className="hub-two-col">
          {/* FAQ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {filtered.length === 0 && (
              <div style={hubCard}>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-muted)' }}>
                  No articles match &ldquo;{query}&rdquo;. Try the chat with Jordyn — she can help with anything.
                </p>
              </div>
            )}
            {filtered.map((group) => (
              <div key={group.category}>
                <div style={{ ...hubEyebrow, marginBottom: 10 }}>{group.category}</div>
                <div style={{ ...hubCard, padding: 0, overflow: 'hidden' }}>
                  {group.items.map((it, idx) => {
                    const key = `${group.category}-${idx}`
                    const isOpen = openKey === key
                    return (
                      <div key={key} style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--color-border)' }}>
                        <button
                          type="button"
                          onClick={() => setOpenKey(isOpen ? null : key)}
                          aria-expanded={isOpen}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            padding: '16px 18px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontFamily: 'var(--font-display)',
                            fontWeight: 600,
                            fontSize: 14,
                            color: 'var(--color-text)',
                          }}
                        >
                          {it.q}
                          <ChevronDown
                            size={17}
                            style={{
                              flexShrink: 0,
                              color: 'var(--color-text-muted)',
                              transform: isOpen ? 'rotate(180deg)' : 'none',
                              transition: 'transform var(--dur-base) var(--ease-standard)',
                            }}
                          />
                        </button>
                        {isOpen && (
                          <div style={{ padding: '0 18px 16px', fontSize: 13.5, lineHeight: 1.65, color: 'var(--color-text-muted)' }}>
                            {it.a}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Live help */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ ...hubEyebrow, marginBottom: 10 }}>Still need help?</div>
              <SupportChat />
            </div>

            <div style={hubCard}>
              <h3 style={hubH3}>Reach a human</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <ContactRow icon={<Phone size={16} color="var(--ke-green-600)" />} label="Call us" value="876-338-9958" href="tel:8763389958" />
                <ContactRow icon={<MessageCircle size={16} color="var(--ke-green-600)" />} label="WhatsApp" value="876-338-9958" href="https://wa.me/18763389958" />
                <ContactRow icon={<Mail size={16} color="var(--ke-green-600)" />} label="Email" value="kingstonenergygroup@outlook.com" href="mailto:kingstonenergygroup@outlook.com" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function ContactRow({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href: string }) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 10,
        border: '1px solid var(--color-border)',
        textDecoration: 'none',
        color: 'var(--color-text)',
      }}
    >
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontSize: 11.5, color: 'var(--color-text-muted)' }}>{label}</span>
        <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>{value}</span>
      </span>
    </a>
  )
}
