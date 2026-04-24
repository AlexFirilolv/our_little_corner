import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createCouple, destroyCouple, type TestCouple } from '../helpers/fixtures'
import { TestClient } from '../helpers/client'

const h = async (p: { mintIdToken: () => Promise<string> }) => ({
  Authorization: `Bearer ${await p.mintIdToken()}`,
})

describe('/api/grocery', () => {
  let couple: TestCouple
  beforeEach(async () => {
    couple = await createCouple()
  })
  afterEach(async () => {
    await destroyCouple(couple)
  })

  it('POST creates and GET returns items', async () => {
    const c = new TestClient()
    const create = await c.fetch('/api/grocery', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, name: 'Milk', qty: '2L' }),
    })
    expect(create.status).toBe(200)
    const { item } = await create.json()
    expect(item.name).toBe('Milk')
    expect(item.qty).toBe('2L')
    expect(item.checked).toBe(false)
    expect(item.added_by).toBe(couple.partnerA.uid)

    const get = await c.fetch(`/api/grocery?locketId=${couple.locketId}`, {
      headers: await h(couple.partnerA),
    })
    expect(get.status).toBe(200)
    const { items } = await get.json()
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe(item.id)
  })

  it('POST without name returns 400', async () => {
    const c = new TestClient()
    const res = await c.fetch('/api/grocery', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('name_required')
  })

  it('POST with whitespace-only name returns 400', async () => {
    const c = new TestClient()
    const res = await c.fetch('/api/grocery', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, name: '   ' }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('name_required')
  })

  it('POST with invalid JSON returns 400', async () => {
    const c = new TestClient()
    const res = await c.fetch('/api/grocery', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: '{not json',
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_json')
  })

  it('PATCH checked=true sets checked_by and checked_at', async () => {
    const c = new TestClient()
    const create = await c.fetch('/api/grocery', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, name: 'Eggs' }),
    })
    const { item } = await create.json()

    const patch = await c.fetch(`/api/grocery/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerB)) },
      body: JSON.stringify({ locketId: couple.locketId, checked: true }),
    })
    expect(patch.status).toBe(200)
    const updated = (await patch.json()).item
    expect(updated.checked).toBe(true)
    expect(updated.checked_by).toBe(couple.partnerB.uid)
    expect(updated.checked_at).not.toBeNull()
  })

  it('PATCH checked=false clears checked_by and checked_at', async () => {
    const c = new TestClient()
    const create = await c.fetch('/api/grocery', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, name: 'Bread' }),
    })
    const { item } = await create.json()

    await c.fetch(`/api/grocery/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerB)) },
      body: JSON.stringify({ locketId: couple.locketId, checked: true }),
    })
    const unpatch = await c.fetch(`/api/grocery/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, checked: false }),
    })
    expect(unpatch.status).toBe(200)
    const cleared = (await unpatch.json()).item
    expect(cleared.checked).toBe(false)
    expect(cleared.checked_by).toBeNull()
    expect(cleared.checked_at).toBeNull()
  })

  it('PATCH can update name and qty', async () => {
    const c = new TestClient()
    const create = await c.fetch('/api/grocery', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, name: 'Milk' }),
    })
    const { item } = await create.json()

    const patch = await c.fetch(`/api/grocery/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, name: 'Oat Milk', qty: '1L' }),
    })
    expect(patch.status).toBe(200)
    const updated = (await patch.json()).item
    expect(updated.name).toBe('Oat Milk')
    expect(updated.qty).toBe('1L')
  })

  it('PATCH with empty name returns 400', async () => {
    const c = new TestClient()
    const create = await c.fetch('/api/grocery', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, name: 'Milk' }),
    })
    const { item } = await create.json()
    const res = await c.fetch(`/api/grocery/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, name: '   ' }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('name_required')
  })

  it('PATCH on bogus id returns 404', async () => {
    const c = new TestClient()
    const bogusId = '00000000-0000-0000-0000-000000000000'
    const res = await c.fetch(`/api/grocery/${bogusId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, checked: true }),
    })
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('not_found')
  })

  it('DELETE removes item', async () => {
    const c = new TestClient()
    const create = await c.fetch('/api/grocery', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, name: 'Cheese' }),
    })
    const { item } = await create.json()

    const del = await c.fetch(`/api/grocery/${item.id}?locketId=${couple.locketId}`, {
      method: 'DELETE',
      headers: await h(couple.partnerA),
    })
    expect(del.status).toBe(200)

    const get = await c.fetch(`/api/grocery?locketId=${couple.locketId}`, {
      headers: await h(couple.partnerA),
    })
    expect((await get.json()).items).toHaveLength(0)
  })

  it('DELETE bogus id returns 404', async () => {
    const c = new TestClient()
    const bogusId = '00000000-0000-0000-0000-000000000000'
    const res = await c.fetch(`/api/grocery/${bogusId}?locketId=${couple.locketId}`, {
      method: 'DELETE',
      headers: await h(couple.partnerA),
    })
    expect(res.status).toBe(404)
  })

  it('clear-checked removes only checked items', async () => {
    const c = new TestClient()
    const a = await c.fetch('/api/grocery', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, name: 'Apples' }),
    })
    const { item: apples } = await a.json()
    const b = await c.fetch('/api/grocery', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, name: 'Bananas' }),
    })
    const { item: bananas } = await b.json()

    await c.fetch(`/api/grocery/${apples.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, checked: true }),
    })

    const clear = await c.fetch('/api/grocery/clear-checked', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerB)) },
      body: JSON.stringify({ locketId: couple.locketId }),
    })
    expect(clear.status).toBe(200)

    const list = await c.fetch(`/api/grocery?locketId=${couple.locketId}`, {
      headers: await h(couple.partnerA),
    })
    const { items } = await list.json()
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe(bananas.id)
  })

  it('GET enforces tenant isolation', async () => {
    const otherCouple = await createCouple()
    try {
      const c = new TestClient()
      const res = await c.fetch(`/api/grocery?locketId=${couple.locketId}`, {
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
      const res = await c.fetch('/api/grocery', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await h(otherCouple.partnerA)) },
        body: JSON.stringify({ locketId: couple.locketId, name: 'Sneaky' }),
      })
      expect(res.status).toBe(403)
    } finally {
      await destroyCouple(otherCouple)
    }
  })

  it('PATCH enforces tenant isolation', async () => {
    const c = new TestClient()
    const create = await c.fetch('/api/grocery', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, name: 'Salt' }),
    })
    const { item } = await create.json()
    const otherCouple = await createCouple()
    try {
      const res = await c.fetch(`/api/grocery/${item.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', ...(await h(otherCouple.partnerA)) },
        body: JSON.stringify({ locketId: couple.locketId, checked: true }),
      })
      expect(res.status).toBe(403)
    } finally {
      await destroyCouple(otherCouple)
    }
  })

  it('clear-checked enforces tenant isolation', async () => {
    const otherCouple = await createCouple()
    try {
      const c = new TestClient()
      const res = await c.fetch('/api/grocery/clear-checked', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await h(otherCouple.partnerA)) },
        body: JSON.stringify({ locketId: couple.locketId }),
      })
      expect(res.status).toBe(403)
    } finally {
      await destroyCouple(otherCouple)
    }
  })
})
