import Image from 'next/image'
import { BatteryCharging, Plug, BatteryFull, Package } from 'lucide-react'
import type { Category } from '@/lib/catalog'

const STYLES: Record<Category, { grad: string; Icon: typeof BatteryCharging }> = {
  powerbanks: { grad: 'linear-gradient(135deg,#aed968 0%,#29abe2 100%)', Icon: BatteryCharging },
  chargers: { grad: 'linear-gradient(135deg,#29abe2 0%,#04547c 100%)', Icon: Plug },
  stations: { grad: 'linear-gradient(135deg,#2f6b62 0%,#0b2634 100%)', Icon: BatteryFull },
  accessories: { grad: 'linear-gradient(140deg,#fdb813 0%,#f7941e 100%)', Icon: Package },
}

/**
 * Product imagery: renders the real photo when available, otherwise a branded
 * category-coloured placeholder so the catalog never shows an empty grey box.
 * No client state — safe in both server and client components.
 */
export default function ProductImage({
  src,
  alt,
  cat,
  sizes,
  iconSize = 40,
  priority = false,
}: {
  src: string | null
  alt: string
  cat: Category
  sizes: string
  iconSize?: number
  priority?: boolean
}) {
  if (src) {
    return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} style={{ objectFit: 'cover' }} />
  }

  const { grad, Icon } = STYLES[cat]
  return (
    <div
      aria-label={alt}
      role="img"
      style={{
        width: '100%',
        height: '100%',
        background: grad,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* subtle brand sheen */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 80% 0%, rgba(255,255,255,.25), transparent 60%)' }} />
      <Icon size={iconSize} color="rgba(255,255,255,.92)" strokeWidth={1.4} />
    </div>
  )
}
