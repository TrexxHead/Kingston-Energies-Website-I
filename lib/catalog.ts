/** Format a price in Jamaican dollars, e.g. J$7,999. */
export const fmt = (n: number): string => 'J$' + n.toLocaleString()

export type Category = 'powerbanks' | 'chargers' | 'stations' | 'accessories'
export type BadgeTone = 'green' | 'blue' | 'orange'

export interface Product {
  id: string
  cat: Category
  name: string
  spec: string
  price: number
  image: string | null
  badge?: string
  badgeTone?: BadgeTone
  featured?: boolean
  cap?: string
  ports?: string
  speed?: string
  best?: string
}

export const CATALOG: Product[] = [
  {
    id: 'pb10',
    cat: 'powerbanks',
    name: 'Charmast 10,400',
    spec: '10,400MAH · 3 PORTS · LED',
    price: 7999,
    image: '/images/powerbank-hand.jpg',
    badge: 'Best seller',
    badgeTone: 'orange',
    featured: true,
    cap: '10,400mAh',
    ports: 'USB-C · Micro · A',
    speed: '2× fast',
    best: 'Everyday carry',
  },
  {
    id: 'pb20',
    cat: 'powerbanks',
    name: 'Charmast 20,000 PD',
    spec: '20,000MAH · USB-C PD 22.5W',
    price: 11999,
    image: '/images/powerbanks-window.jpg',
    badge: 'Max capacity',
    badgeTone: 'green',
    cap: '20,000mAh',
    ports: 'USB-C PD · A',
    speed: '3× fast',
    best: 'Weekend trips',
  },
  {
    id: 'pbot',
    cat: 'powerbanks',
    name: 'OtterBox 10,000 Leather',
    spec: '10,000MAH · LEATHER · GOLD STRIPE',
    price: 9999,
    image: '/images/otterbox-hand.jpg',
    badge: 'Repairable',
    badgeTone: 'blue',
    cap: '10,000mAh',
    ports: 'USB-C · A',
    speed: '2× fast',
    best: 'Everyday carry',
  },
  {
    id: 'pbsl',
    cat: 'powerbanks',
    name: 'Slim 10,000 Pearl',
    spec: '10,000MAH · POCKET SLIM',
    price: 6999,
    image: '/images/powerbank-white-hand.jpg',
    cap: '10,000mAh',
    ports: 'USB-C',
    speed: '1× standard',
    best: 'Minimal pocket',
  },
  {
    id: 'ch20',
    cat: 'chargers',
    name: '20W USB-C Fast Charger',
    spec: '20W PD · IPHONE & ANDROID',
    price: 2999,
    image: null,
  },
  {
    id: 'chgan',
    cat: 'chargers',
    name: '33W GaN Dual-Port',
    spec: 'USB-C + USB-A · GAN',
    price: 4999,
    image: null,
    badge: 'New',
    badgeTone: 'green',
  },
  {
    id: 'chcab',
    cat: 'chargers',
    name: 'Braided USB-C Cable',
    spec: '1M BRAIDED · FAST CHARGE',
    price: 2499,
    image: '/images/charger-cable.jpg',
  },
  {
    id: 'chcar',
    cat: 'chargers',
    name: 'Car Charger',
    spec: '12V · DUAL PORT',
    price: 3499,
    image: null,
  },
  {
    id: 'st300',
    cat: 'stations',
    name: 'Power Station 300',
    spec: '300W · AC + USB-C',
    price: 49999,
    image: null,
    badge: 'Pre-order',
    badgeTone: 'orange',
  },
  {
    id: 'st500',
    cat: 'stations',
    name: 'Power Station 500',
    spec: '500W · SOLAR-READY',
    price: 79999,
    image: null,
    badge: 'Solar-ready',
    badgeTone: 'green',
  },
  {
    id: 'acst',
    cat: 'accessories',
    name: 'Nulaxy Phone Stand',
    spec: 'ALUMINIUM · FOLDABLE',
    price: 2999,
    image: '/images/phone-stand.jpg',
  },
  {
    id: 'acpo',
    cat: 'accessories',
    name: 'Tech Pouch',
    spec: 'WATER-RESISTANT ORGANIZER',
    price: 2499,
    image: '/images/pouch-open.jpg',
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
  { id: 'stations', label: 'Power stations' },
  { id: 'accessories', label: 'Accessories' },
]

export const getProduct = (id: string): Product | undefined => CATALOG.find((p) => p.id === id)
