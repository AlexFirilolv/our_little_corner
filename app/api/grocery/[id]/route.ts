import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  let body: {
    locketId?: string
    name?: string
    qty?: string | null
    category?: string | null
    checked?: boolean
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
    const locketId = typeof body.locketId === 'string' ? body.locketId : ''
    const { uid } = await requireLocketMembership(request, locketId)

    if ('name' in body) {
      if (
        !body.name ||
        typeof body.name !== 'string' ||
        body.name.trim().length === 0
      ) {
        return Response.json({ error: 'name_required' }, { status: 400 })
      }
    }

    const updates: string[] = []
    const values: unknown[] = []
    if ('name' in body) {
      values.push(body.name!.trim())
      updates.push(`name = $${values.length}`)
    }
    if ('qty' in body) {
      values.push(body.qty ?? null)
      updates.push(`qty = $${values.length}`)
    }
    if ('category' in body) {
      values.push(body.category ?? null)
      updates.push(`category = $${values.length}`)
    }
    if ('checked' in body) {
      values.push(body.checked)
      updates.push(`checked = $${values.length}`)
      if (body.checked === true) {
        values.push(uid)
        updates.push(`checked_by = $${values.length}`)
        updates.push(`checked_at = NOW()`)
      } else if (body.checked === false) {
        updates.push(`checked_by = NULL`)
        updates.push(`checked_at = NULL`)
      }
    }
    if (updates.length === 0) {
      return Response.json({ error: 'no_updates' }, { status: 400 })
    }
    values.push(params.id)
    values.push(locketId)
    const { rows } = await query(
      `UPDATE grocery_items SET ${updates.join(', ')}
       WHERE id = $${values.length - 1} AND locket_id = $${values.length}
       RETURNING *`,
      values,
    )
    if (rows.length === 0) {
      return Response.json({ error: 'not_found' }, { status: 404 })
    }
    return Response.json({ item: rows[0] })
  } catch (err) {
    return authErrorResponse(err)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    await requireLocketMembership(request, locketId)
    const { rows } = await query(
      `DELETE FROM grocery_items WHERE id = $1 AND locket_id = $2 RETURNING id`,
      [params.id, locketId],
    )
    if (rows.length === 0) {
      return Response.json({ error: 'not_found' }, { status: 404 })
    }
    return Response.json({ ok: true })
  } catch (err) {
    return authErrorResponse(err)
  }
}
