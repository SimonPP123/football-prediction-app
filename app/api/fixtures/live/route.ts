import { NextResponse } from 'next/server'
import { getLiveFixtures } from '@/lib/supabase/queries'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const leagueId = searchParams.get('league_id') || undefined

    const fixtures = await getLiveFixtures(leagueId)

    return NextResponse.json(fixtures)
  } catch (error) {
    console.error('Error fetching live fixtures:', error)
    return NextResponse.json(
      { error: 'Failed to fetch live fixtures' },
      { status: 500 }
    )
  }
}
