import { NextResponse } from 'next/server'
import { getLiveFixturesWithFactors } from '@/lib/supabase/queries'
import { syncFinishedMatches } from '@/lib/api/sync-finished-matches'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const leagueId = searchParams.get('league_id') || undefined

    // Sync finished matches first (awaited to ensure DB is updated before returning)
    // This ensures clients get accurate status when they then fetch results
    await syncFinishedMatches(leagueId)

    // Use getLiveFixturesWithFactors to include predictions for PredictionCard display
    const fixtures = await getLiveFixturesWithFactors(20, leagueId)

    return NextResponse.json(fixtures)
  } catch (error) {
    console.error('Error fetching live fixtures:', error)
    return NextResponse.json(
      { error: 'Failed to fetch live fixtures' },
      { status: 500 }
    )
  }
}
