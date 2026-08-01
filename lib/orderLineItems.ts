// OrderItem rows aren't all products — checkout appends synthetic lines for
// delivery, the first-order discount, and redeemed rewards points (see
// app/api/orders/route.ts, app/api/payments/wipay/create/route.ts,
// app/api/integrations/orders/route.ts). Anything that ranks or counts
// "products sold" must exclude these, or delivery ends up looking like a
// best-selling item.
const NON_PRODUCT_LINE_PREFIXES = ['Delivery: ', 'First order discount (', 'Rewards points redeemed (']

export function isProductLine(name: string): boolean {
  return !NON_PRODUCT_LINE_PREFIXES.some((prefix) => name.startsWith(prefix))
}
