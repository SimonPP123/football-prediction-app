import { NextResponse } from 'next/server'
import { getRecentCompletedWithPredictions } from '@/lib/supabase/queries'
import { syncFinishedMatches } from '@/lib/api/sync-finished-matches'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const roundsParam = searchParams.get('rounds') || '2'
    const leagueId = searchParams.get('league_id') || undefined

    // Sync finished matches first to ensure database is up-to-date
    // This catches matches that ended but weren't updated via live polling
    await syncFinishedMatches(leagueId)

    // Support 'all' parameter to fetch all historical results
    // Validate numeric input to prevent NaN issues
    let rounds: number | 'all' = 'all'
    if (roundsParam !== 'all') {
      const parsed = parseInt(roundsParam, 10)
      if (isNaN(parsed) || parsed < 1) {
        return NextResponse.json(
          { error: 'Invalid rounds parameter. Must be a positive integer or "all".' },
          { status: 400 }
        )
      }
      rounds = parsed
    }

    const results = await getRecentCompletedWithPredictions(rounds, leagueId)

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error fetching recent results:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent results' },
      { status: 500 }
    )
  }
}
