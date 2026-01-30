import { NextRequest, NextResponse } from 'next/server'
import {
  getAllMemoryGroups,
  createMemoryGroup,
  updateMemoryGroup,
  deleteMemoryGroup,
  getMemoryGroupById,
  logMemoryActivity
} from '@/lib/db'
import type { CreateMemoryGroup, UpdateMemoryGroup } from '@/lib/types'
import { requireAuth, requireLocketAccess, getUserFromAuthHeader } from '@/lib/firebase/serverAuth'
import { generatePresignedDownloadUrl } from '@/lib/gcs'

/**
 * GET /api/memory-groups - Get all memory groups
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const locketId = searchParams.get('locketId')
    const includeMedia = searchParams.get('includeMedia') !== 'false'

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

    const memoryGroups = await getAllMemoryGroups(locketId, includeMedia)

    // Generate signed URLs for media items (bucket is private)
    if (includeMedia) {
      for (const group of memoryGroups) {
        if (group.media_items && Array.isArray(group.media_items)) {
          for (const media of group.media_items) {
            if (media.storage_key) {
              try {
                media.storage_url = await generatePresignedDownloadUrl(media.storage_key)
              } catch (e) {
                console.error('Failed to generate signed URL for', media.storage_key, e)
              }
            }
          }
        }
      }
    }

    return NextResponse.json(
      { success: true, memoryGroups },
      { status: 200 }
    )

  } catch (error) {
    console.error('Get memory groups error:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch memory groups' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/memory-groups - Create new memory group
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { locket_id, title, description, date_taken, is_milestone } = body

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

    const groupData: CreateMemoryGroup = {
      locket_id,
      title: title?.trim() || undefined,
      description: description?.trim() || undefined,
      date_taken: date_taken ? new Date(date_taken) : undefined,
      is_milestone: is_milestone || false,
      created_by_firebase_uid: user.uid,
    }

    const newGroup = await createMemoryGroup(groupData)

    return NextResponse.json(
      { success: true, data: newGroup },
      { status: 201 }
    )

  } catch (error) {
    console.error('Create memory group error:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create memory group' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/memory-groups - Update memory group
 */
export async function PUT(request: NextRequest) {
  try {
    const { id, locket_id, ...updates }: { id: string; locket_id: string } & UpdateMemoryGroup = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Memory group ID is required' },
        { status: 400 }
      )
    }

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

    // Verify the memory group belongs to the locket
    const existingGroup = await getMemoryGroupById(id, false)

    if (!existingGroup || existingGroup.locket_id !== locket_id) {
      return NextResponse.json(
        { error: 'Memory group not found' },
        { status: 404 }
      )
    }

    const updatedGroup = await updateMemoryGroup(id, updates)

    if (!updatedGroup) {
      return NextResponse.json(
        { error: 'Memory group not found' },
        { status: 404 }
      )
    }

    // Log activity for changes (non-blocking)
    try {
      const changes: string[] = []
      if (updates.title !== undefined && updates.title !== existingGroup.title) {
        changes.push('title')
      }
      if (updates.description !== undefined && updates.description !== existingGroup.description) {
        changes.push('description')
      }
      if (updates.date_taken !== undefined) {
        changes.push('date')
      }

      if (changes.length > 0) {
        await logMemoryActivity(
          id,
          locket_id,
          'memory_updated',
          `Updated ${changes.join(', ')}`,
          user.uid
        )
      }
    } catch (activityError) {
      console.error('Failed to log activity:', activityError)
      // Don't fail the request if activity logging fails
    }

    return NextResponse.json(updatedGroup, { status: 200 })

  } catch (error) {
    console.error('Update memory group error:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update memory group' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/memory-groups - Delete memory group
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const locket_id = searchParams.get('locket_id')

    if (!id) {
      return NextResponse.json(
        { error: 'Memory group ID is required' },
        { status: 400 }
      )
    }

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

    // Verify the memory group belongs to the locket
    const existingGroup = await getMemoryGroupById(id, false)

    if (!existingGroup || existingGroup.locket_id !== locket_id) {
      return NextResponse.json(
        { error: 'Memory group not found' },
        { status: 404 }
      )
    }

    const deleted = await deleteMemoryGroup(id)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Memory group not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: 'Memory group deleted successfully' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Delete memory group error:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete memory group' },
      { status: 500 }
    )
  }
}
