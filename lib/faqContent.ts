import type { FaqSectionData } from '@/components/ui/habit-faq-scroller'

/**
 * The site's one FAQ dataset — grounded in the actual policy pages
 * (legal/delivery, legal/warranty, legal/returns) and checkout/bulk-order
 * flows, not placeholder copy. Shared so the homepage and any other
 * placement never drift out of sync with each other.
 */
export const SITE_FAQ: FaqSectionData = {
  mainTitle: 'Frequently asked questions',
  mainSubtitle: "Have a question that isn't here? Reach out and we'll answer it directly.",
  rows: [
    {
      id: 'orders',
      speed: '55s',
      direction: 'left',
      faqItems: [
        {
          id: 'delivery',
          question: 'How do I get my order?',
          answer:
            'Every order can be delivered by our own courier, shipped islandwide via Knutsford Express, or collected free at one of our pickup locations — whichever suits you at checkout.',
        },
        {
          id: 'payment',
          question: 'How can I pay?',
          answer:
            "Pay by card through our secure checkout, or choose bank transfer and upload your proof of payment afterwards from your order — either way, you'll see it confirmed in your account.",
        },
      ],
    },
    {
      id: 'coverage',
      speed: '65s',
      direction: 'right',
      faqItems: [
        {
          id: 'warranty',
          question: 'What if my device arrives faulty?',
          answer:
            "We'll replace it or refund you in full at no cost within 14 days of delivery — on top of that, every device carries the manufacturer's own warranty, which varies by brand.",
        },
        {
          id: 'returns',
          question: 'Can I return something I changed my mind about?',
          answer:
            'Yes — most items can be returned within 14 days of delivery for a refund or exchange, provided they’re unused and in their original packaging.',
        },
      ],
    },
    {
      id: 'business',
      speed: '75s',
      direction: 'left',
      faqItems: [
        {
          id: 'bulk',
          question: 'Do you offer pricing for bulk or business orders?',
          answer:
            "Yes — discounts scale with the quantity you order on each item, not a blanket cart-wide markdown, so the math stays transparent. Request a bulk quote and we'll put one together.",
        },
        {
          id: 'unsure',
          question: 'Not sure what you actually need?',
          answer:
            "Try Find My Power — a short energy checkup that estimates the setup that actually covers your appliances, instead of guessing at a power bank size.",
        },
      ],
    },
  ],
}
