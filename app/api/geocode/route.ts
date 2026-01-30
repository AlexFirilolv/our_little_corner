import { NextRequest, NextResponse } from 'next/server'
import { reverseGeocode, formatCoordinates } from '@/lib/geocoding'
import { requireAuth } from '@/lib/firebase/serverAuth'

/**
 * POST /api/geocode - Reverse geocode coordinates to a place name
 *
 * Body: { latitude: number, longitude: number }
 * Returns: { success: boolean, location: string, details?: object }
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication to prevent abuse
    await requireAuth()

    const body = await request.json()
    const { latitude, longitude } = body

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'Invalid coordinates. Latitude and longitude must be numbers.' },
        { status: 400 }
      )
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Coordinates out of range.' },
        { status: 400 }
      )
    }

    const result = await reverseGeocode(latitude, longitude)

    if (result) {
      return NextResponse.json({
        success: true,
        location: result.shortName,
        details: {
          formattedAddress: result.formattedAddress,
          placeName: result.placeName,
          neighborhood: result.neighborhood,
          city: result.city,
          state: result.state,
          country: result.country,
        }
      })
    } else {
      // Fallback to formatted coordinates
      return NextResponse.json({
        success: true,
        location: formatCoordinates(latitude, longitude),
        details: null,
        fallback: true
      })
    }

  } catch (error) {
    console.error('Geocode API error:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to geocode location' },
      { status: 500 }
    )
  }
}
