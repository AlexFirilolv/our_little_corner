import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createCouple, destroyCouple, type TestCouple } from '../helpers/fixtures'
import { TestClient } from '../helpers/client'

describe('GET /api/auth', () => {
  let couple: TestCouple
  beforeEach(async () => {
    couple = await createCouple()
  })
  afterEach(async () => {
    await destroyCouple(couple)
  })

  it('returns authenticated=true and the signed-in user', async () => {
    const client = new TestClient()
    await client.authenticateAs(couple.partnerA)

    const { status, body } = await client.getJson<{
      authenticated: boolean
      user: { uid: string; email: string | null }
    }>('/api/auth')

    expect(status).toBe(200)
    expect(body.authenticated).toBe(true)
    expect(body.user.uid).toBe(couple.partnerA.uid)
  })

  it('returns authenticated=false without a session', async () => {
    const client = new TestClient()
    const { status, body } = await client.getJson<{ authenticated: boolean }>('/api/auth')
    expect(status).toBe(200)
    expect(body.authenticated).toBe(false)
  })
})
