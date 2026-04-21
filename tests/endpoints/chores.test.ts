import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createCouple, destroyCouple, type TestCouple } from '../helpers/fixtures'
import { TestClient } from '../helpers/client'
import { query } from '../helpers/db'

const h = async (p: { mintIdToken: () => Promise<string> }) => ({
  Authorization: `Bearer ${await p.mintIdToken()}`,
})

describe('/api/chores', () => {
  let couple: TestCouple
  beforeEach(async () => {
    couple = await createCouple()
  })
  afterEach(async () => {
    await destroyCouple(couple)
  })

  it('POST creates a chore and GET returns it', async () => {
    const c = new TestClient()
    const create = await c.fetch('/api/chores', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, name: 'Trash', cadence_days: 7 }),
    })
    expect(create.status).toBe(200)
    const { chore } = await create.json()
    expect(chore.name).toBe('Trash')
    expect(chore.cadence_days).toBe(7)
    expect(chore.streak).toBe(0)
    expect(chore.last_done_by).toBeNull()

    const get = await c.fetch(`/api/chores?locketId=${couple.locketId}`, {
      headers: await h(couple.partnerA),
    })
    expect(get.status).toBe(200)
    const { chores } = await get.json()
    expect(chores).toHaveLength(1)
    expect(chores[0].id).toBe(chore.id)
  })

  it('POST without name returns 400', async () => {
    const c = new TestClient()
    const res = await c.fetch('/api/chores', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, cadence_days: 7 }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('name_required')
  })

  it('POST with invalid cadence returns 400', async () => {
    const c = new TestClient()
    const res = await c.fetch('/api/chores', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, name: 'X', cadence_days: 0 }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_cadence')
  })

  it('POST with invalid JSON returns 400', async () => {
    const c = new TestClient()
    const res = await c.fetch('/api/chores', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: '{not json',
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_json')
  })

  it('PATCH updates and DELETE removes', async () => {
    const c = new TestClient()
    const create = await c.fetch('/api/chores', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, name: 'Dishes', cadence_days: 2 }),
    })
    const { chore } = await create.json()

    const patch = await c.fetch(`/api/chores/${chore.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, name: 'Dishwasher', cadence_days: 3 }),
    })
    expect(patch.status).toBe(200)
    const patched = (await patch.json()).chore
    expect(patched.name).toBe('Dishwasher')
    expect(patched.cadence_days).toBe(3)

    const del = await c.fetch(`/api/chores/${chore.id}?locketId=${couple.locketId}`, {
      method: 'DELETE',
      headers: await h(couple.partnerA),
    })
    expect(del.status).toBe(200)

    const get = await c.fetch(`/api/chores?locketId=${couple.locketId}`, {
      headers: await h(couple.partnerA),
    })
    const { chores } = await get.json()
    expect(chores).toHaveLength(0)
  })

  it('PATCH bogus id returns 404', async () => {
    const c = new TestClient()
    const bogusId = '00000000-0000-0000-0000-000000000000'
    const res = await c.fetch(`/api/chores/${bogusId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, name: 'x' }),
    })
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('not_found')
  })

  it('DELETE bogus id returns 404', async () => {
    const c = new TestClient()
    const bogusId = '00000000-0000-0000-0000-000000000000'
    const res = await c.fetch(`/api/chores/${bogusId}?locketId=${couple.locketId}`, {
      method: 'DELETE',
      headers: await h(couple.partnerA),
    })
    expect(res.status).toBe(404)
  })

  it('GET enforces tenant isolation', async () => {
    const otherCouple = await createCouple()
    try {
      const c = new TestClient()
      const res = await c.fetch(`/api/chores?locketId=${couple.locketId}`, {
        headers: await h(otherCouple.partnerA),
      })
      expect(res.status).toBe(403)
    } finally {
      await destroyCouple(otherCouple)
    }
  })

  it('POST enforces tenant isolation', async () => {
    const otherCouple = await createCouple()
    try {
      const c = new TestClient()
      const res = await c.fetch('/api/chores', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await h(otherCouple.partnerA)) },
        body: JSON.stringify({ locketId: couple.locketId, name: 'Sneaky', cadence_days: 7 }),
      })
      expect(res.status).toBe(403)
    } finally {
      await destroyCouple(otherCouple)
    }
  })

  it('complete on-time bumps streak by 1 and sets last_done_by', async () => {
    const c = new TestClient()
    const create = await c.fetch('/api/chores', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, name: 'Trash', cadence_days: 7 }),
    })
    const { chore } = await create.json()
    expect(chore.streak).toBe(0)

    const done = await c.fetch(
      `/api/chores/${chore.id}/complete?locketId=${couple.locketId}`,
      { method: 'POST', headers: await h(couple.partnerA) },
    )
    expect(done.status).toBe(200)
    const after = (await done.json()).chore
    expect(after.streak).toBe(1)
    expect(after.last_done_by).toBe(couple.partnerA.uid)
    expect(after.last_done_at).not.toBeNull()
    // next_due_at should have advanced to roughly now + 7 days
    const nextDue = new Date(after.next_due_at).getTime()
    const expected = Date.now() + 7 * 24 * 3600 * 1000
    expect(Math.abs(nextDue - expected)).toBeLessThan(60 * 1000)
  })

  it('complete late resets streak to 1', async () => {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO chores (locket_id, name, cadence_days, next_due_at, streak)
       VALUES ($1, 'X', 7, NOW() - INTERVAL '2 days', 5) RETURNING id`,
      [couple.locketId],
    )
    const c = new TestClient()
    const res = await c.fetch(
      `/api/chores/${rows[0].id}/complete?locketId=${couple.locketId}`,
      { method: 'POST', headers: await h(couple.partnerA) },
    )
    expect(res.status).toBe(200)
    const { chore } = await res.json()
    expect(chore.streak).toBe(1)
    expect(chore.last_done_by).toBe(couple.partnerA.uid)
  })

  it('complete on bogus id returns 404', async () => {
    const c = new TestClient()
    const bogusId = '00000000-0000-0000-0000-000000000000'
    const res = await c.fetch(
      `/api/chores/${bogusId}/complete?locketId=${couple.locketId}`,
      { method: 'POST', headers: await h(couple.partnerA) },
    )
    expect(res.status).toBe(404)
  })

  it('complete enforces tenant isolation', async () => {
    const c = new TestClient()
    const create = await c.fetch('/api/chores', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, name: 'Trash', cadence_days: 7 }),
    })
    const { chore } = await create.json()

    const otherCouple = await createCouple()
    try {
      const res = await c.fetch(
        `/api/chores/${chore.id}/complete?locketId=${couple.locketId}`,
        { method: 'POST', headers: await h(otherCouple.partnerA) },
      )
      expect(res.status).toBe(403)
    } finally {
      await destroyCouple(otherCouple)
    }
  })
})
