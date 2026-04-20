import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    await requireLocketMembership(request, locketId)
    const { rows } = await query(
      `SELECT * FROM gratitudes WHERE locket_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [locketId],
    )
    return Response.json({ gratitudes: rows })
  } catch (err) { return authErrorResponse(err) }
}

export async function POST(request: NextRequest) {
  try {
    const { locketId, text } = await request.json()
    const { uid, partnerUid } = await requireLocketMembership(request, locketId)
    if (!partnerUid) return Response.json({ error: 'no_partner' }, { status: 400 })
    if (typeof text !== 'string' || text.length < 1 || text.length > 280) {
      return Response.json({ error: 'invalid_text' }, { status: 400 })
    }
    const { rows } = await query(
      `INSERT INTO gratitudes (locket_id, from_uid, to_uid, text) VALUES ($1, $2, $3, $4) RETURNING *`,
      [locketId, uid, partnerUid, text],
    )
    return Response.json({ gratitude: rows[0] })
  } catch (err) { return authErrorResponse(err) }
}
