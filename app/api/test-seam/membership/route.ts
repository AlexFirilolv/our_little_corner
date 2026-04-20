import { NextRequest } from 'next/server'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const locketId = new URL(request.url).searchParams.get('locketId') ?? ''
    const result = await requireLocketMembership(request, locketId)
    return Response.json(result)
  } catch (err) {
    return authErrorResponse(err)
  }
}
