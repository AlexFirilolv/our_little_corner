import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    const { uid } = await requireLocketMembership(request, locketId)
    const { rows } = await query(
      `SELECT * FROM wishlist_items
       WHERE locket_id = $1 AND status != 'removed'
         AND NOT (added_by != $2 AND for_uid IS NOT NULL AND for_uid = $2)
       ORDER BY created_at DESC`,
      [locketId, uid],
    )
    return Response.json({ items: rows })
  } catch (err) { return authErrorResponse(err) }
}

export async function POST(request: NextRequest) {
  let body: {
    locketId?: string
    title?: string
    url?: string | null
    price_cents?: number | null
    notes?: string | null
    for_uid?: string | null
  }
  try {
    body = await request.json()
  } catch (err) {
    if (err instanceof SyntaxError) {
      return Response.json({ error: 'invalid_json' }, { status: 400 })
    }
    throw err
  }
  try {
    const { locketId, title, url, price_cents, notes, for_uid } = body
    const { uid } = await requireLocketMembership(request, locketId ?? '')
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return Response.json({ error: 'title_required' }, { status: 400 })
    }
    if (price_cents !== undefined && price_cents !== null) {
      if (typeof price_cents !== 'number' || price_cents < 0 || !Number.isFinite(price_cents)) {
        return Response.json({ error: 'invalid_price' }, { status: 400 })
      }
    }
    const { rows } = await query(
      `INSERT INTO wishlist_items (locket_id, added_by, for_uid, title, url, price_cents, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [locketId, uid, for_uid ?? null, title.trim(), url ?? null, price_cents ?? null, notes ?? null],
    )
    return Response.json({ item: rows[0] })
  } catch (err) { return authErrorResponse(err) }
}
