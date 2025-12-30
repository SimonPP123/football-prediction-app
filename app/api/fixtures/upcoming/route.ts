import { NextResponse } from 'next/server'
import { getUpcomingFixtures } from '@/lib/supabase/queries'
import { parseLimit, isValidUUID, ValidationError } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    // Validate limit parameter (1-100)
    const limit = parseLimit(searchParams.get('limit'), undefined, 1, 100)

    // Validate league_id if provided
    const leagueId = searchParams.get('league_id') || undefined
    if (leagueId && !isValidUUID(leagueId)) {
      return NextResponse.json(
        { error: 'Invalid league_id format' },
        { status: 400 }
      )
    }

    const fixtures = await getUpcomingFixtures(limit, leagueId)

    return NextResponse.json(fixtures)
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error fetching upcoming fixtures:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fixtures' },
      { status: 500 }
    )
  }
}
