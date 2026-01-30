import { NextRequest, NextResponse } from 'next/server'
import { toggleMemoryLike, getMemoryLikeStatus, getMemoryGroupById } from '@/lib/db'
import { requireLocketAccess } from '@/lib/firebase/serverAuth'

/**
 * POST /api/memory-groups/[id]/like - Toggle like on a memory group
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const memoryGroupId = params.id
    const body = await request.json()
    const { locket_id } = body

    if (!locket_id) {
      return NextResponse.json(
        { error: 'Locket ID is required' },
        { status: 400 }
      )
    }

    const authHeader = request.headers.get('Authorization') || undefined
    const { user, hasAccess } = await requireLocketAccess(locket_id, authHeader)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this locket' },
        { status: 403 }
      )
    }

    // Verify memory group belongs to locket
    const memoryGroup = await getMemoryGroupById(memoryGroupId, false)
    if (!memoryGroup || memoryGroup.locket_id !== locket_id) {
      return NextResponse.json(
        { error: 'Memory group not found' },
        { status: 404 }
      )
    }

    const result = await toggleMemoryLike(memoryGroupId, locket_id, user.uid)

    return NextResponse.json(
      { success: true, ...result },
      { status: 200 }
    )

  } catch (error) {
    console.error('Toggle like error:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to toggle like' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/memory-groups/[id]/like - Get like status for a memory group
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const memoryGroupId = params.id
    const { searchParams } = new URL(request.url)
    const locketId = searchParams.get('locketId')

    if (!locketId) {
      return NextResponse.json(
        { error: 'Locket ID is required' },
        { status: 400 }
      )
    }

    const authHeader = request.headers.get('Authorization') || undefined
    const { user, hasAccess } = await requireLocketAccess(locketId, authHeader)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this locket' },
        { status: 403 }
      )
    }

    const result = await getMemoryLikeStatus(memoryGroupId, user.uid)

    return NextResponse.json(
      { success: true, ...result },
      { status: 200 }
    )

  } catch (error) {
    console.error('Get like status error:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to get like status' },
      { status: 500 }
    )
  }
}
