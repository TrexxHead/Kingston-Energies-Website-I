import type { BodyStyle } from './vehicle'

/**
 * Proportions for the garage's 3D model, per body style (metres). Typical
 * values for the class — the model is an illustration of the shape, not the
 * owner's exact car. x runs rear (0) → front (length).
 */
export interface BodyShape {
  length: number
  width: number
  height: number
  wheelbase: number
  /** Front overhang (front bumper to front axle). */
  frontOverhang: number
  wheelRadius: number
  clearance: number
  /** Bumper top and hood leading-edge heights. */
  noseH: number
  hoodFrontH: number
  /** Window line. */
  belt: number
  /** Windshield base, roof front/rear, rear-window base (fractions of length from the rear). */
  hoodX: number
  roofFrontX: number
  roofRearX: number
  rearWinX: number
  /** Trunk deck height and where the deck starts (sedans/coupes); for others the rear is upright. */
  deckH: number
  deckX: number
  /** Open load bed (pickups): bed runs from the rear to this fraction. */
  bedToX?: number
}

const s = (o: BodyShape) => o

export const BODY_SHAPES: Record<BodyStyle, BodyShape> = {
  hatchback: s({ length: 4.25, width: 1.79, height: 1.53, wheelbase: 2.7, frontOverhang: 0.85, wheelRadius: 0.32, clearance: 0.15, noseH: 0.6, hoodFrontH: 0.82, belt: 1.02, hoodX: 0.7, roofFrontX: 0.55, roofRearX: 0.18, rearWinX: 0.04, deckH: 1.02, deckX: 0.04 }),
  sedan: s({ length: 4.7, width: 1.83, height: 1.45, wheelbase: 2.85, frontOverhang: 0.92, wheelRadius: 0.33, clearance: 0.14, noseH: 0.58, hoodFrontH: 0.78, belt: 0.98, hoodX: 0.69, roofFrontX: 0.56, roofRearX: 0.3, rearWinX: 0.19, deckH: 1.03, deckX: 0.17 }),
  suv: s({ length: 4.75, width: 1.92, height: 1.72, wheelbase: 2.85, frontOverhang: 0.9, wheelRadius: 0.38, clearance: 0.2, noseH: 0.75, hoodFrontH: 1.0, belt: 1.18, hoodX: 0.74, roofFrontX: 0.6, roofRearX: 0.08, rearWinX: 0.03, deckH: 1.18, deckX: 0.03 }),
  crossover: s({ length: 4.45, width: 1.86, height: 1.62, wheelbase: 2.72, frontOverhang: 0.88, wheelRadius: 0.36, clearance: 0.18, noseH: 0.7, hoodFrontH: 0.94, belt: 1.1, hoodX: 0.72, roofFrontX: 0.58, roofRearX: 0.15, rearWinX: 0.04, deckH: 1.1, deckX: 0.04 }),
  pickup: s({ length: 5.3, width: 1.92, height: 1.82, wheelbase: 3.25, frontOverhang: 0.95, wheelRadius: 0.39, clearance: 0.23, noseH: 0.85, hoodFrontH: 1.1, belt: 1.22, hoodX: 0.76, roofFrontX: 0.66, roofRearX: 0.45, rearWinX: 0.43, deckH: 1.16, deckX: 0.0, bedToX: 0.42 }),
  van: s({ length: 4.95, width: 1.92, height: 1.97, wheelbase: 3.0, frontOverhang: 0.85, wheelRadius: 0.33, clearance: 0.17, noseH: 0.7, hoodFrontH: 1.0, belt: 1.16, hoodX: 0.86, roofFrontX: 0.78, roofRearX: 0.03, rearWinX: 0.02, deckH: 1.16, deckX: 0.02 }),
  coupe: s({ length: 4.5, width: 1.86, height: 1.32, wheelbase: 2.7, frontOverhang: 0.9, wheelRadius: 0.34, clearance: 0.12, noseH: 0.52, hoodFrontH: 0.72, belt: 0.92, hoodX: 0.66, roofFrontX: 0.52, roofRearX: 0.36, rearWinX: 0.12, deckH: 0.97, deckX: 0.1 }),
  wagon: s({ length: 4.8, width: 1.83, height: 1.5, wheelbase: 2.86, frontOverhang: 0.92, wheelRadius: 0.33, clearance: 0.14, noseH: 0.58, hoodFrontH: 0.79, belt: 1.0, hoodX: 0.69, roofFrontX: 0.56, roofRearX: 0.08, rearWinX: 0.03, deckH: 1.0, deckX: 0.03 }),
}

/**
 * Exact-model 3D files the owner has licensed (glTF/GLB in public/models/vehicles).
 * Key: "make|model" in lower case. Empty until real, licensed models are added —
 * every car falls back to the generated body above.
 */
export const LICENSED_MODELS: Record<string, { url: string; credit: string; licence: string }> = {}

export const licensedModelFor = (make: string, model: string) => LICENSED_MODELS[`${make.trim().toLowerCase()}|${model.trim().toLowerCase()}`] ?? null
