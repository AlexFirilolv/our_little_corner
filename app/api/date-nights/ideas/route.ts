import { NextRequest } from 'next/server'
import { dateIdeas } from '@/lib/data/date-night-ideas'
import { requireUser, authErrorResponse } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    await requireUser(request)
    const url = new URL(request.url)
    const vibe = url.searchParams.get('vibe')
    const setting = url.searchParams.get('setting')
    const budget = url.searchParams.get('budget')
    const ideas = dateIdeas.filter(
      (i) => (!vibe || i.vibe === vibe) && (!setting || i.setting === setting) && (!budget || i.budget === budget),
    )
    return Response.json({ ideas })
  } catch (err) { return authErrorResponse(err) }
}
