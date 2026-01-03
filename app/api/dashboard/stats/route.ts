import { NextResponse } from 'next/server'
import {
  getDashboardStats,
  getUpcomingWithFactors,
  getStandings,
  getBestPerformingFactor,
} from '@/lib/supabase/queries'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const leagueId = searchParams.get('league_id') || undefined

  try {
    const [stats, upcomingFixtures, standings, bestFactor] = await Promise.all([
      getDashboardStats(leagueId),
      getUpcomingWithFactors(6, leagueId),
      getStandings(leagueId),
      getBestPerformingFactor(leagueId),
    ])

    const topStandings = standings.slice(0, 6)

    return NextResponse.json({
      stats,
      upcomingFixtures,
      topStandings,
      bestFactor,
    })
  } catch (error) {
    console.error('[Dashboard Stats API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
