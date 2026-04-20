import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireUser, authErrorResponse } from '@/lib/auth-helpers'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { uid } = await requireUser(request)
    const { rows } = await query(
      `UPDATE gratitudes SET seen_at = NOW()
       WHERE id = $1 AND to_uid = $2 AND seen_at IS NULL
       RETURNING *`,
      [params.id, uid],
    )
    if (rows.length === 0) {
      const { rows: existing } = await query(`SELECT * FROM gratitudes WHERE id = $1`, [params.id])
      return Response.json({ gratitude: existing[0] ?? null })
    }
    return Response.json({ gratitude: rows[0] })
  } catch (err) { return authErrorResponse(err) }
}
