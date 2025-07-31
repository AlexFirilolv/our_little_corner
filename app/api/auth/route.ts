import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, createAuthSession, setSessionCookie, logout } from '@/lib/auth'

/**
 * POST /api/auth - Login with password
 */
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    // Verify the password
    const isValidPassword = await verifyPassword(password)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    // Create a new session
    const sessionToken = await createAuthSession()

    // Create response
    const response = NextResponse.json(
      { success: true, message: 'Login successful' },
      { status: 200 }
    )

    // Set the session cookie
    response.cookies.set('our-corner-session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    })

    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/auth - Logout
 */
export async function DELETE(request: NextRequest) {
  try {
    await logout()

    const response = NextResponse.json(
      { success: true, message: 'Logout successful' },
      { status: 200 }
    )

    // Clear the session cookie
    response.cookies.set('our-corner-session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })

    return response

  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth - Check authentication status
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('our-corner-session')
    
    if (!sessionCookie?.value) {
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      )
    }

    // Import here to avoid circular dependencies
    const { verifySession } = await import('@/lib/auth')
    const isValid = await verifySession(sessionCookie.value)

    return NextResponse.json(
      { authenticated: isValid },
      { status: 200 }
    )

  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json(
      { authenticated: false },
      { status: 200 }
    )
  }
}