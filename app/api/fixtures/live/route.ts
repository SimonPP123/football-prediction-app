import { NextResponse } from 'next/server'
import { getLiveFixturesWithFactors } from '@/lib/supabase/queries'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const leagueId = searchParams.get('league_id') || undefined

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
