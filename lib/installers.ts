import { z } from 'zod'

/**
 * Verified installer directory (roadmap W4). An installer is listed only
 * when staff have SEEN licence evidence, written down what they saw, and
 * a named admin verified it — and only while the licence is in date.
 */

export const INSTALLER_SERVICES = ['Solar PV', 'Battery / backup systems', 'EV charger installs', 'Electrical wiring', 'Solar water heating', 'Solar water pumps'] as const

export const installerInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  business: z.string().trim().max(120).nullable().optional(),
  parishes: z.array(z.string().max(40)).max(14),
  services: z.array(z.string().max(60)).max(12),
  phone: z.string().trim().max(40).nullable().optional(),
  email: z.string().trim().email().max(200).nullable().optional().or(z.literal('').transform(() => null)),
  website: z.string().trim().url().max(300).nullable().optional().or(z.literal('').transform(() => null)),
  licenceType: z.string().trim().max(160).nullable().optional(),
  licenceNumber: z.string().trim().max(80).nullable().optional(),
  licenceExpires: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().or(z.literal('').transform(() => null)),
  evidenceNote: z.string().trim().max(2000).nullable().optional(),
})

export interface InstallerLike {
  licenceType: string | null
  evidenceNote: string | null
  verifiedAt: Date | string | null
  verifiedBy: string | null
  licenceExpires: Date | string | null
}

/** Why this installer can't be (or stay) public; null when it can. */
export function publishProblem(i: InstallerLike, now = new Date()): string | null {
  if (!i.licenceType?.trim()) return 'Record the licence type.'
  if (!i.evidenceNote?.trim() || i.evidenceNote.trim().length < 15) return 'Write down what licence evidence you saw, where and when.'
  if (!i.verifiedAt || !i.verifiedBy) return 'An admin must verify the evidence first.'
  if (i.licenceExpires && new Date(i.licenceExpires).getTime() < now.getTime()) return 'The licence has expired.'
  return null
}
