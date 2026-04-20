import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createCouple, destroyCouple, type TestCouple } from '../helpers/fixtures'
import { TestClient } from '../helpers/client'

const auth = async (p: { mintIdToken: () => Promise<string> }) =>
  ({ Authorization: `Bearer ${await p.mintIdToken()}` })

describe('/api/gratitudes', () => {
  let couple: TestCouple
  beforeEach(async () => { couple = await createCouple() })
  afterEach(async () => { await destroyCouple(couple) })

  it('POST creates gratitude addressed to partner', async () => {
    const c = new TestClient()
    const res = await c.fetch('/api/gratitudes', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await auth(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, text: 'thanks for coffee' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.gratitude.from_uid).toBe(couple.partnerA.uid)
    expect(body.gratitude.to_uid).toBe(couple.partnerB.uid)
  })

  it('POST without partner returns 400 no_partner', async () => {
    const { query } = await import('../helpers/db')
    await query(`DELETE FROM locket_users WHERE locket_id=$1 AND firebase_uid=$2`, [couple.locketId, couple.partnerB.uid])
    const c = new TestClient()
    const res = await c.fetch('/api/gratitudes', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await auth(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, text: 'hi' }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('no_partner')
  })

  it('GET returns ordered list', async () => {
    const c = new TestClient()
    await c.fetch('/api/gratitudes', { method: 'POST', headers: { 'content-type': 'application/json', ...(await auth(couple.partnerA)) }, body: JSON.stringify({ locketId: couple.locketId, text: 'one' }) })
    await c.fetch('/api/gratitudes', { method: 'POST', headers: { 'content-type': 'application/json', ...(await auth(couple.partnerA)) }, body: JSON.stringify({ locketId: couple.locketId, text: 'two' }) })
    const res = await c.fetch(`/api/gratitudes?locketId=${couple.locketId}`, { headers: await auth(couple.partnerA) })
    const body = await res.json()
    expect(body.gratitudes[0].text).toBe('two')
  })

  it('POST /:id/seen marks seen only for recipient', async () => {
    const c = new TestClient()
    const create = await c.fetch('/api/gratitudes', { method: 'POST', headers: { 'content-type': 'application/json', ...(await auth(couple.partnerA)) }, body: JSON.stringify({ locketId: couple.locketId, text: 'x' }) })
    const { gratitude } = await create.json()
    const res = await c.fetch(`/api/gratitudes/${gratitude.id}/seen`, { method: 'POST', headers: await auth(couple.partnerB) })
    expect(res.status).toBe(200)
    const after = await res.json()
    expect(after.gratitude.seen_at).not.toBeNull()
  })
})
