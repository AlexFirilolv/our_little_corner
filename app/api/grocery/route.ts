import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    await requireLocketMembership(request, locketId)
    const { rows } = await query(
      `SELECT * FROM grocery_items WHERE locket_id = $1 ORDER BY checked ASC, created_at DESC`,
      [locketId],
    )
    return Response.json({ items: rows })
  } catch (err) {
    return authErrorResponse(err)
  }
}

export async function POST(request: NextRequest) {
  let body: {
    locketId?: string
    name?: string
    qty?: string | null
    category?: string | null
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
    const { locketId, name, qty, category } = body
    const { uid } = await requireLocketMembership(request, locketId ?? '')
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return Response.json({ error: 'name_required' }, { status: 400 })
    }
    const { rows } = await query(
      `INSERT INTO grocery_items (locket_id, name, qty, category, added_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [locketId, name.trim(), qty ?? null, category ?? null, uid],
    )
    return Response.json({ item: rows[0] })
  } catch (err) {
    return authErrorResponse(err)
  }
}
