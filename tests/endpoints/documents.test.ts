import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createCouple, destroyCouple, type TestCouple } from '../helpers/fixtures'
import { TestClient } from '../helpers/client'
import { query } from '../helpers/db'

const h = async (p: { mintIdToken: () => Promise<string> }) => ({
  Authorization: `Bearer ${await p.mintIdToken()}`,
})

describe('/api/documents', () => {
  let couple: TestCouple
  beforeEach(async () => {
    couple = await createCouple()
  })
  afterEach(async () => {
    await destroyCouple(couple)
  })

  it('POST records metadata and GET returns it', async () => {
    const c = new TestClient()
    const res = await c.fetch('/api/documents', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({
        locketId: couple.locketId,
        name: 'Passport.pdf',
        category: 'id',
        gcs_key: `lockets/${couple.locketId}/documents/test-passport`,
        file_type: 'application/pdf',
        size_bytes: 12345,
        expiry_date: '2030-01-01',
      }),
    })
    expect(res.status).toBe(200)
    const { document } = await res.json()
    expect(document.name).toBe('Passport.pdf')
    expect(document.category).toBe('id')
    expect(document.added_by).toBe(couple.partnerA.uid)

    const list = await c.fetch(`/api/documents?locketId=${couple.locketId}`, {
      headers: await h(couple.partnerA),
    })
    expect(list.status).toBe(200)
    const { documents } = await list.json()
    expect(documents).toHaveLength(1)
    expect(documents[0].id).toBe(document.id)
  })

  it('POST defaults invalid category to other', async () => {
    const c = new TestClient()
    const res = await c.fetch('/api/documents', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({
        locketId: couple.locketId,
        name: 'Misc.pdf',
        category: 'bogus',
        gcs_key: `lockets/${couple.locketId}/documents/x`,
      }),
    })
    expect(res.status).toBe(200)
    const { document } = await res.json()
    expect(document.category).toBe('other')
  })

  it('POST without name returns 400', async () => {
    const c = new TestClient()
    const res = await c.fetch('/api/documents', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({
        locketId: couple.locketId,
        gcs_key: `lockets/${couple.locketId}/documents/x`,
      }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('name_required')
  })

  it('POST without gcs_key returns 400', async () => {
    const c = new TestClient()
    const res = await c.fetch('/api/documents', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, name: 'X' }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('gcs_key_required')
  })

  it('POST with invalid JSON returns 400', async () => {
    const c = new TestClient()
    const res = await c.fetch('/api/documents', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: '{not json',
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_json')
  })

  it('PATCH updates document', async () => {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO documents (locket_id, name, category, gcs_key, added_by)
       VALUES ($1, 'Old.pdf', 'other', $2, $3) RETURNING id`,
      [couple.locketId, `lockets/${couple.locketId}/documents/old`, couple.partnerA.uid],
    )
    const id = rows[0].id
    const c = new TestClient()
    const res = await c.fetch(`/api/documents/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({
        locketId: couple.locketId,
        name: 'New.pdf',
        category: 'insurance',
        expiry_date: '2029-06-01',
        notes: 'renewal',
      }),
    })
    expect(res.status).toBe(200)
    const { document } = await res.json()
    expect(document.name).toBe('New.pdf')
    expect(document.category).toBe('insurance')
    expect(document.notes).toBe('renewal')
  })

  it('PATCH bogus id returns 404', async () => {
    const c = new TestClient()
    const res = await c.fetch(`/api/documents/00000000-0000-0000-0000-000000000000`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, name: 'X' }),
    })
    expect(res.status).toBe(404)
  })

  it('DELETE removes DB row (GCS failure does not block)', async () => {
    const gcsKey = `lockets/${couple.locketId}/documents/nonexistent-for-test`
    const { rows } = await query<{ id: string }>(
      `INSERT INTO documents (locket_id, name, category, gcs_key, added_by)
       VALUES ($1, 'Doomed.pdf', 'other', $2, $3) RETURNING id`,
      [couple.locketId, gcsKey, couple.partnerA.uid],
    )
    const id = rows[0].id

    const c = new TestClient()
    const del = await c.fetch(`/api/documents/${id}?locketId=${couple.locketId}`, {
      method: 'DELETE',
      headers: await h(couple.partnerA),
    })
    expect(del.status).toBe(200)
    expect((await del.json()).ok).toBe(true)

    const check = await query(`SELECT id FROM documents WHERE id = $1`, [id])
    expect(check.rows).toHaveLength(0)
  })

  it('DELETE bogus id returns 404', async () => {
    const c = new TestClient()
    const res = await c.fetch(
      `/api/documents/00000000-0000-0000-0000-000000000000?locketId=${couple.locketId}`,
      { method: 'DELETE', headers: await h(couple.partnerA) },
    )
    expect(res.status).toBe(404)
  })

  it('GET enforces tenant isolation', async () => {
    const other = await createCouple()
    try {
      const c = new TestClient()
      const res = await c.fetch(`/api/documents?locketId=${couple.locketId}`, {
        headers: await h(other.partnerA),
      })
      expect(res.status).toBe(403)
    } finally {
      await destroyCouple(other)
    }
  })

  it('POST enforces tenant isolation', async () => {
    const other = await createCouple()
    try {
      const c = new TestClient()
      const res = await c.fetch('/api/documents', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await h(other.partnerA)) },
        body: JSON.stringify({
          locketId: couple.locketId,
          name: 'Sneaky.pdf',
          gcs_key: `lockets/${couple.locketId}/documents/sneaky`,
        }),
      })
      expect(res.status).toBe(403)
    } finally {
      await destroyCouple(other)
    }
  })

  it('POST with foreign-tenant gcs_key prefix returns 400 invalid_gcs_key', async () => {
    const other = await createCouple()
    try {
      const c = new TestClient()
      const res = await c.fetch('/api/documents', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
        body: JSON.stringify({
          locketId: couple.locketId,
          name: 'Foreign.pdf',
          gcs_key: `lockets/${other.locketId}/documents/foreign`,
        }),
      })
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe('invalid_gcs_key')
    } finally {
      await destroyCouple(other)
    }
  })

  it('PATCH with empty name returns 400', async () => {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO documents (locket_id, name, category, gcs_key, added_by)
       VALUES ($1, 'Orig.pdf', 'other', $2, $3) RETURNING id`,
      [couple.locketId, `lockets/${couple.locketId}/documents/orig`, couple.partnerA.uid],
    )
    const id = rows[0].id
    const c = new TestClient()
    const res = await c.fetch(`/api/documents/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, name: '   ' }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_name')
  })

  it('PATCH with null name returns 400 invalid_name', async () => {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO documents (locket_id, name, category, gcs_key, added_by)
       VALUES ($1, 'Orig.pdf', 'other', $2, $3) RETURNING id`,
      [couple.locketId, `lockets/${couple.locketId}/documents/orig2`, couple.partnerA.uid],
    )
    const id = rows[0].id
    const c = new TestClient()
    const res = await c.fetch(`/api/documents/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...(await h(couple.partnerA)) },
      body: JSON.stringify({ locketId: couple.locketId, name: null }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_name')
  })

  it('expiring filter: widget query returns only docs expiring within 30 days', async () => {
    const soon = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    const far = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    await query(
      `INSERT INTO documents (locket_id, name, category, gcs_key, added_by, expiry_date)
       VALUES ($1, 'Soon.pdf', 'id', 'k1', $2, $3),
              ($1, 'Far.pdf', 'id', 'k2', $2, $4),
              ($1, 'NoExp.pdf', 'other', 'k3', $2, NULL)`,
      [couple.locketId, couple.partnerA.uid, soon, far],
    )
    const c = new TestClient()
    const res = await c.fetch(`/api/documents?locketId=${couple.locketId}`, {
      headers: await h(couple.partnerA),
    })
    const { documents } = await res.json()
    const cutoff = Date.now() + 30 * 24 * 3600 * 1000
    const expiring = documents.filter(
      (d: { expiry_date: string | null }) =>
        d.expiry_date && new Date(d.expiry_date).getTime() <= cutoff,
    )
    expect(expiring).toHaveLength(1)
    expect(expiring[0].name).toBe('Soon.pdf')
  })
})
