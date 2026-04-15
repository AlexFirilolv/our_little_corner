import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createCouple, destroyCouple, type TestCouple } from '../helpers/fixtures'
import { TestClient } from '../helpers/client'

describe('GET /api/lockets', () => {
  let couple: TestCouple
  beforeEach(async () => {
    couple = await createCouple()
  })
  afterEach(async () => {
    await destroyCouple(couple)
  })

  it("returns only the caller's locket", async () => {
    const client = new TestClient()
    await client.authenticateAs(couple.partnerA)

    const { status, body } = await client.getJson<any>('/api/lockets')

    expect(status).toBe(200)
    expect(body).toHaveProperty('success', true)
    expect(body).toHaveProperty('data')

    const lockets = body.data
    expect(Array.isArray(lockets)).toBe(true)

    const ids = lockets.map((l: any) => l.id)
    expect(ids).toContain(couple.locketId)
    expect(ids.length).toBe(1)
  })
})
