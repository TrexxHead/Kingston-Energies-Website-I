/**
 * Rendered side views for the models most common in Jamaica (newest
 * generation of each): white studio renders generated with Higgsfield, with a
 * paint mask and highlight layer so the garage can repaint them in the owner's
 * colour. Files in public/images/cars/<slug>{.webp,-paint.png,-shine.png}.
 * Models not listed keep the drawn side view (VehicleSide2D).
 */
export interface CarPhoto {
  slug: string
  /** Pixel size of the trimmed render (all three files share it). */
  w: number
  h: number
}

export const CAR_PHOTOS: Record<string, CarPhoto> = {
  'toyota-aqua-2': { slug: 'aqua', w: 1200, h: 520 },
  'toyota-prius-5': { slug: 'prius', w: 1200, h: 447 },
  'honda-fit-4': { slug: 'fit', w: 1200, h: 537 },
  'honda-vezel-2': { slug: 'vezel', w: 1200, h: 505 },
  'toyota-corolla-cross': { slug: 'corollacross', w: 1200, h: 512 },
  'toyota-rav4-5': { slug: 'rav4', w: 1200, h: 516 },
  'nissan-leaf-ze1': { slug: 'leaf', w: 1200, h: 506 },
  'byd-atto3': { slug: 'atto3', w: 1200, h: 519 },
  'byd-dolphin': { slug: 'dolphin', w: 1200, h: 541 },
  'byd-seal': { slug: 'seal', w: 1200, h: 428 },
  'mg-zs-ev': { slug: 'zsev', w: 1200, h: 529 },
  'mg-4': { slug: 'mg4', w: 1200, h: 495 },
  'hyundai-ioniq5': { slug: 'ioniq5', w: 1200, h: 521 },
  'hyundai-kona-2': { slug: 'kona', w: 1200, h: 519 },
  'kia-niro-2': { slug: 'niro', w: 1200, h: 512 },
  'tesla-modely-juniper': { slug: 'modely', w: 1200, h: 486 },
}

export const photoFor = (designId: string | undefined): CarPhoto | null => (designId ? (CAR_PHOTOS[designId] ?? null) : null)
