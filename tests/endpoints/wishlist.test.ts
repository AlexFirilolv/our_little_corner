import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createCouple, destroyCouple, type TestCouple } from '../helpers/fixtures'
import { TestClient } from '../helpers/client'

const h = async (p: { mintIdToken: () => Promise<string> }) => ({ Authorization: `Bearer ${await p.mintIdToken()}` })

describe('/api/wishlist', () => {
  let couple: TestCouple
  beforeEach(async () => { couple = await createCouple() })
  afterEach(async () => { await destroyCouple(couple) })

  it('POST creates an item and GET returns it', async () => {
    const c = new TestClient()
    const create = await c.fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, title: 'New blender', url: 'https://example.com', price_cents: 9999 }),
    })
    expect(create.status).toBe(200)
    const created = (await create.json()).item
    expect(created.title).toBe('New blender')
    expect(created.added_by).toBe(couple.partnerA.uid)
    expect(created.status).toBe('open')
    expect(created.for_uid).toBeNull()

    const get = await c.fetch(`/api/wishlist?locketId=${couple.locketId}`, { headers: await h(couple.partnerA) })
    expect(get.status).toBe(200)
    const { items } = await get.json()
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe(created.id)
  })

  it('POST with no title returns 400', async () => {
    const c = new TestClient()
    const res = await c.fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('title_required')
  })

  it('POST with invalid JSON returns 400', async () => {
    const c = new TestClient()
    const res = await c.fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: '{not json',
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_json')
  })

  it('PATCH updates status and DELETE soft-removes', async () => {
    const c = new TestClient()
    const create = await c.fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, title: 'Thing' }),
    })
    const item = (await create.json()).item

    const patch = await c.fetch(`/api/wishlist/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, status: 'gifted', notes: 'done' }),
    })
    expect(patch.status).toBe(200)
    const patched = (await patch.json()).item
    expect(patched.status).toBe('gifted')
    expect(patched.notes).toBe('done')

    const del = await c.fetch(`/api/wishlist/${item.id}?locketId=${couple.locketId}`, {
      method: 'DELETE',
      headers: await h(couple.partnerA),
    })
    expect(del.status).toBe(200)

    // After soft-remove, GET should not include it
    const get = await c.fetch(`/api/wishlist?locketId=${couple.locketId}`, { headers: await h(couple.partnerA) })
    const { items } = await get.json()
    expect(items.find((i: { id: string }) => i.id === item.id)).toBeUndefined()
  })

  it('PATCH with bogus id returns 404', async () => {
    const c = new TestClient()
    const bogusId = '00000000-0000-0000-0000-000000000000'
    const res = await c.fetch(`/api/wishlist/${bogusId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, status: 'gifted' }),
    })
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('not_found')
  })

  it('DELETE with bogus id returns 404', async () => {
    const c = new TestClient()
    const bogusId = '00000000-0000-0000-0000-000000000000'
    const res = await c.fetch(`/api/wishlist/${bogusId}?locketId=${couple.locketId}`, {
      method: 'DELETE',
      headers: await h(couple.partnerA),
    })
    expect(res.status).toBe(404)
  })

  it('GET enforces tenant isolation', async () => {
    const otherCouple = await createCouple()
    try {
      const c = new TestClient()
      const res = await c.fetch(`/api/wishlist?locketId=${couple.locketId}`, {
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
      const res = await c.fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await h(otherCouple.partnerA)) },
        body: JSON.stringify({ locketId: couple.locketId, title: 'Sneaky' }),
      })
      expect(res.status).toBe(403)
    } finally {
      await destroyCouple(otherCouple)
    }
  })

  describe('surprise rule', () => {
    it('hides partner-added gift FOR me, but shows it to the giver', async () => {
      const c = new TestClient()
      // Partner A adds a gift FOR Partner B
      const create = await c.fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
        body: JSON.stringify({ locketId: couple.locketId, title: 'Surprise watch', for_uid: couple.partnerB.uid }),
      })
      expect(create.status).toBe(200)

      // Partner B should NOT see it
      const asB = await c.fetch(`/api/wishlist?locketId=${couple.locketId}`, { headers: await h(couple.partnerB) })
      expect((await asB.json()).items).toHaveLength(0)

      // Partner A SHOULD see it
      const asA = await c.fetch(`/api/wishlist?locketId=${couple.locketId}`, { headers: await h(couple.partnerA) })
      const aItems = (await asA.json()).items
      expect(aItems).toHaveLength(1)
      expect(aItems[0].title).toBe('Surprise watch')
    })

    it('shared (for_uid null) and self-added items visible to both', async () => {
      const c = new TestClient()
      await c.fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
        body: JSON.stringify({ locketId: couple.locketId, title: 'New blender' }),
      })
      await c.fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await h(couple.partnerB)) },
        body: JSON.stringify({ locketId: couple.locketId, title: 'My headphones', for_uid: couple.partnerB.uid }),
      })
      const asA = await c.fetch(`/api/wishlist?locketId=${couple.locketId}`, { headers: await h(couple.partnerA) })
      const asB = await c.fetch(`/api/wishlist?locketId=${couple.locketId}`, { headers: await h(couple.partnerB) })
      expect((await asA.json()).items).toHaveLength(2)
      expect((await asB.json()).items).toHaveLength(2)
    })

    it('item for_uid matching self but added_by self is visible (self-added for me)', async () => {
      const c = new TestClient()
      await c.fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
        body: JSON.stringify({ locketId: couple.locketId, title: 'My own wish', for_uid: couple.partnerA.uid }),
      })
      const asA = await c.fetch(`/api/wishlist?locketId=${couple.locketId}`, { headers: await h(couple.partnerA) })
      expect((await asA.json()).items).toHaveLength(1)
    })

    it('intended recipient cannot PATCH a partner-added surprise (404)', async () => {
      const c = new TestClient()
      const create = await c.fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
        body: JSON.stringify({ locketId: couple.locketId, title: 'Surprise ring', for_uid: couple.partnerB.uid }),
      })
      const item = (await create.json()).item
      const res = await c.fetch(`/api/wishlist/${item.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', ...(await h(couple.partnerB)) },
        body: JSON.stringify({ locketId: couple.locketId, status: 'gifted' }),
      })
      expect(res.status).toBe(404)
      expect((await res.json()).error).toBe('not_found')
    })

    it('intended recipient cannot DELETE a partner-added surprise (404)', async () => {
      const c = new TestClient()
      const create = await c.fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
        body: JSON.stringify({ locketId: couple.locketId, title: 'Surprise bag', for_uid: couple.partnerB.uid }),
      })
      const item = (await create.json()).item
      const res = await c.fetch(`/api/wishlist/${item.id}?locketId=${couple.locketId}`, {
        method: 'DELETE',
        headers: await h(couple.partnerB),
      })
      expect(res.status).toBe(404)
    })

    it('self-added item for self is still PATCH-able by self', async () => {
      const c = new TestClient()
      const create = await c.fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
        body: JSON.stringify({ locketId: couple.locketId, title: 'My wish', for_uid: couple.partnerA.uid }),
      })
      const item = (await create.json()).item
      const res = await c.fetch(`/api/wishlist/${item.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
        body: JSON.stringify({ locketId: couple.locketId, notes: 'updated' }),
      })
      expect(res.status).toBe(200)
      expect((await res.json()).item.notes).toBe('updated')
    })
  })
})
