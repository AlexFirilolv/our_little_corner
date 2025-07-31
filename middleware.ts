import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// For now, let's simplify by not doing JWT verification in middleware
// We'll rely on the API route verification instead

const JWT_SECRET = process.env.JWT_SECRET!

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/',
  '/admin',
]

// Routes that should redirect to home if already authenticated
const AUTH_ROUTES = [
  '/login',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('our-corner-session')

  // Check if user has a session cookie (basic check)
  // Full JWT verification will happen in API routes
  const hasSessionCookie = !!sessionCookie?.value

  // Skip middleware for API routes and static files
  if (pathname.startsWith('/api/') || 
      pathname.startsWith('/_next/') || 
      pathname.includes('.')) {
    return NextResponse.next()
  }

  // Handle protected routes (exact path matching to avoid conflicts)
  if (pathname === '/' || pathname === '/admin') {
    if (!hasSessionCookie) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Handle login page (redirect if already authenticated)
  if (pathname === '/login') {
    if (hasSessionCookie) {
      // Redirect to home page
      const homeUrl = new URL('/', request.url)
      return NextResponse.redirect(homeUrl)
    }
  }

  // Add security headers
  const response = NextResponse.next()

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval and unsafe-inline
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "media-src 'self' https: blob:",
    "connect-src 'self' https:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ')
  
  response.headers.set('Content-Security-Policy', csp)

  return response
}

export const config = {
  matcher: [
    /*
     * Match only specific routes that need protection
     */
    '/',
    '/admin',
    '/login',
  ],
}