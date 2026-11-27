import { describe, it, expect } from 'vitest'
import { publishProblem, installerInputSchema } from '@/lib/installers'

const ok = { licenceType: 'Licensed electrician (GEI)', evidenceNote: 'Saw the original licence card, 14 Oct 2026', verifiedAt: '2026-10-14T10:00:00Z', verifiedBy: 'a@x.jm', licenceExpires: '2027-06-30T00:00:00Z' }
const now = new Date('2026-10-14T12:00:00Z')

describe('installer publishing', () => {
  it('needs licence type, a real evidence note and a verification', () => {
    expect(publishProblem(ok, now)).toBeNull()
    expect(publishProblem({ ...ok, licenceType: ' ' }, now)).toMatch(/licence type/)
    expect(publishProblem({ ...ok, evidenceNote: 'seen' }, now)).toMatch(/evidence/)
    expect(publishProblem({ ...ok, verifiedAt: null }, now)).toMatch(/verify/)
  })
  it('drops an expired licence, keeps one with no expiry recorded', () => {
    expect(publishProblem({ ...ok, licenceExpires: '2026-10-01T00:00:00Z' }, now)).toMatch(/expired/)
    expect(publishProblem({ ...ok, licenceExpires: null }, now)).toBeNull()
  })
  it('accepts blank optional contact fields and rejects a bad website', () => {
    const base = { name: 'Jane Brown', parishes: ['kingston'], services: ['Solar PV'] }
    expect(installerInputSchema.safeParse({ ...base, email: '', website: '' }).success).toBe(true)
    expect(installerInputSchema.safeParse({ ...base, website: 'not a url' }).success).toBe(false)
  })
})

import { toJamaicaE164, templateBody, sendWhatsAppTemplate } from '@/lib/whatsapp'

describe('whatsapp', () => {
  it('normalises Jamaican numbers and rejects others', () => {
    expect(toJamaicaE164('876-338-9958')).toBe('18763389958')
    expect(toJamaicaE164('(876) 338 9958')).toBe('18763389958')
    expect(toJamaicaE164('+1 658 123 4567')).toBe('16581234567')
    expect(toJamaicaE164('338-9958')).toBe('18763389958')
    expect(toJamaicaE164('+44 20 7946 0958')).toBeNull()
  })
  it('builds a Cloud API template body', () => {
    expect(templateBody('18763389958', 'booking_received', 'en', ['Jane', 'Site survey'])).toEqual({
      messaging_product: 'whatsapp',
      to: '18763389958',
      type: 'template',
      template: { name: 'booking_received', language: { code: 'en' }, components: [{ type: 'body', parameters: [{ type: 'text', text: 'Jane' }, { type: 'text', text: 'Site survey' }] }] },
    })
  })
  it('never sends without consent or configuration', async () => {
    expect(await sendWhatsAppTemplate({ to: '8763389958', template: 't', bodyParams: [], consent: false })).toEqual({ sent: false, reason: 'no consent' })
    expect((await sendWhatsAppTemplate({ to: '8763389958', template: 't', bodyParams: [], consent: true })).sent).toBe(false)
  })
})
