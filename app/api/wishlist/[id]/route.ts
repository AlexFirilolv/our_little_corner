import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'

const ALLOWED_FIELDS = ['title', 'url', 'price_cents', 'notes', 'status', 'reserved_by', 'for_uid'] as const
const ALLOWED_STATUS = ['open', 'reserved', 'gifted', 'removed']

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch (err) {
    if (err instanceof SyntaxError) {
      return Response.json({ error: 'invalid_json' }, { status: 400 })
    }
    throw err
  }
  try {
    const locketId = typeof body.locketId === 'string' ? body.locketId : ''
    await requireLocketMembership(request, locketId)
    if (typeof body.status === 'string' && !ALLOWED_STATUS.includes(body.status)) {
      return Response.json({ error: 'invalid_status' }, { status: 400 })
    }
    const updates: string[] = []
    const values: unknown[] = []
    for (const key of ALLOWED_FIELDS) {
      if (key in body) {
        values.push(body[key])
        updates.push(`${key} = $${values.length}`)
      }
    }
    if (updates.length === 0) {
      return Response.json({ error: 'no_updates' }, { status: 400 })
    }
    values.push(params.id)
    values.push(locketId)
    const { rows } = await query(
      `UPDATE wishlist_items SET ${updates.join(', ')}
       WHERE id = $${values.length - 1} AND locket_id = $${values.length}
       RETURNING *`,
      values,
    )
    if (rows.length === 0) {
      return Response.json({ error: 'not_found' }, { status: 404 })
    }
    return Response.json({ item: rows[0] })
  } catch (err) { return authErrorResponse(err) }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    await requireLocketMembership(request, locketId)
    const { rows } = await query(
      `UPDATE wishlist_items SET status = 'removed'
       WHERE id = $1 AND locket_id = $2
       RETURNING id`,
      [params.id, locketId],
    )
    if (rows.length === 0) {
      return Response.json({ error: 'not_found' }, { status: 404 })
    }
    return Response.json({ ok: true })
  } catch (err) { return authErrorResponse(err) }
}
