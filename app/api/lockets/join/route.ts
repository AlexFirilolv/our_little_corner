import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/firebase/serverAuth'
import { joinLocketByInviteCode } from '@/lib/db'

/**
 * POST /api/lockets/join - Join a locket using an invite code
 */
export async function POST(request: NextRequest) {
    try {
        const user = await requireAuth()

        if (!user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { code } = body

        if (!code) {
            return NextResponse.json(
                { error: 'Invite code is required' },
                { status: 400 }
            )
        }

        const result = await joinLocketByInviteCode(
            code,
            user.uid,
            user.email || '',
            user.displayName || ''
        )

        return NextResponse.json(
            { success: true, message: 'Joined locket successfully', data: result },
            { status: 200 }
        )

    } catch (error) {
        console.error('Error joining locket:', error)

        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return NextResponse.json(
                    { error: 'Locket not found or invalid invite code' },
                    { status: 404 }
                )
            } else if (error.message.includes('already a member')) {
                return NextResponse.json(
                    { error: 'You are already a member of this locket' },
                    { status: 409 }
                )
            }
        }

        return NextResponse.json(
            { error: 'Failed to join locket' },
            { status: 500 }
        )
    }
}
