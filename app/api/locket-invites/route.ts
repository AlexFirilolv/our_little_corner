import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getUserFromAuthHeader } from '@/lib/firebase/serverAuth'
import { createLocketInvite, getLocketInvites, getInviteByLocketCodeAndEmail } from '@/lib/db'
import type { CreateLocketInvite } from '@/lib/types'

/**
 * GET /api/locket-invites - Get all invites for a locket
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const locketId = searchParams.get('locketId')
    const code = searchParams.get('code')
    const email = searchParams.get('email')

    // Handle public invite lookup by locket code and email
    if (code) {
      try {
        if (email) {
          const invite = await getInviteByLocketCodeAndEmail(code, email)
          return NextResponse.json(
            { success: true, invite },
            { status: 200 }
          )
        } else {
          // Find the locket directly by code
          const { getLocketByInviteCode } = await import('@/lib/db')
          const locket = await getLocketByInviteCode(code)

          if (!locket) {
            return NextResponse.json(
              { success: false, invite: null, error: 'Locket not found' },
              { status: 404 }
            )
          }

          // Return a mock invite object so the UI gracefully handles the code
          const mockInvite = {
            id: 'generic-invite-code',
            locket_id: locket.id,
            email: '', // No specific email for a generic invite link
            role: 'participant',
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            invited_by: (locket as any).invited_by, // injected from getLocketByInviteCode
            locket: {
              id: locket.id,
              name: locket.name,
              description: locket.description
            }
          }

          return NextResponse.json(
            { success: true, invite: mockInvite },
            { status: 200 }
          )
        }
      } catch (error) {
        console.error('Public invite lookup error:', error)
        return NextResponse.json(
          { success: false, invite: null, error: 'Invite not found' },
          { status: 404 }
        )
      }
    }

    // Handle authenticated admin requests
    const authHeader = request.headers.get('Authorization') || undefined
    const user = authHeader
      ? await getUserFromAuthHeader(authHeader)
      : await requireAuth()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!locketId) {
      return NextResponse.json(
        { error: 'Locket ID is required' },
        { status: 400 }
      )
    }

    const invites = await getLocketInvites(locketId)

    return NextResponse.json(
      { success: true, invites },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error fetching locket invites:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/locket-invites - Create a new locket invite
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization') || undefined
    const user = authHeader
      ? await getUserFromAuthHeader(authHeader)
      : await requireAuth()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { locket_id, email, role, permissions } = body

    if (!locket_id) {
      return NextResponse.json(
        { error: 'Locket ID is required' },
        { status: 400 }
      )
    }

    if (!email?.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!role || !['admin', 'participant'].includes(role)) {
      return NextResponse.json(
        { error: 'Valid role is required (admin or participant)' },
        { status: 400 }
      )
    }

    const inviteData: CreateLocketInvite = {
      locket_id,
      email: email.trim().toLowerCase(),
      role,
      can_upload: permissions?.can_upload !== false,
      can_edit_others_media: permissions?.can_edit || false,
      invited_by_firebase_uid: user.uid,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    }

    const invite = await createLocketInvite(inviteData)

    return NextResponse.json(
      { success: true, data: invite },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error creating locket invite:', error)

    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        { error: 'User already invited or is already a member' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create invite' },
      { status: 500 }
    )
  }
}
