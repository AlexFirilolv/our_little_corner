import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'

export async function POST(request: NextRequest) {
  let body: { locketId?: string }
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
    await query(
      `DELETE FROM grocery_items WHERE locket_id = $1 AND checked = true`,
      [locketId],
    )
    return Response.json({ ok: true })
  } catch (err) {
    return authErrorResponse(err)
  }
}
