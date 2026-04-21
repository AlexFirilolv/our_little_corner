import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  let body: { locketId?: string; status?: string }
  try {
    body = await request.json()
  } catch (err) {
    if (err instanceof SyntaxError) {
      return Response.json({ error: 'invalid_json' }, { status: 400 })
    }
    throw err
  }
  try {
    const { locketId, status } = body
    await requireLocketMembership(request, locketId ?? '')
    if (!status || !['saved', 'completed', 'dismissed'].includes(status)) {
      return Response.json({ error: 'invalid_status' }, { status: 400 })
    }
    const completedAt = status === 'completed' ? 'NOW()' : 'NULL'
    const { rows } = await query(
      `UPDATE date_night_picks SET status = $1, completed_at = ${completedAt}
       WHERE id = $2 AND locket_id = $3 RETURNING *`,
      [status, params.id, locketId],
    )
    return Response.json({ pick: rows[0] })
  } catch (err) { return authErrorResponse(err) }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    await requireLocketMembership(request, locketId)
    await query(`DELETE FROM date_night_picks WHERE id = $1 AND locket_id = $2`, [params.id, locketId])
    return Response.json({ ok: true })
  } catch (err) { return authErrorResponse(err) }
}
