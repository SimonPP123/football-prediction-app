import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Fetch team with related data
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select(`
        *,
        venue:venues(*),
        coach:coaches(*),
        season_stats:team_season_stats(*)
      `)
      .eq('id', id)
      .single()

    if (teamError) {
      if (teamError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 })
      }
      throw teamError
    }

    // Fetch squad
    const { data: squad } = await supabase
      .from('player_squads')
      .select(`
        *,
        player:players(*)
      `)
      .eq('team_id', id)
      .eq('season', 2025)
      .order('number', { ascending: true })

    // Fetch recent completed matches
    const { data: recentMatches } = await supabase
      .from('fixtures')
      .select(`
        *,
        home_team:teams!fixtures_home_team_id_fkey(id, name, logo, code),
        away_team:teams!fixtures_away_team_id_fkey(id, name, logo, code)
      `)
      .or(`home_team_id.eq.${id},away_team_id.eq.${id}`)
      .in('status', ['FT', 'AET', 'PEN'])
      .order('match_date', { ascending: false })
      .limit(10)

    // Fetch upcoming matches
    const { data: upcomingMatches } = await supabase
      .from('fixtures')
      .select(`
        *,
        home_team:teams!fixtures_home_team_id_fkey(id, name, logo, code),
        away_team:teams!fixtures_away_team_id_fkey(id, name, logo, code)
      `)
      .or(`home_team_id.eq.${id},away_team_id.eq.${id}`)
      .in('status', ['NS', 'TBD', 'SUSP', 'PST'])
      .order('match_date', { ascending: true })
      .limit(5)

    // Fetch predictions involving this team
    const { data: predictions } = await supabase
      .from('predictions')
      .select(`
        *,
        fixture:fixtures(
          id,
          match_date,
          status,
          goals_home,
          goals_away,
          home_team_id,
          away_team_id,
          home_team:teams!fixtures_home_team_id_fkey(id, name, logo),
          away_team:teams!fixtures_away_team_id_fkey(id, name, logo)
        )
      `)
      .order('created_at', { ascending: false })

    // Filter predictions for this team
    const teamPredictions = predictions?.filter((p: any) =>
      p.fixture?.home_team_id === id || p.fixture?.away_team_id === id
    ) || []

    // Transform season_stats to flatten home/away JSONB fields
    const transformedStats = team.season_stats?.map((stats: any) => ({
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

    return NextResponse.json({
      ...team,
      season_stats: transformedStats,
      squad: squad || [],
      recent_matches: recentMatches || [],
      upcoming_matches: upcomingMatches || [],
      predictions: teamPredictions,
    })
  } catch (error) {
    console.error('Error fetching team:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team' },
      { status: 500 }
    )
  }
}
