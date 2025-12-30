import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

// Get last update times for each data category by checking updated_at columns
export async function GET() {
  try {
    const supabase = createServerClient()

    // Query last updated times from each relevant table
    const [
      fixtures,
      standings,
      injuries,
      odds,
      weather,
      predictions,
      teamStats,
      playerStats,
      lineups,
      matchAnalysis,
    ] = await Promise.all([
      supabase.from('fixtures').select('updated_at').order('updated_at', { ascending: false }).limit(1).single(),
      supabase.from('standings').select('updated_at').order('updated_at', { ascending: false }).limit(1).single(),
      supabase.from('injuries').select('updated_at').order('updated_at', { ascending: false }).limit(1).single(),
      supabase.from('odds').select('updated_at').order('updated_at', { ascending: false }).limit(1).single(),
      supabase.from('weather').select('updated_at').order('updated_at', { ascending: false }).limit(1).single(),
      supabase.from('predictions').select('updated_at').order('updated_at', { ascending: false }).limit(1).single(),
      supabase.from('team_season_stats').select('updated_at').order('updated_at', { ascending: false }).limit(1).single(),
      supabase.from('player_season_stats').select('updated_at').order('updated_at', { ascending: false }).limit(1).single(),
      supabase.from('lineups').select('updated_at').order('updated_at', { ascending: false }).limit(1).single(),
      supabase.from('match_analysis').select('updated_at').order('updated_at', { ascending: false }).limit(1).single(),
    ])

    const lastRefreshTimes: Record<string, string | null> = {
      fixtures: fixtures.data?.updated_at || null,
      standings: standings.data?.updated_at || null,
      injuries: injuries.data?.updated_at || null,
      odds: odds.data?.updated_at || null,
      weather: weather.data?.updated_at || null,
      predictions: predictions.data?.updated_at || null,
      'team-stats': teamStats.data?.updated_at || null,
      'player-stats': playerStats.data?.updated_at || null,
      lineups: lineups.data?.updated_at || null,
      'match-analysis': matchAnalysis.data?.updated_at || null,
    }

    return NextResponse.json({
      success: true,
      lastRefreshTimes,
    })
  } catch (error) {
    console.error('Error fetching update status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch update status' },
      { status: 500 }
    )
  }
}
