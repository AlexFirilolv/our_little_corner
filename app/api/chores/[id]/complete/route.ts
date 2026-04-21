import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    const { uid } = await requireLocketMembership(request, locketId)
    const { rows } = await query(
      `UPDATE chores
       SET last_done_by = $1,
           last_done_at = NOW(),
           streak = CASE WHEN NOW() <= next_due_at THEN streak + 1 ELSE 1 END,
           next_due_at = NOW() + (cadence_days || ' days')::INTERVAL
       WHERE id = $2 AND locket_id = $3
       RETURNING *`,
      [uid, params.id, locketId],
    )
    if (rows.length === 0) {
      return Response.json({ error: 'not_found' }, { status: 404 })
    }
    return Response.json({ chore: rows[0] })
  } catch (err) {
    return authErrorResponse(err)
  }
}
