import { describe, it, expect } from 'vitest'
import { assertTestDatabase } from './db'

describe('assertTestDatabase', () => {
  it('accepts URLs whose database ends in _test', () => {
    expect(() =>
      assertTestDatabase('postgresql://u:p@h:5432/twofold_test'),
    ).not.toThrow()
  })

  it('rejects URLs whose database does not end in _test', () => {
    expect(() =>
      assertTestDatabase('postgresql://u:p@h:5432/twofold'),
    ).toThrow(/must target a database ending in _test/)
  })

  it('rejects URLs without a database name', () => {
    expect(() =>
      assertTestDatabase('postgresql://u:p@h:5432/'),
    ).toThrow(/must target a database ending in _test/)
  })
})
