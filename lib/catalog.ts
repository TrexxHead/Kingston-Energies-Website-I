/** Format a price in Jamaican dollars, e.g. J$7,999. */
export const fmt = (n: number): string => 'J$' + n.toLocaleString()

export type Category = 'powerbanks' | 'chargers' | 'stations' | 'accessories'
export type BadgeTone = 'green' | 'blue' | 'orange'

/** A selectable variant (e.g. capacity) that changes the product's price. */
export interface ProductVariant {
  label: string
  price: number
  cap?: string
}

export interface Product {
  id: string
  cat: Category
  name: string
  spec: string
  price: number
  image: string | null
  /** Additional detail-page photos (first is usually the same as `image`). */
  gallery?: string[]
  badge?: string
  badgeTone?: BadgeTone
  featured?: boolean
  cap?: string
  ports?: string
  speed?: string
  best?: string
  warranty?: string
  /** Capacity/model options selectable on the product page (changes price). */
  variants?: ProductVariant[]
}

const KE_WARRANTY = '14-day + manufacturer'

export const CATALOG: Product[] = [
  {
    id: 'pb10',
    cat: 'powerbanks',
    name: 'Charmast 10,400',
    spec: '10,400MAH · DIGITAL DISPLAY · USB-C & USB-A',
    price: 5500,
    image: '/images/charmast-1.jpg',
    gallery: ['/images/charmast-1.jpg', '/images/charmast-2.jpg', '/images/charmast-3.jpg', '/images/charmast-4.jpg', '/images/charmast-5.jpg', '/images/charmast-6.jpg', '/images/charmast-7.jpg'],
    badge: 'Best seller',
    badgeTone: 'orange',
    featured: true,
    cap: '10,400mAh',
    ports: 'USB-C · USB-A · Micro',
    speed: '2× fast',
    best: 'Everyday carry',
    warranty: KE_WARRANTY,
    variants: [
      { label: '10,400mAh', price: 5500, cap: '10,400mAh' },
      { label: '20,000mAh', price: 11000, cap: '20,000mAh' },
    ],
  },
  {
    id: 'pbmag',
    cat: 'powerbanks',
    name: 'IFIDOL MagSafe Power Bank',
    spec: 'MAGSAFE · 16,000MAH · 22.5W USB-C',
    price: 8000,
    image: '/images/ifidol-1.jpg',
    gallery: ['/images/ifidol-1.jpg', '/images/ifidol-2.jpg', '/images/ifidol-3.jpg', '/images/ifidol-4.jpg', '/images/ifidol-5.jpg', '/images/ifidol-6.jpg'],
    badge: 'MagSafe',
    badgeTone: 'blue',
    featured: true,
    cap: '16,000mAh',
    ports: 'USB-C · MagSafe wireless',
    speed: '15W wireless · 22.5W wired',
    best: 'iPhone 12–16',
    warranty: KE_WARRANTY,
  },
  {
    id: 'pbmi',
    cat: 'powerbanks',
    name: 'MIADY 10,000',
    spec: '10,000MAH · 22.5W PD · COMPACT',
    price: 5500,
    image: '/images/miady-1.jpg',
    cap: '10,000mAh',
    ports: 'USB-C · USB-A',
    speed: '2× fast',
    best: 'Everyday carry',
    warranty: KE_WARRANTY,
  },
  {
    id: 'pbot',
    cat: 'powerbanks',
    name: 'OtterBox 10,000 Leather',
    spec: '10,000MAH · PREMIUM · REPAIRABLE',
    price: 8000,
    image: '/images/otterbox-1.jpg',
    gallery: ['/images/otterbox-1.jpg', '/images/otterbox-2.jpg'],
    badge: 'Repairable',
    badgeTone: 'blue',
    cap: '10,000mAh',
    ports: 'USB-C · USB-A',
    speed: '2× fast',
    best: 'Everyday carry',
    warranty: KE_WARRANTY,
  },
  {
    id: 'ch20',
    cat: 'chargers',
    name: '20W USB-C Fast Charger',
    spec: '20W PD · IPHONE & ANDROID',
    price: 3000,
    image: '/images/charger20-1.jpg',
    warranty: KE_WARRANTY,
  },
  {
    id: 'ch21',
    cat: 'chargers',
    name: 'USB-C to Lightning Charger 20W',
    spec: 'USB-C TO LIGHTNING · 20W PD',
    price: 3000,
    image: null,
    best: 'iPhone fast charge',
    warranty: KE_WARRANTY,
  },
  {
    id: 'chcab',
    cat: 'chargers',
    name: 'Braided USB-C Cable',
    spec: '6FT BRAIDED · FAST CHARGE',
    price: 2500,
    image: '/images/charger-cable.jpg',
    warranty: KE_WARRANTY,
  },
  {
    id: 'st300',
    cat: 'stations',
    name: 'Anker Power Station',
    spec: 'PORTABLE POWER STATION · AC + USB-C',
    price: 25000,
    image: '/images/anker-1.jpg',
    badge: 'Flagship',
    badgeTone: 'green',
    best: 'Home backup',
    warranty: KE_WARRANTY,
  },
  {
    id: 'solar',
    cat: 'stations',
    name: 'Litheli 100W Solar Panel',
    spec: '100W · FOLDABLE · IP54',
    price: 15000,
    image: '/images/litheli-1.jpg',
    gallery: ['/images/litheli-1.jpg', '/images/litheli-2.jpg', '/images/litheli-3.jpg', '/images/litheli-4.jpg', '/images/litheli-5.jpg', '/images/litheli-6.jpg', '/images/litheli-7.jpg'],
    badge: 'Solar-ready',
    badgeTone: 'green',
    cap: '100W',
    ports: 'USB-C · USB-A',
    best: 'Off-grid & camping',
    warranty: KE_WARRANTY,
  },
  {
    id: 'acst',
    cat: 'accessories',
    name: 'Nulaxy Phone Stand',
    spec: 'ALUMINIUM · FOLDABLE',
    price: 1500,
    image: '/images/nulaxy-1.jpg',
    gallery: ['/images/nulaxy-1.jpg', '/images/nulaxy-2.jpg', '/images/nulaxy-3.jpg'],
    warranty: KE_WARRANTY,
  },
  {
    id: 'acpo',
    cat: 'accessories',
    name: 'Tech Pouch',
    spec: 'WATER-RESISTANT ORGANIZER',
    price: 2499,
    image: '/images/pouch-1.jpg',
    gallery: ['/images/pouch-1.jpg', '/images/pouch-2.jpg', '/images/pouch-3.jpg'],
    warranty: KE_WARRANTY,
  },
]

/**
 * A catalog product merged with live operational data from the database
 * (price + stock). `stock: null` means the product isn't tracked in the DB yet.
 */
export interface ShopProduct extends Product {
  stock: number | null
  inStock: boolean
}

export const CATEGORY_PILLS: { id: 'all' | Category; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'powerbanks', label: 'Power banks' },
  { id: 'chargers', label: 'Chargers' },
  { id: 'stations', label: 'Power & Solar' },
  { id: 'accessories', label: 'Accessories' },
]

export const getProduct = (id: string): Product | undefined => CATALOG.find((p) => p.id === id)
