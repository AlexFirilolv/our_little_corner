import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createCouple, destroyCouple, type TestCouple } from '../helpers/fixtures'
import { TestClient } from '../helpers/client'

describe('/api/bucket-list', () => {
  let couple: TestCouple
  let client: TestClient
  let bearerToken: string

  beforeEach(async () => {
    couple = await createCouple()
    // bucket-list route uses Authorization: Bearer <token> directly
    bearerToken = await couple.partnerA.mintIdToken()
    client = new TestClient()
  })

  afterEach(async () => {
    await destroyCouple(couple)
  })

  it('creates a bucket list item (POST) and returns it via GET', async () => {
    // POST /api/bucket-list
    const postRes = await client.fetch('/api/bucket-list', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({
        locketId: couple.locketId,
        title: 'See the Northern Lights',
        category: 'travel',
      }),
    })

    expect(postRes.status).toBe(200)
    const postBody = (await postRes.json()) as {
      item: {
        id: string
        locket_id: string
        title: string
        category: string
        status: string
        created_by_firebase_uid: string
      }
    }
    expect(postBody).toHaveProperty('item')
    expect(postBody.item).toHaveProperty('id')
    expect(postBody.item).toHaveProperty('locket_id', couple.locketId)
    expect(postBody.item).toHaveProperty('title', 'See the Northern Lights')
    expect(postBody.item).toHaveProperty('category', 'travel')
    expect(postBody.item).toHaveProperty('status', 'active')
    expect(postBody.item).toHaveProperty('created_by_firebase_uid', couple.partnerA.uid)

    const createdId = postBody.item.id

    // GET /api/bucket-list?locketId=...
    const getRes = await client.fetch(
      `/api/bucket-list?locketId=${couple.locketId}`,
      {
        headers: { authorization: `Bearer ${bearerToken}` },
      },
    )

    expect(getRes.status).toBe(200)
    const getBody = (await getRes.json()) as { items: Array<{ id: string }> }
    expect(getBody).toHaveProperty('items')
    expect(Array.isArray(getBody.items)).toBe(true)

    const ids = getBody.items.map((item) => item.id)
    expect(ids).toContain(createdId)
  })

  it('uses "other" as default category when not provided', async () => {
    const postRes = await client.fetch('/api/bucket-list', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({
        locketId: couple.locketId,
        title: 'Learn to cook together',
      }),
    })

    expect(postRes.status).toBe(200)
    const postBody = (await postRes.json()) as { item: { category: string } }
    expect(postBody.item).toHaveProperty('category', 'other')
  })

  it('returns 400 when POST is missing required fields', async () => {
    const res = await client.fetch('/api/bucket-list', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({ locketId: couple.locketId }),
    })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body).toHaveProperty('error')
  })

  it('returns 400 when GET is missing locketId', async () => {
    const res = await client.fetch('/api/bucket-list', {
      headers: { authorization: `Bearer ${bearerToken}` },
    })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body).toHaveProperty('error')
  })

  it('returns 401 when Authorization header is absent', async () => {
    const res = await client.fetch(
      `/api/bucket-list?locketId=${couple.locketId}`,
    )
    expect(res.status).toBe(401)
  })
})
