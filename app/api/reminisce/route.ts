import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    await requireLocketMembership(request, locketId)
    const { rows } = await query(
      `SELECT mg.*, COALESCE(json_agg(m.*) FILTER (WHERE m.id IS NOT NULL), '[]') AS media_items
       FROM memory_groups mg
       LEFT JOIN media m ON m.memory_group_id = mg.id
       WHERE mg.locket_id = $1
         AND mg.date_taken IS NOT NULL
         AND extract(month FROM mg.date_taken) = extract(month FROM now())
         AND extract(day FROM mg.date_taken) = extract(day FROM now())
         AND mg.date_taken < date_trunc('day', now())
       GROUP BY mg.id
       ORDER BY mg.date_taken DESC
       LIMIT 5`,
      [locketId],
    )
    return Response.json({ memories: rows })
  } catch (err) { return authErrorResponse(err) }
}
