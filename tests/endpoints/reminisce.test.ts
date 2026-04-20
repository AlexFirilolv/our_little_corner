import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createCouple, destroyCouple, type TestCouple } from '../helpers/fixtures'
import { TestClient } from '../helpers/client'
import { query } from '../helpers/db'

const auth = async (p: { mintIdToken: () => Promise<string> }) =>
  ({ Authorization: `Bearer ${await p.mintIdToken()}` })

describe('GET /api/reminisce', () => {
  let couple: TestCouple
  beforeEach(async () => { couple = await createCouple() })
  afterEach(async () => { await destroyCouple(couple) })

  it('returns memories from prior years matching today', async () => {
    const today = new Date()
    const lastYear = new Date(Date.UTC(today.getFullYear() - 1, today.getMonth(), today.getDate(), 12))
    await query(
      `INSERT INTO memory_groups (locket_id, title, date_taken, created_by_firebase_uid)
       VALUES ($1, 'Old Memory', $2, $3)`,
      [couple.locketId, lastYear.toISOString(), couple.partnerA.uid],
    )
    const c = new TestClient()
    const res = await c.fetch(`/api/reminisce?locketId=${couple.locketId}`, { headers: await auth(couple.partnerA) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.memories.length).toBe(1)
    expect(body.memories[0].title).toBe('Old Memory')
  })

  it('excludes memories from today/future', async () => {
    const today = new Date()
    const thisYear = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12))
    await query(
      `INSERT INTO memory_groups (locket_id, title, date_taken, created_by_firebase_uid)
       VALUES ($1, 'Today Memory', $2, $3)`,
      [couple.locketId, thisYear.toISOString(), couple.partnerA.uid],
    )
    const c = new TestClient()
    const res = await c.fetch(`/api/reminisce?locketId=${couple.locketId}`, { headers: await auth(couple.partnerA) })
    expect(res.status).toBe(200)
    expect((await res.json()).memories).toHaveLength(0)
  })

  it('returns 403 for non-member', async () => {
    const other = await createCouple()
    const c = new TestClient()
    const res = await c.fetch(`/api/reminisce?locketId=${couple.locketId}`, { headers: await auth(other.partnerA) })
    expect(res.status).toBe(403)
    await destroyCouple(other)
  })
})
