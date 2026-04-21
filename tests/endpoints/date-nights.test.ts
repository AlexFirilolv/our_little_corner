import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createCouple, destroyCouple, type TestCouple } from '../helpers/fixtures'
import { TestClient } from '../helpers/client'

const headers = async (p: { mintIdToken: () => Promise<string> }) => ({ Authorization: `Bearer ${await p.mintIdToken()}` })

describe('/api/date-nights', () => {
  let couple: TestCouple
  beforeEach(async () => { couple = await createCouple() })
  afterEach(async () => { await destroyCouple(couple) })

  it('GET ideas returns array filterable by vibe', async () => {
    const c = new TestClient()
    const res = await c.fetch('/api/date-nights/ideas?vibe=cozy', { headers: await headers(couple.partnerA) })
    const body = await res.json()
    expect(body.ideas.every((i: { vibe: string }) => i.vibe === 'cozy')).toBe(true)
  })

  it('POST + PATCH pick lifecycle', async () => {
    const c = new TestClient()
    const create = await c.fetch('/api/date-nights/picks', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await headers(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, idea_id: 'puzzle-night' }),
    })
    expect(create.status).toBe(200)
    const { pick } = await create.json()
    const patch = await c.fetch(`/api/date-nights/picks/${pick.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...(await headers(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, status: 'completed' }),
    })
    expect(patch.status).toBe(200)
    const patched = (await patch.json()).pick
    expect(patched.status).toBe('completed')
    expect(patched.completed_at).not.toBeNull()

    const revert = await c.fetch(`/api/date-nights/picks/${pick.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...(await headers(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, status: 'saved' }),
    })
    expect(revert.status).toBe(200)
    const reverted = (await revert.json()).pick
    expect(reverted.status).toBe('saved')
    expect(reverted.completed_at).toBeNull()
  })

  it('GET picks enforces tenant isolation', async () => {
    const otherCouple = await createCouple()
    try {
      const c = new TestClient()
      const res = await c.fetch(`/api/date-nights/picks?locketId=${couple.locketId}`, {
        headers: await headers(otherCouple.partnerA),
      })
      expect(res.status).toBe(403)
    } finally {
      await destroyCouple(otherCouple)
    }
  })
})
