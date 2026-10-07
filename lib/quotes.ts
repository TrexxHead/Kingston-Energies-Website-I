export interface QuoteItem {
  name: string
  price: number
  qty: number
}

/** Sum of price × qty across a quote's line items. */
export function quoteTotal(items: QuoteItem[] | null | undefined): number {
  if (!items) return 0
  return items.reduce((sum, i) => sum + i.price * i.qty, 0)
}
