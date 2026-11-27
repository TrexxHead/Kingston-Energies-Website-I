/**
 * Exact-model 3D files the owner has licensed (glTF/GLB in public/models/vehicles).
 * Key: "make|model" in lower case. Empty until real, licensed models are added —
 * every car falls back to the generated body (components/garage/carBuilder.ts).
 */
export const LICENSED_MODELS: Record<string, { url: string; credit: string; licence: string }> = {}

export const licensedModelFor = (make: string, model: string) => LICENSED_MODELS[`${make.trim().toLowerCase()}|${model.trim().toLowerCase()}`] ?? null
