import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { getLeagueFromRequest } from '@/lib/league-context'
import { isValidUUID } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Validate team ID format
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid team ID format' },
        { status: 400 }
      )
    }

    const league = await getLeagueFromRequest(request)

    // Fetch team with related data first (needed to check if team exists)
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select(`
        *,
        venue:venues(*),
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

    // Run remaining queries in parallel for better performance
    const [
      coachResult,
      squadResult,
      recentMatchesResult,
      upcomingMatchesResult,
      fixtureIdsResult,
    ] = await Promise.all([
      // Fetch coach (reverse FK relationship)
      supabase
        .from('coaches')
        .select('*')
        .eq('team_id', id)
        .single(),

      // Fetch squad
      supabase
        .from('player_squads')
        .select(`
          *,
          player:players(*)
        `)
        .eq('team_id', id)
        .eq('season', 2025)
        .order('number', { ascending: true }),

      // Fetch recent completed matches
      supabase
        .from('fixtures')
        .select(`
          *,
          home_team:teams!fixtures_home_team_id_fkey(id, name, logo, code),
          away_team:teams!fixtures_away_team_id_fkey(id, name, logo, code)
        `)
        .or(`home_team_id.eq.${id},away_team_id.eq.${id}`)
        .in('status', ['FT', 'AET', 'PEN'])
        .order('match_date', { ascending: false })
        .limit(10),

      // Fetch upcoming matches
      supabase
        .from('fixtures')
        .select(`
          *,
          home_team:teams!fixtures_home_team_id_fkey(id, name, logo, code),
          away_team:teams!fixtures_away_team_id_fkey(id, name, logo, code)
        `)
        .or(`home_team_id.eq.${id},away_team_id.eq.${id}`)
        .in('status', ['NS', 'TBD', 'SUSP', 'PST'])
        .order('match_date', { ascending: true })
        .limit(5),

      // Get fixture IDs for this team to filter predictions efficiently
      supabase
        .from('fixtures')
        .select('id')
        .or(`home_team_id.eq.${id},away_team_id.eq.${id}`)
        .limit(50),
    ])

    const coachData = coachResult.data
    const squad = squadResult.data
    const recentMatches = recentMatchesResult.data
    const upcomingMatches = upcomingMatchesResult.data
    const fixtureIds = fixtureIdsResult.data?.map((f: { id: string }) => f.id) || []

    if (recentMatchesResult.error) {
      console.error('[Team API] Recent matches error:', recentMatchesResult.error)
    }

    if (upcomingMatchesResult.error) {
      console.error('[Team API] Upcoming matches error:', upcomingMatchesResult.error)
    }

    // Fetch predictions only for this team's fixtures (efficient DB-level filter)
    let teamPredictions: any[] = []
    if (fixtureIds.length > 0) {
      let predictionsQuery = supabase
        .from('predictions')
        .select(`
          *,
          fixture:fixtures!inner(
            id,
            match_date,
            status,
            goals_home,
            goals_away,
            home_team_id,
            away_team_id,
            league_id,
            home_team:teams!fixtures_home_team_id_fkey(id, name, logo),
            away_team:teams!fixtures_away_team_id_fkey(id, name, logo)
          )
        `)
        .in('fixture_id', fixtureIds)
        .order('created_at', { ascending: false })
        .limit(20)

      // Filter by league if available
      if (league?.id) {
        predictionsQuery = predictionsQuery.eq('fixture.league_id', league.id)
      }

      const { data: predictions } = await predictionsQuery
      teamPredictions = predictions || []
    }

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
      coach: coachData || null,
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
