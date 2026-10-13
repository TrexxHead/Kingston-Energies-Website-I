import { cleanKey, embedKey } from '@/lib/map/embed'

/** Google keys are read at build time (NEXT_PUBLIC_*), so a redeploy is needed after changing them. */
export const GOOGLE_BROWSER_KEY = cleanKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY)
export const GOOGLE_MAP_ID = cleanKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID)
export const GOOGLE_EMBED_KEY = embedKey()
/** Per-station Google embeds are offered only when the full Google map isn't available. */
export const GOOGLE_EMBED_ONLY = !GOOGLE_BROWSER_KEY && !!GOOGLE_EMBED_KEY
