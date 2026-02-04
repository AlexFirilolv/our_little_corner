import { NextRequest, NextResponse } from 'next/server'
import { requireCornerAccess } from '@/lib/firebase/serverAuth'
import {
  getLocketCovers,
  createLocketCover,
  deleteLocketCover,
  reorderLocketCovers
} from '@/lib/db'

interface RouteParams {
  params: { id: string }
}

/**
 * GET /api/lockets/[id]/covers - Get all cover photos for a locket
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const locketId = params.id
    const authHeader = request.headers.get('Authorization') || undefined

    const { hasAccess } = await requireCornerAccess(locketId, authHeader)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this locket' },
        { status: 403 }
      )
    }

    const covers = await getLocketCovers(locketId)

    return NextResponse.json(
      { success: true, data: covers },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching locket covers:', error)
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to fetch locket covers' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/lockets/[id]/covers - Add a new cover photo
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const locketId = params.id
    const authHeader = request.headers.get('Authorization') || undefined

    const { user, hasAccess } = await requireCornerAccess(locketId, authHeader)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this locket' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { photo_url, storage_key, sort_order } = body

    if (!photo_url) {
      return NextResponse.json(
        { error: 'photo_url is required' },
        { status: 400 }
      )
    }

    const cover = await createLocketCover({
      locket_id: locketId,
      photo_url,
      storage_key,
      sort_order,
      added_by_firebase_uid: user.uid
    })

    return NextResponse.json(
      { success: true, data: cover },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating locket cover:', error)
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create locket cover' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/lockets/[id]/covers - Reorder cover photos
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const locketId = params.id
    const authHeader = request.headers.get('Authorization') || undefined

    const { hasAccess } = await requireCornerAccess(locketId, authHeader)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this locket' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { cover_ids } = body

    if (!Array.isArray(cover_ids)) {
      return NextResponse.json(
        { error: 'cover_ids must be an array' },
        { status: 400 }
      )
    }

    await reorderLocketCovers(locketId, cover_ids)

    return NextResponse.json(
      { success: true, message: 'Covers reordered successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error reordering locket covers:', error)
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to reorder locket covers' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/lockets/[id]/covers?coverId=xxx - Delete a cover photo
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const locketId = params.id
    const authHeader = request.headers.get('Authorization') || undefined

    const { hasAccess } = await requireCornerAccess(locketId, authHeader)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this locket' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const coverId = searchParams.get('coverId')

    if (!coverId) {
      return NextResponse.json(
        { error: 'coverId query parameter is required' },
        { status: 400 }
      )
    }

    const deleted = await deleteLocketCover(coverId, locketId)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Cover not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: true, message: 'Cover deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting locket cover:', error)
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to delete locket cover' },
      { status: 500 }
    )
  }
}
