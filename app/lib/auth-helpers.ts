import { NextRequest } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import adminApp from '@/lib/firebase/admin'
import { query } from '@/lib/db'

void adminApp

export class AuthError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export async function requireUser(request: NextRequest): Promise<{ uid: string }> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) throw new AuthError(401, 'unauthenticated')
  const token = authHeader.split('Bearer ')[1]
  try {
    const decoded = await getAuth().verifyIdToken(token)
    return { uid: decoded.uid }
  } catch {
    throw new AuthError(401, 'invalid_token')
  }
}

export async function requireLocketMembership(
  request: NextRequest,
  locketId: string,
): Promise<{ uid: string; partnerUid: string | null }> {
  if (!locketId) throw new AuthError(400, 'locket_id_required')
  const { uid } = await requireUser(request)
  const result = await query(
    `SELECT firebase_uid FROM locket_users WHERE locket_id = $1`,
    [locketId],
  )
  const rows = result.rows as { firebase_uid: string }[]
  const member = rows.find((r) => r.firebase_uid === uid)
  if (!member) throw new AuthError(403, 'not_a_member')
  const partner = rows.find((r) => r.firebase_uid !== uid) ?? null
  return { uid, partnerUid: partner?.firebase_uid ?? null }
}

export function authErrorResponse(err: unknown) {
  if (err instanceof AuthError) {
    return Response.json({ error: err.message }, { status: err.status })
  }
  console.error('unexpected auth error', err)
  return Response.json({ error: 'internal' }, { status: 500 })
}
