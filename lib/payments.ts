import { prisma } from '@/lib/prisma'

/**
 * Payment methods are admin-configurable and stored as a single JSON blob in
 * SiteSetting (key "payments"). The direct methods (bank/lynk/paypal/cod) need
 * no gateway — the customer pays out-of-band using the details shown, quoting
 * their order number, and an admin marks the order paid. "card" is the WiPay
 * gateway and is only truly available when its env vars are set.
 */

export type PaymentMethodId = 'bank' | 'lynk' | 'paypal' | 'cod' | 'card'

export interface PaymentConfig {
  bank: {
    enabled: boolean
    bankName: string
    accountName: string
    accountNumber: string
    accountType: string
    branch: string
    instructions: string
  }
  lynk: { enabled: boolean; handle: string; phone: string; instructions: string }
  paypal: { enabled: boolean; link: string; email: string; instructions: string }
  cod: { enabled: boolean; instructions: string }
  card: { enabled: boolean } // WiPay — also gated on WIPAY_* env being present
}

const SETTING_KEY = 'payments'

export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  bank: { enabled: false, bankName: '', accountName: '', accountNumber: '', accountType: '', branch: '', instructions: '' },
  lynk: { enabled: false, handle: '', phone: '', instructions: '' },
  paypal: { enabled: false, link: '', email: '', instructions: '' },
  cod: { enabled: true, instructions: 'Pay with cash when your order is delivered, Kingston-wide.' },
  card: { enabled: false },
}

/** Deep-merge stored config over the defaults so new fields always exist. */
function merge(stored: Partial<PaymentConfig> | null): PaymentConfig {
  const d = DEFAULT_PAYMENT_CONFIG
  if (!stored) return d
  return {
    bank: { ...d.bank, ...stored.bank },
    lynk: { ...d.lynk, ...stored.lynk },
    paypal: { ...d.paypal, ...stored.paypal },
    cod: { ...d.cod, ...stored.cod },
    card: { ...d.card, ...stored.card },
  }
}

export async function getPaymentConfig(): Promise<PaymentConfig> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: SETTING_KEY } })
    return merge(row ? (JSON.parse(row.value) as Partial<PaymentConfig>) : null)
  } catch {
    // DB down or bad JSON — fall back to defaults (COD stays available).
    return DEFAULT_PAYMENT_CONFIG
  }
}

export async function savePaymentConfig(cfg: PaymentConfig): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: JSON.stringify(cfg) },
    update: { value: JSON.stringify(cfg) },
  })
}

/** True when the WiPay card gateway credentials are configured. */
export function isWiPayConfigured(): boolean {
  return Boolean(process.env.WIPAY_ACCOUNT_NUMBER && process.env.WIPAY_API_KEY)
}

/** A method as shown to a customer at checkout. */
export interface PublicPaymentMethod {
  id: PaymentMethodId
  label: string
  sub: string
  /** Human-readable "how to pay" lines shown after the order is placed. */
  details: string[]
  /** For direct methods, the customer quotes their order number as reference. */
  needsReference: boolean
  /** card → redirect to the gateway instead of showing manual details. */
  gateway: boolean
}

export function toPublicMethods(cfg: PaymentConfig): PublicPaymentMethod[] {
  const out: PublicPaymentMethod[] = []

  if (cfg.bank.enabled) {
    const d: string[] = []
    if (cfg.bank.bankName) d.push(`Bank: ${cfg.bank.bankName}`)
    if (cfg.bank.accountName) d.push(`Account name: ${cfg.bank.accountName}`)
    if (cfg.bank.accountNumber) d.push(`Account #: ${cfg.bank.accountNumber}`)
    if (cfg.bank.accountType) d.push(`Type: ${cfg.bank.accountType}`)
    if (cfg.bank.branch) d.push(`Branch: ${cfg.bank.branch}`)
    if (cfg.bank.instructions) d.push(cfg.bank.instructions)
    out.push({ id: 'bank', label: 'Bank transfer', sub: 'Direct deposit or online transfer', details: d, needsReference: true, gateway: false })
  }

  if (cfg.lynk.enabled) {
    const d: string[] = []
    if (cfg.lynk.handle) d.push(`Lynk handle: ${cfg.lynk.handle}`)
    if (cfg.lynk.phone) d.push(`Lynk phone: ${cfg.lynk.phone}`)
    if (cfg.lynk.instructions) d.push(cfg.lynk.instructions)
    out.push({ id: 'lynk', label: 'Lynk', sub: 'Pay from your Lynk wallet', details: d, needsReference: true, gateway: false })
  }

  if (cfg.paypal.enabled) {
    const d: string[] = []
    if (cfg.paypal.link) d.push(`Pay here: ${cfg.paypal.link}`)
    if (cfg.paypal.email) d.push(`PayPal email: ${cfg.paypal.email}`)
    if (cfg.paypal.instructions) d.push(cfg.paypal.instructions)
    out.push({ id: 'paypal', label: 'PayPal', sub: 'Pay with your PayPal account or card', details: d, needsReference: true, gateway: false })
  }

  if (cfg.card.enabled && isWiPayConfigured()) {
    out.push({ id: 'card', label: 'Debit / credit card', sub: 'Visa or Mastercard, paid securely online', details: [], needsReference: false, gateway: true })
  }

  if (cfg.cod.enabled) {
    out.push({
      id: 'cod',
      label: 'Cash on delivery',
      sub: 'Pay when it arrives, Kingston-wide',
      details: cfg.cod.instructions ? [cfg.cod.instructions] : [],
      needsReference: false,
      gateway: false,
    })
  }

  return out
}
