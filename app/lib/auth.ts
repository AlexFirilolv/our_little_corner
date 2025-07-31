import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { createSession, getSessionByToken, deleteSession } from './db'

const JWT_SECRET = process.env.JWT_SECRET!
const APP_PASSWORD = process.env.APP_PASSWORD!
const SESSION_COOKIE_NAME = 'our-corner-session'
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

export interface SessionPayload {
  sessionId: string
  iat: number
  exp: number
}

/**
 * Hash the application password for comparison
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

/**
 * Verify the provided password against the application password
 */
export async function verifyPassword(password: string): Promise<boolean> {
  try {
    // For development, you might want to use plain text comparison
    // In production, use bcrypt.compare with a hashed password
    if (process.env.NODE_ENV === 'development') {
      return password === APP_PASSWORD
    }
    
    // For production, hash your password and store it, then use:
    // return bcrypt.compare(password, HASHED_APP_PASSWORD)
    return password === APP_PASSWORD
  } catch (error) {
    console.error('Error verifying password:', error)
    return false
  }
}

/**
 * Create a new session and return the JWT token
 */
export async function createAuthSession(): Promise<string> {
  try {
    // Generate a unique session token
    const sessionToken = jwt.sign(
      { timestamp: Date.now() },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Calculate expiration date
    const expiresAt = new Date(Date.now() + SESSION_DURATION)

    // Store session in database
    await createSession(sessionToken, expiresAt)

    return sessionToken
  } catch (error) {
    console.error('Error creating auth session:', error)
    throw new Error('Failed to create session')
  }
}

/**
 * Verify a session token and return session data
 */
export async function verifySession(token: string): Promise<boolean> {
  try {
    // First verify the JWT token
    jwt.verify(token, JWT_SECRET)

    // Then check if the session exists in the database and hasn't expired
    const session = await getSessionByToken(token)
    
    return session !== null
  } catch (error) {
    console.error('Error verifying session:', error)
    return false
  }
}

/**
 * Get the current session from cookies
 */
export async function getCurrentSession(): Promise<string | null> {
  try {
    const cookieStore = cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
    
    if (!sessionCookie?.value) {
      return null
    }

    const isValid = await verifySession(sessionCookie.value)
    return isValid ? sessionCookie.value : null
  } catch (error) {
    console.error('Error getting current session:', error)
    return null
  }
}

/**
 * Set the session cookie
 */
export function setSessionCookie(token: string): void {
  const cookieStore = cookies()
  
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000, // Convert to seconds
    path: '/',
  })
}

/**
 * Clear the session cookie
 */
export function clearSessionCookie(): void {
  const cookieStore = cookies()
  
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
}

/**
 * Logout - destroy session
 */
export async function logout(): Promise<void> {
  try {
    const sessionToken = await getCurrentSession()
    
    if (sessionToken) {
      // Remove from database
      await deleteSession(sessionToken)
      
      // Clear cookie
      clearSessionCookie()
    }
  } catch (error) {
    console.error('Error during logout:', error)
    // Still clear the cookie even if database operation fails
    clearSessionCookie()
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getCurrentSession()
  return session !== null
}

/**
 * Require authentication - throw error if not authenticated
 */
export async function requireAuth(): Promise<void> {
  const authenticated = await isAuthenticated()
  
  if (!authenticated) {
    throw new Error('Authentication required')
  }
}

/**
 * Generate a secure random token for additional security
 */
export function generateSecureToken(): string {
  return jwt.sign(
    { 
      random: Math.random(),
      timestamp: Date.now(),
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  )
}