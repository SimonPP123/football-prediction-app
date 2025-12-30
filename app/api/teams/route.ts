import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Use service role for API routes to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const leagueId = searchParams.get('league_id')

    // Get teams with venue and season stats
    let query = supabase
      .from('teams')
      .select(`
        *,
        venue:venues(*),
        season_stats:team_season_stats(*)
      `)
      .order('name')

    if (leagueId) {
      query = query.eq('league_id', leagueId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    console.log(`[Teams API] Fetched ${data?.length || 0} teams${leagueId ? ` for league ${leagueId}` : ''}`)

    // Transform season_stats to flatten home/away JSONB fields
    const transformedData = data?.map((team: any) => ({
      ...team,
      season_stats: team.season_stats?.map((stats: any) => ({
        ...stats,
        // Flatten home_stats JSONB
        home_wins: stats.home_stats?.wins ?? 0,
        home_draws: stats.home_stats?.draws ?? 0,
        home_losses: stats.home_stats?.losses ?? 0,
        home_goals_for: stats.home_stats?.goals_for ?? 0,
        home_goals_against: stats.home_stats?.goals_against ?? 0,
        // Flatten away_stats JSONB
        away_wins: stats.away_stats?.wins ?? 0,
        away_draws: stats.away_stats?.draws ?? 0,
        away_losses: stats.away_stats?.losses ?? 0,
        away_goals_for: stats.away_stats?.goals_for ?? 0,
        away_goals_against: stats.away_stats?.goals_against ?? 0,
        // Add computed averages
        avg_goals_scored: stats.goals_for_avg,
        avg_goals_conceded: stats.goals_against_avg,
      })) || []
    })) || []

    return NextResponse.json(transformedData)
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}
