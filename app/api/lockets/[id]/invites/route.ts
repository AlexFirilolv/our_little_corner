import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getUserFromAuthHeader } from '@/lib/firebase/serverAuth'
import { getLocketInvites } from '@/lib/db'

/**
 * GET /api/lockets/[id]/invites - Get all pending invites for a locket
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization') || undefined
    const user = authHeader
      ? await getUserFromAuthHeader(authHeader)
      : await requireAuth()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const locketId = params.id

    if (!locketId) {
      return NextResponse.json(
        { error: 'Locket ID is required' },
        { status: 400 }
      )
    }

    const invites = await getLocketInvites(locketId)

    return NextResponse.json(
      { success: true, invites },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error fetching locket invites:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    )
  }
}
