import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'
import { generatePresignedDownloadUrl } from '@/lib/gcs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    await requireLocketMembership(request, locketId)
    const { rows } = await query(
      `SELECT gcs_key FROM documents WHERE id = $1 AND locket_id = $2`,
      [params.id, locketId],
    )
    if (rows.length === 0) {
      return Response.json({ error: 'not_found' }, { status: 404 })
    }
    const url = await generatePresignedDownloadUrl(rows[0].gcs_key, 15 * 60 * 1000)
    return Response.json({ url })
  } catch (err) {
    return authErrorResponse(err)
  }
}
