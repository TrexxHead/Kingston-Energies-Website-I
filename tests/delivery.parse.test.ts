import { describe, it, expect } from 'vitest'
import { parseShippingAddress, guessDeliveryMethod, PICKUP_LOCATIONS } from '@/lib/delivery'

describe('parseShippingAddress', () => {
  it('parses a pickup address and matches the real location', () => {
    const addr = `Pickup: ${PICKUP_LOCATIONS[0].name}, ${PICKUP_LOCATIONS[0].address}`
    const parsed = parseShippingAddress(addr)
    expect(parsed.pickup).toBe(true)
    expect(parsed.pickupLocationIndex).toBe(0)
  })

  it('returns a null index for a pickup address that no longer matches a known location', () => {
    const parsed = parseShippingAddress('Pickup: Some Old Closed Store, 1 Nowhere Rd')
    expect(parsed.pickup).toBe(true)
    expect(parsed.pickupLocationIndex).toBeNull()
  })

  it('splits a delivery address into street and parish', () => {
    const parsed = parseShippingAddress('12 Hope Road, Kingston')
    expect(parsed.pickup).toBe(false)
    expect(parsed.street).toBe('12 Hope Road')
    expect(parsed.parish).toBe('Kingston')
  })

  it('handles a missing or empty address', () => {
    expect(parseShippingAddress(null)).toEqual({ pickup: false, pickupLocationIndex: null, street: '', parish: '' })
    expect(parseShippingAddress('')).toEqual({ pickup: false, pickupLocationIndex: null, street: '', parish: '' })
  })
})

describe('guessDeliveryMethod', () => {
  it('reads pickup off the shipping address', () => {
    expect(guessDeliveryMethod([], 'Pickup: Webster Memorial United Church, 53 Halfway Tree Road')).toBe('pickup')
  })

  it('reads express off a matching delivery line item', () => {
    expect(guessDeliveryMethod([{ name: 'Delivery: Express (Kingston Energies courier, Kingston)' }], '12 Hope Road, Kingston')).toBe('express')
  })

  it('defaults to standard when no express line or pickup address is present', () => {
    expect(guessDeliveryMethod([{ name: 'Delivery: Standard (Kingston Energies courier, Kingston)' }], '12 Hope Road, Kingston')).toBe('standard')
    expect(guessDeliveryMethod([], '12 Hope Road, Kingston')).toBe('standard')
  })
})
