import { NextRequest, NextResponse } from 'next/server'
import { requireCornerAccess } from '@/lib/firebase/serverAuth'
import { getSpotlightMemory } from '@/lib/db'

/**
 * GET /api/memories/spotlight?locketId=xxx - Get spotlight memory (On This Day or random)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const locketId = searchParams.get('locketId')

    if (!locketId) {
      return NextResponse.json(
        { error: 'locketId query parameter is required' },
        { status: 400 }
      )
    }

    const authHeader = request.headers.get('Authorization') || undefined
    const { hasAccess } = await requireCornerAccess(locketId, authHeader)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this locket' },
        { status: 403 }
      )
    }

    const spotlight = await getSpotlightMemory(locketId)

    return NextResponse.json(
      { success: true, data: spotlight },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching spotlight memory:', error)
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to fetch spotlight memory' },
      { status: 500 }
    )
  }
}
