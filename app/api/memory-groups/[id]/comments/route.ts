import { NextRequest, NextResponse } from 'next/server'
import {
  getMemoryComments,
  createMemoryComment,
  deleteMemoryComment,
  getMemoryGroupById
} from '@/lib/db'
import { requireLocketAccess } from '@/lib/firebase/serverAuth'

/**
 * GET /api/memory-groups/[id]/comments - Get all comments for a memory group
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

    // Verify memory group belongs to locket
    const memoryGroup = await getMemoryGroupById(memoryGroupId, false)
    if (!memoryGroup || memoryGroup.locket_id !== locketId) {
      return NextResponse.json(
        { error: 'Memory group not found' },
        { status: 404 }
      )
    }

    const comments = await getMemoryComments(memoryGroupId, locketId)

    return NextResponse.json(
      { success: true, comments },
      { status: 200 }
    )

  } catch (error) {
    console.error('Get comments error:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/memory-groups/[id]/comments - Add a comment to a memory group
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const memoryGroupId = params.id
    const body = await request.json()
    const { locket_id, content } = body

    if (!locket_id) {
      return NextResponse.json(
        { error: 'Locket ID is required' },
        { status: 400 }
      )
    }

    if (!content || content.trim() === '') {
      return NextResponse.json(
        { error: 'Comment content is required' },
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

    const comment = await createMemoryComment({
      memory_group_id: memoryGroupId,
      locket_id: locket_id,
      content: content.trim(),
      comment_type: 'comment',
      author_firebase_uid: user.uid,
    })

    return NextResponse.json(
      { success: true, comment },
      { status: 201 }
    )

  } catch (error) {
    console.error('Create comment error:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/memory-groups/[id]/comments - Delete a comment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get('commentId')
    const locketId = searchParams.get('locketId')

    if (!commentId) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      )
    }

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

    const deleted = await deleteMemoryComment(commentId, locketId)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: true, message: 'Comment deleted' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Delete comment error:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    )
  }
}
