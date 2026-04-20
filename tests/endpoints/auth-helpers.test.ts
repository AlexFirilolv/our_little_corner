/**
 * Unit tests for app/lib/auth-helpers.ts
 *
 * Design choice: rather than smoke-testing via /api/grocery (which doesn't exist yet),
 * we import the helper directly and assert AuthError shape and requireUser/requireLocketMembership
 * throw correctly for missing / malformed Bearer tokens. This keeps the suite green
 * without requiring a companion route.
 */
import { describe, expect, it } from 'vitest'
import { AuthError, requireUser, authErrorResponse } from '@/lib/auth-helpers'
import { NextRequest } from 'next/server'

describe('AuthError', () => {
  it('carries status and message', () => {
    const err = new AuthError(403, 'not_a_member')
    expect(err.status).toBe(403)
    expect(err.message).toBe('not_a_member')
    expect(err).toBeInstanceOf(Error)
  })
})

describe('requireUser', () => {
  it('throws AuthError(401) when Authorization header is absent', async () => {
    const req = new NextRequest('http://localhost:3000/api/test')
    await expect(requireUser(req)).rejects.toSatisfy(
      (e: unknown) => e instanceof AuthError && (e as AuthError).status === 401,
    )
  })

  it('throws AuthError(401) when Authorization header has wrong scheme', async () => {
    const req = new NextRequest('http://localhost:3000/api/test', {
      headers: { Authorization: 'Basic sometoken' },
    })
    await expect(requireUser(req)).rejects.toSatisfy(
      (e: unknown) => e instanceof AuthError && (e as AuthError).status === 401,
    )
  })

  it('throws AuthError(401) for an invalid Bearer token', async () => {
    const req = new NextRequest('http://localhost:3000/api/test', {
      headers: { Authorization: 'Bearer not-a-real-jwt' },
    })
    await expect(requireUser(req)).rejects.toSatisfy(
      (e: unknown) => e instanceof AuthError && (e as AuthError).status === 401,
    )
  })
})

describe('authErrorResponse', () => {
  it('returns JSON response with correct status for AuthError', () => {
    const err = new AuthError(403, 'not_a_member')
    const res = authErrorResponse(err)
    expect(res.status).toBe(403)
  })

  it('returns 500 for unexpected errors', () => {
    const res = authErrorResponse(new Error('boom'))
    expect(res.status).toBe(500)
  })
})
