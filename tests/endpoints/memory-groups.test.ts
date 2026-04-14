import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createCouple, destroyCouple, type TestCouple } from '../helpers/fixtures'
import { TestClient } from '../helpers/client'

describe('/api/memory-groups', () => {
  let couple: TestCouple
  beforeEach(async () => {
    couple = await createCouple()
  })
  afterEach(async () => {
    await destroyCouple(couple)
  })

  it('creates a memory group and returns it via GET', async () => {
    const client = new TestClient()
    await client.authenticateAs(couple.partnerA)

    const createRes = await client.postJson<{ success: boolean; data: { id: string; locket_id: string; title: string } }>(
      '/api/memory-groups',
      {
        locket_id: couple.locketId,
        title: 'Our first adventure',
        description: 'A lovely day out',
        date_taken: '2024-06-15',
        is_milestone: false,
      },
    )
    expect(createRes.status).toBe(201)
    expect(createRes.body).toHaveProperty('success', true)
    expect(createRes.body.data).toHaveProperty('id')
    expect(createRes.body.data).toHaveProperty('locket_id', couple.locketId)
    expect(createRes.body.data).toHaveProperty('title', 'Our first adventure')

    const createdId = createRes.body.data.id

    const listRes = await client.getJson<{ success: boolean; memoryGroups: Array<{ id: string }> }>(
      `/api/memory-groups?locketId=${couple.locketId}&includeMedia=false`,
    )
    expect(listRes.status).toBe(200)
    expect(listRes.body).toHaveProperty('success', true)
    expect(Array.isArray(listRes.body.memoryGroups)).toBe(true)

    const ids = listRes.body.memoryGroups.map((g) => g.id)
    expect(ids).toContain(createdId)
  })
})
