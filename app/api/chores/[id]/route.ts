import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  let body: {
    locketId?: string
    name?: string
    cadence_days?: number
    assigned_to?: string | null
    next_due_at?: string | null
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
    await requireLocketMembership(request, locketId)

    if (body.cadence_days !== undefined && body.cadence_days !== null) {
      if (
        typeof body.cadence_days !== 'number' ||
        !Number.isInteger(body.cadence_days) ||
        body.cadence_days <= 0
      ) {
        return Response.json({ error: 'invalid_cadence' }, { status: 400 })
      }
    }

    const updates: string[] = []
    const values: unknown[] = []
    if ('name' in body) {
      values.push(body.name)
      updates.push(`name = $${values.length}`)
    }
    if ('cadence_days' in body) {
      values.push(body.cadence_days)
      updates.push(`cadence_days = $${values.length}`)
    }
    if ('assigned_to' in body) {
      values.push(body.assigned_to ?? null)
      updates.push(`assigned_to = $${values.length}`)
    }
    if ('next_due_at' in body) {
      values.push(body.next_due_at ?? null)
      updates.push(`next_due_at = $${values.length}`)
    }
    if (updates.length === 0) {
      return Response.json({ error: 'no_updates' }, { status: 400 })
    }
    values.push(params.id)
    values.push(locketId)
    const { rows } = await query(
      `UPDATE chores SET ${updates.join(', ')}
       WHERE id = $${values.length - 1} AND locket_id = $${values.length}
       RETURNING *`,
      values,
    )
    if (rows.length === 0) {
      return Response.json({ error: 'not_found' }, { status: 404 })
    }
    return Response.json({ chore: rows[0] })
  } catch (err) {
    return authErrorResponse(err)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    await requireLocketMembership(request, locketId)
    const { rows } = await query(
      `DELETE FROM chores WHERE id = $1 AND locket_id = $2 RETURNING id`,
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
