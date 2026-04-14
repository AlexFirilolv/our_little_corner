import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createCouple, destroyCouple, type TestCouple } from '../helpers/fixtures'
import { TestClient } from '../helpers/client'

describe('tenant isolation', () => {
  let coupleA: TestCouple
  let coupleB: TestCouple

  beforeEach(async () => {
    coupleA = await createCouple()
    coupleB = await createCouple()
  })
  afterEach(async () => {
    await destroyCouple(coupleA)
    await destroyCouple(coupleB)
  })

  it("partner in couple A cannot see couple B's locket", async () => {
    const client = new TestClient()
    await client.authenticateAs(coupleA.partnerA)

    const { status, body } = await client.getJson<{ success: boolean; data: Array<{ id: string }> }>(
      '/api/lockets',
    )

    expect(status).toBe(200)
    const ids = (body.data ?? []).map((l) => l.id)
    expect(ids).toContain(coupleA.locketId)
    expect(ids).not.toContain(coupleB.locketId)
  })
})
