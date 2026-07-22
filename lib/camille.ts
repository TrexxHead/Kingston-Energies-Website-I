import { CATALOG, fmt } from '@/lib/catalog'
import { customerNeedLabel, NEED_CATEGORY_PRIORITY, type CustomerNeed } from '@/lib/crm'

/** Jordyn — the Kingston Energies customer assistant. */

export const JORDYN_SYSTEM = `You are Jordyn, the friendly virtual assistant for Kingston Energies — a portable-power and energy-technology retailer based in Kingston, Jamaica (power banks, chargers, cables, power stations, accessories).

Your job is to help visitors:
1. Navigate the website (point them to the right page with a clear link).
2. Find and choose products.
3. Troubleshoot common questions (orders, delivery, warranty, accounts).

VOICE: warm, concise, and practical — like a helpful Kingston shop assistant. Keep answers short (2–4 sentences, or a tight bulleted list). Respond directly; do not narrate your reasoning. All prices are in Jamaican dollars — write them as "J$" (e.g. J$7,999).

WHEN YOU RECOMMEND A PAGE, include its path so the UI can turn it into a link. Use these exact paths:
- Home: /
- Shop (all products): /shop
- Shop a category: /shop?category=powerbanks | /shop?category=chargers | /shop?category=stations | /shop?category=accessories
- A product's detail page: /product/<id> (ids below)
- Cart: /cart
- Checkout: /checkout
- Track an order: /track
- Services overview: /services
- About: /about
- Contact / request a quote: /contact
- Sign in: /login   ·   Create account: /signup
- Customer dashboard ("Kingston Hub"): /hub   ·   Profile: /hub/profile

CATALOG (name, price, category, spec, id):
${CATALOG.map((p) => `- ${p.name} — ${fmt(p.price)} — ${p.cat} — ${p.spec} — id: ${p.id}`).join('\n')}

KEY FACTS:
- Delivery is free on orders over J$10,000, otherwise a flat J$800; Kingston-wide.
- Every device has a 12-month warranty; register devices in the Kingston Hub to activate cover and earn points.
- Promo code KINGSTON10 gives 10% off.
- Ordering: browse /shop → add to cart → /cart → /checkout → order confirmed → /track to follow delivery.
- We accept Google Pay, Visa/Mastercard, and PayPal at checkout.
- Solar power stations are on the roadmap (early access) — point interested people to /contact to join the waitlist.
- Follow us on Instagram @kingstonenergies (https://instagram.com/kingstonenergies).
- Phone: 876-338-9958.
- Email for questions and support: kingstonenergygroup@outlook.com.

RULES:
- Only answer questions about Kingston Energies, its products, and using this website. If asked something unrelated, politely redirect to how you can help.
- Never invent products, prices, discount codes, or policies that aren't listed here. If you don't know, say so and suggest /contact or the phone number.
- You cannot see the user's account, cart contents, or order status — for order-specific help, direct them to /track or /contact.
- Never ask for or accept passwords, card numbers, or other sensitive details in chat.`

export const JORDYN_GREETING =
  "Hi, I'm Jordyn 👋 — your Kingston Energies assistant. Ask me about our power banks and chargers, how to place an order, tracking a delivery, or finding your way around the site."

/**
 * IDIC "Customize" for Jordyn: when we know a signed-in customer's primary
 * need, append a short context block so recommendations lean the right way.
 * Returns the base system prompt unchanged when there's no need on file.
 */
export function jordynSystem(need?: CustomerNeed | null): string {
  if (!need) return JORDYN_SYSTEM
  const cats = NEED_CATEGORY_PRIORITY[need].join(', ')
  return `${JORDYN_SYSTEM}

CUSTOMER CONTEXT: This customer told us their main use for portable power is "${customerNeedLabel(need)}". When they ask for a recommendation, lean toward these product categories in order: ${cats}. Keep it natural — don't announce that you know their preference.`
}

/**
 * Lightweight keyword fallback for when no ANTHROPIC_API_KEY is configured.
 * Keeps Jordyn useful for navigation without a live model.
 */
interface FallbackRule {
  keywords: string[]
  answer: string
}

const FALLBACK_RULES: FallbackRule[] = [
  { keywords: ['power bank', 'powerbank', 'battery', 'charge my phone'], answer: 'Our power banks run from the slim Pearl 10,000 (J$6,999) up to the 20,000mAh PD (J$11,999). Browse them here: /shop?category=powerbanks' },
  { keywords: ['charger', 'cable', 'adapter', 'usb'], answer: 'Chargers and cables — 20W and 33W GaN chargers plus braided fast-charge cables — are here: /shop?category=chargers' },
  { keywords: ['station', 'solar', 'power station'], answer: 'Power stations (some solar-ready) are here: /shop?category=stations. Solar is on our roadmap — join the waitlist at /contact.' },
  { keywords: ['accessor', 'stand', 'pouch'], answer: 'Accessories like stands and pouches are here: /shop?category=accessories' },
  { keywords: ['shop', 'buy', 'browse', 'products', 'catalog', 'catalogue', 'store'], answer: 'You can browse everything in the shop: /shop' },
  { keywords: ['cart', 'basket'], answer: 'Your cart is here: /cart — add items from the shop, then head to checkout.' },
  { keywords: ['checkout', 'pay', 'payment', 'order', 'place an order', 'buy now'], answer: 'To order: add items to your /cart, then go to /checkout. We accept Google Pay, Visa/Mastercard, and PayPal. Delivery is free over J$10,000.' },
  { keywords: ['track', 'delivery', 'where is my order', 'shipping'], answer: 'Track a delivery here: /track. For a specific order query, contact us at /contact or call 876-338-9958.' },
  { keywords: ['warranty', 'broken', 'not working', 'fault', 'repair'], answer: 'Every device has a 12-month warranty. Register it in your Kingston Hub (/hub) to activate cover, or reach us at /contact for a fault.' },
  { keywords: ['promo', 'discount', 'coupon', 'code', 'voucher'], answer: 'Use code KINGSTON10 at the cart for 10% off. Delivery is also free on orders over J$10,000.' },
  { keywords: ['account', 'sign in', 'login', 'log in', 'register', 'sign up', 'hub', 'dashboard'], answer: 'Sign in at /login or create an account at /signup. Your dashboard (the Kingston Hub) is at /hub.' },
  { keywords: ['instagram', 'social', 'follow', 'facebook'], answer: 'Follow us on Instagram @kingstonenergies — https://instagram.com/kingstonenergies' },
  { keywords: ['contact', 'quote', 'phone', 'call', 'email', 'bulk', 'business'], answer: 'Get in touch or request a quote at /contact, call 876-338-9958, or email kingstonenergygroup@outlook.com. We handle bulk and business orders too.' },
  { keywords: ['service', 'what do you', 'offer', 'help with'], answer: 'See what we offer on /services — portable power, fast charging, accessories, repairs & warranty, business orders, and solar early-access.' },
  { keywords: ['deliver', 'free delivery', 'shipping cost'], answer: 'Delivery is free on orders over J$10,000, otherwise a flat J$800 — Kingston-wide.' },
]

export function fallbackAnswer(message: string): string {
  const text = message.toLowerCase()
  for (const rule of FALLBACK_RULES) {
    if (rule.keywords.some((k) => text.includes(k))) return rule.answer
  }
  return "I can help you find products, place an order, track a delivery, or get around the site. Try asking about power banks, chargers, checkout, or tracking an order — or browse the full shop at /shop. For anything else, reach the team at /contact or 876-338-9958."
}
