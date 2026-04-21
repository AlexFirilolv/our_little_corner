import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    await requireLocketMembership(request, locketId)
    const { rows } = await query(
      `SELECT * FROM date_night_picks WHERE locket_id = $1 ORDER BY picked_at DESC LIMIT 50`,
      [locketId],
    )
    return Response.json({ picks: rows })
  } catch (err) { return authErrorResponse(err) }
}

export async function POST(request: NextRequest) {
  let body: { locketId?: string; idea_id?: string }
  try {
    body = await request.json()
  } catch (err) {
    if (err instanceof SyntaxError) {
      return Response.json({ error: 'invalid_json' }, { status: 400 })
    }
    throw err
  }
  try {
    const { locketId, idea_id } = body
    const { uid } = await requireLocketMembership(request, locketId ?? '')
    if (typeof idea_id !== 'string' || idea_id.length < 1) {
      return Response.json({ error: 'invalid_idea_id' }, { status: 400 })
    }
    const { rows } = await query(
      `INSERT INTO date_night_picks (locket_id, idea_id, status, created_by) VALUES ($1, $2, 'saved', $3) RETURNING *`,
      [locketId, idea_id, uid],
    )
    return Response.json({ pick: rows[0] })
  } catch (err) { return authErrorResponse(err) }
}
