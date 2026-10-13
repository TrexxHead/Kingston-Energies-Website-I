import { SHIELD_IMAGES, POI_KINDS, type MapTheme, type PoiKind } from './openStyle'

/**
 * Icons for the Kingston Energies map, drawn on a canvas in the browser so
 * there is no sprite sheet to host or license. Browser-only: call from effects.
 */

const PR = 2 // draw at 2× for crisp icons on high-density screens

/* eslint-disable @typescript-eslint/no-explicit-any */
type AddImage = (id: string, img: { width: number; height: number; data: Uint8ClampedArray }, opts?: any) => void

function canvas(w: number, h: number) {
  const el = document.createElement('canvas')
  el.width = w * PR
  el.height = h * PR
  const ctx = el.getContext('2d')!
  ctx.scale(PR, PR)
  return { el, ctx }
}

function pixels(el: HTMLCanvasElement) {
  const ctx = el.getContext('2d')!
  return { width: el.width, height: el.height, data: ctx.getImageData(0, 0, el.width, el.height).data }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Stretchable road-number shield (icon-text-fit): yellow for highways, plain for others. */
function shield(fill: string, stroke: string) {
  const W = 20
  const H = 18
  const { el, ctx } = canvas(W, H)
  roundRect(ctx, 1, 1, W - 2, H - 2, 4)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineWidth = 1.2
  ctx.strokeStyle = stroke
  ctx.stroke()
  return {
    image: pixels(el),
    opts: { pixelRatio: PR, stretchX: [[6 * PR, 14 * PR]], stretchY: [[6 * PR, 12 * PR]], content: [4 * PR, 3 * PR, 16 * PR, 15 * PR] },
  }
}

const POI_COLOR: Record<PoiKind, string> = {
  health: '#e5484d',
  edu: '#a86a1f',
  food: '#ef7d00',
  shop: '#8e4ec6',
  fuel: '#2f6fb3',
  stay: '#5b5bd6',
  airport: '#2f80ed',
  place: '#8b8d98',
}

/** A filled circle with a simple white glyph per kind. */
function poi(kind: PoiKind) {
  const S = 18
  const { el, ctx } = canvas(S, S)
  ctx.beginPath()
  ctx.arc(S / 2, S / 2, S / 2 - 1, 0, Math.PI * 2)
  ctx.fillStyle = POI_COLOR[kind]
  ctx.fill()
  ctx.lineWidth = 1.2
  ctx.strokeStyle = 'rgba(255,255,255,.9)'
  ctx.stroke()
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#fff'
  ctx.lineCap = 'round'
  ctx.lineWidth = 1.6
  const c = S / 2
  switch (kind) {
    case 'health':
      ctx.fillRect(c - 1.2, c - 4, 2.4, 8)
      ctx.fillRect(c - 4, c - 1.2, 8, 2.4)
      break
    case 'edu':
      ctx.beginPath()
      ctx.moveTo(c - 5, c - 1)
      ctx.lineTo(c, c - 3.5)
      ctx.lineTo(c + 5, c - 1)
      ctx.lineTo(c, c + 1.5)
      ctx.closePath()
      ctx.fill()
      ctx.fillRect(c - 3, c, 6, 3)
      break
    case 'food':
      ctx.beginPath()
      ctx.moveTo(c - 2.5, c - 4.5)
      ctx.lineTo(c - 2.5, c + 4.5)
      ctx.moveTo(c + 2.5, c - 4.5)
      ctx.lineTo(c + 2.5, c + 4.5)
      ctx.stroke()
      break
    case 'shop':
      roundRect(ctx, c - 4, c - 2, 8, 6.5, 1.2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(c, c - 2, 2.4, Math.PI, 0)
      ctx.stroke()
      break
    case 'fuel':
      roundRect(ctx, c - 3.5, c - 4.5, 5.5, 9, 1)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(c + 2, c - 2)
      ctx.lineTo(c + 4, c)
      ctx.lineTo(c + 4, c + 3)
      ctx.stroke()
      break
    case 'stay':
      ctx.fillRect(c - 5, c - 1, 10, 3.5)
      ctx.fillRect(c - 5, c - 4, 2, 7.5)
      ctx.fillRect(c - 2.5, c - 3, 3.5, 2)
      break
    case 'airport':
      ctx.beginPath()
      ctx.moveTo(c, c - 5)
      ctx.lineTo(c + 1, c - 1)
      ctx.lineTo(c + 5, c + 1)
      ctx.lineTo(c + 1, c + 1)
      ctx.lineTo(c + 0.8, c + 3.5)
      ctx.lineTo(c + 2.2, c + 4.8)
      ctx.lineTo(c - 2.2, c + 4.8)
      ctx.lineTo(c - 0.8, c + 3.5)
      ctx.lineTo(c - 1, c + 1)
      ctx.lineTo(c - 5, c + 1)
      ctx.lineTo(c - 1, c - 1)
      ctx.closePath()
      ctx.fill()
      break
    default:
      ctx.beginPath()
      ctx.arc(c, c, 2.4, 0, Math.PI * 2)
      ctx.fill()
  }
  return { image: pixels(el), opts: { pixelRatio: PR } }
}

/** Register every runtime image the style uses. Safe to call again after a style change. */
export function addMapImages(map: { hasImage: (id: string) => boolean; addImage: AddImage }, theme: MapTheme) {
  const add = (id: string, made: { image: { width: number; height: number; data: Uint8ClampedArray }; opts: any }) => {
    if (!map.hasImage(id)) map.addImage(id, made.image, made.opts)
  }
  add(SHIELD_IMAGES.motorway, shield('#fcd57e', '#c8962f'))
  add(SHIELD_IMAGES.road, theme === 'dark' ? shield('#2c3531', '#55625c') : shield('#ffffff', '#b9b3a8'))
  for (const k of POI_KINDS) add(`ke-poi-${k}`, poi(k))
}

/** SVG markup for a station pin (bolt in a teardrop), coloured by status. */
export function stationPinSvg(color: string): string {
  return `<svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true" focusable="false">
  <path d="M17 43c-1.2 0-2-.8-2.7-1.9C10 34.6 2 27.3 2 17.5 2 9 8.7 2 17 2s15 7 15 15.5c0 9.8-8 17.1-12.3 23.6-.7 1.1-1.5 1.9-2.7 1.9Z" fill="${color}" stroke="#fff" stroke-width="2.5"/>
  <path d="M18.6 8.5 11 19.2h5.2l-1.6 9.3 7.8-11h-5.3l1.5-9Z" fill="#fff"/>
</svg>`
}
