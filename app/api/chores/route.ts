import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    await requireLocketMembership(request, locketId)
    const { rows } = await query(
      `SELECT * FROM chores WHERE locket_id = $1 ORDER BY next_due_at ASC`,
      [locketId],
    )
    return Response.json({ chores: rows })
  } catch (err) {
    return authErrorResponse(err)
  }
}

export async function POST(request: NextRequest) {
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
    const { locketId, name, cadence_days, assigned_to, next_due_at } = body
    await requireLocketMembership(request, locketId ?? '')
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return Response.json({ error: 'name_required' }, { status: 400 })
    }
    if (
      typeof cadence_days !== 'number' ||
      !Number.isInteger(cadence_days) ||
      cadence_days <= 0
    ) {
      return Response.json({ error: 'invalid_cadence' }, { status: 400 })
    }
    const { rows } = await query(
      `INSERT INTO chores (locket_id, name, cadence_days, assigned_to, next_due_at)
       VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, NOW()))
       RETURNING *`,
      [locketId, name.trim(), cadence_days, assigned_to ?? null, next_due_at ?? null],
    )
    return Response.json({ chore: rows[0] })
  } catch (err) {
    return authErrorResponse(err)
  }
}
