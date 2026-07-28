import { describe, it, expect } from 'vitest'
import { Prisma } from '@prisma/client'
import { isMissingSchemaError } from '../lib/prisma'

function knownError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('boom', { code, clientVersion: '5.0.0' })
}

describe('isMissingSchemaError', () => {
  it('recognises a missing table (P2021)', () => {
    expect(isMissingSchemaError(knownError('P2021'))).toBe(true)
  })

  it('recognises a missing column (P2022)', () => {
    expect(isMissingSchemaError(knownError('P2022'))).toBe(true)
  })

  it('does not treat an unrelated Prisma error as a missing-schema error', () => {
    // A real bug (e.g. a unique constraint violation) must still surface as
    // a genuine 500, not get swallowed as "pending migration".
    expect(isMissingSchemaError(knownError('P2002'))).toBe(false)
  })

  it('does not treat a plain Error as a schema error', () => {
    expect(isMissingSchemaError(new Error('connection refused'))).toBe(false)
  })

  it('does not treat a non-error value as a schema error', () => {
    expect(isMissingSchemaError('P2021')).toBe(false)
    expect(isMissingSchemaError(null)).toBe(false)
  })
})
