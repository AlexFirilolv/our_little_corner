import { NextRequest, NextResponse } from 'next/server'
import {
  getAllMedia,
  createMediaItem,
  updateMediaItem,
  deleteMediaItem,
  getMediaById
} from '@/lib/db'
import type { CreateMediaItem, UpdateMediaItem } from '@/lib/types'
import { requireLocketAccess, getUserFromAuthHeader } from '@/lib/firebase/serverAuth'
import { deleteFileFromGCS } from '@/lib/gcs'

/**
 * GET /api/media - Get all media items
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const locketId = url.searchParams.get('locket_id')

    if (!locketId) {
      return NextResponse.json(
        { error: 'locket_id parameter is required' },
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

    const mediaItems = await getAllMedia(locketId)

    return NextResponse.json(
      { success: true, data: mediaItems },
      { status: 200 }
    )

  } catch (error) {
    console.error('Get media error:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch media items' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/media - Create new media item
 */
export async function POST(request: NextRequest) {
  try {
    const mediaData: CreateMediaItem = await request.json()

    if (!mediaData.locket_id) {
      return NextResponse.json(
        { error: 'locket_id is required' },
        { status: 400 }
      )
    }

    const authHeader = request.headers.get('Authorization') || undefined
    const { user, hasAccess } = await requireLocketAccess(mediaData.locket_id, authHeader)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this locket' },
        { status: 403 }
      )
    }

    // Validate required fields
    if (!mediaData.filename || !mediaData.storage_key || !mediaData.storage_url || !mediaData.file_type || !mediaData.file_size) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Add uploader information
    mediaData.uploaded_by_firebase_uid = user.uid

    const newMedia = await createMediaItem(mediaData)

    return NextResponse.json(
      { success: true, data: newMedia },
      { status: 201 }
    )

  } catch (error) {
    console.error('Create media error:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create media item' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/media - Update media item
 */
export async function PUT(request: NextRequest) {
  try {
    const { id, locket_id, ...updates }: { id: string; locket_id: string } & UpdateMediaItem = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      )
    }

    if (!locket_id) {
      return NextResponse.json(
        { error: 'locket_id is required' },
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

    // Verify the media item belongs to the locket
    const existingMedia = await getMediaById(id, locket_id)

    if (!existingMedia) {
      return NextResponse.json(
        { error: 'Media item not found' },
        { status: 404 }
      )
    }

    const updatedMedia = await updateMediaItem(id, updates)

    return NextResponse.json(
      { success: true, data: updatedMedia },
      { status: 200 }
    )

  } catch (error) {
    console.error('Update media error:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update media item' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/media - Delete media item
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const locket_id = searchParams.get('locket_id')

    if (!id) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      )
    }

    if (!locket_id) {
      return NextResponse.json(
        { error: 'locket_id is required' },
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

    // Get media item to verify it belongs to the locket and get storage key for deletion
    const mediaItem = await getMediaById(id, locket_id)

    if (!mediaItem) {
      return NextResponse.json(
        { error: 'Media item not found' },
        { status: 404 }
      )
    }

    // Delete from database first
    const deleted = await deleteMediaItem(id)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete media item' },
        { status: 500 }
      )
    }

    // Try to delete from GCS (non-blocking)
    try {
      await deleteFileFromGCS(mediaItem.storage_key)
    } catch (gcsError) {
      console.error('GCS deletion error (non-blocking):', gcsError)
      // Don't fail the entire operation if GCS deletion fails
    }

    return NextResponse.json(
      { success: true, message: 'Media item deleted successfully' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Delete media error:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete media item' },
      { status: 500 }
    )
  }
}
