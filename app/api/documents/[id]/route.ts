import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'
import { deleteFileFromGCS } from '@/lib/gcs'

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  let body: {
    locketId?: string
    name?: string
    category?: string
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
    const locketId = typeof body.locketId === 'string' ? body.locketId : ''
    await requireLocketMembership(request, locketId)

    if (
      body.category !== undefined &&
      !(validCategories as readonly string[]).includes(body.category ?? '')
    ) {
      return Response.json({ error: 'invalid_category' }, { status: 400 })
    }

    const updates: string[] = []
    const values: unknown[] = []
    if ('name' in body) {
      values.push(body.name)
      updates.push(`name = $${values.length}`)
    }
    if ('category' in body) {
      values.push(body.category)
      updates.push(`category = $${values.length}`)
    }
    if ('expiry_date' in body) {
      values.push(body.expiry_date ?? null)
      updates.push(`expiry_date = $${values.length}`)
    }
    if ('notes' in body) {
      values.push(body.notes ?? null)
      updates.push(`notes = $${values.length}`)
    }
    if (updates.length === 0) {
      return Response.json({ error: 'no_updates' }, { status: 400 })
    }
    values.push(params.id)
    values.push(locketId)
    const { rows } = await query(
      `UPDATE documents SET ${updates.join(', ')}
       WHERE id = $${values.length - 1} AND locket_id = $${values.length}
       RETURNING *`,
      values,
    )
    if (rows.length === 0) {
      return Response.json({ error: 'not_found' }, { status: 404 })
    }
    return Response.json({ document: rows[0] })
  } catch (err) {
    return authErrorResponse(err)
  }
}

export async function DELETE(
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
    try {
      await deleteFileFromGCS(rows[0].gcs_key)
    } catch (e) {
      console.error('GCS delete failed', e)
    }
    await query(`DELETE FROM documents WHERE id = $1 AND locket_id = $2`, [
      params.id,
      locketId,
    ])
    return Response.json({ ok: true })
  } catch (err) {
    return authErrorResponse(err)
  }
}
