import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'

const validCategories = [
  'id',
  'insurance',
  'medical',
  'vehicle',
  'property',
  'financial',
  'pet',
  'other',
] as const

export async function GET(request: NextRequest) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    await requireLocketMembership(request, locketId)
    const { rows } = await query(
      `SELECT * FROM documents WHERE locket_id = $1 ORDER BY created_at DESC`,
      [locketId],
    )
    return Response.json({ documents: rows })
  } catch (err) {
    return authErrorResponse(err)
  }
}

export async function POST(request: NextRequest) {
  let body: {
    locketId?: string
    name?: string
    category?: string
    gcs_key?: string
    file_type?: string | null
    size_bytes?: number | null
    expiry_date?: string | null
    notes?: string | null
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
    const { locketId, name, category, gcs_key, file_type, size_bytes, expiry_date, notes } = body
    const { uid } = await requireLocketMembership(request, locketId ?? '')
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return Response.json({ error: 'name_required' }, { status: 400 })
    }
    if (!gcs_key || typeof gcs_key !== 'string') {
      return Response.json({ error: 'gcs_key_required' }, { status: 400 })
    }
    const cat = (validCategories as readonly string[]).includes(category ?? '')
      ? (category as string)
      : 'other'
    const { rows } = await query(
      `INSERT INTO documents (locket_id, name, category, gcs_key, file_type, size_bytes, expiry_date, notes, added_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        locketId,
        name.trim(),
        cat,
        gcs_key,
        file_type ?? null,
        size_bytes ?? null,
        expiry_date ?? null,
        notes ?? null,
        uid,
      ],
    )
    return Response.json({ document: rows[0] })
  } catch (err) {
    return authErrorResponse(err)
  }
}
