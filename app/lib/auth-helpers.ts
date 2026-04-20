import { NextRequest } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'
import { query } from '@/lib/db'

export class AuthError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export async function requireUser(request: NextRequest): Promise<{ uid: string }> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) throw new AuthError(401, 'unauthenticated')
  const token = authHeader.split('Bearer ')[1]
  if (!adminAuth) throw new AuthError(500, 'auth_not_configured')
  try {
    const decoded = await adminAuth.verifyIdToken(token)
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
  const { rows } = await query(
    `SELECT firebase_uid FROM locket_users WHERE locket_id = $1 LIMIT 2`,
    [locketId],
  )
  const members = rows as { firebase_uid: string }[]
  const member = members.find((r) => r.firebase_uid === uid)
  if (!member) throw new AuthError(403, 'not_a_member')
  const partner = members.find((r) => r.firebase_uid !== uid) ?? null
  return { uid, partnerUid: partner?.firebase_uid ?? null }
}

export function authErrorResponse(err: unknown) {
  if (err instanceof AuthError) {
    return Response.json({ error: err.message }, { status: err.status })
  }
  console.error('unexpected auth error:', err instanceof Error ? err.message : String(err))
  return Response.json({ error: 'internal' }, { status: 500 })
}
