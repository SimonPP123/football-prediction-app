import { supabase } from './client'
import type { Team, Fixture, Standing, Prediction, TopPerformer, TeamSeasonStats, HeadToHead } from '@/types'

// Get all teams
export async function getTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('name')

  if (error) throw error
  return data || []
}

// Get single team with details
export async function getTeam(id: string) {
  const { data, error } = await supabase
    .from('teams')
    .select(`
      *,
      venue:venues(*),
      coach:coaches(*),
      season_stats:team_season_stats(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Get upcoming fixtures (not yet played)
export async function getUpcomingFixtures(limit = 10) {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('fixtures')
    .select(`
      *,
      home_team:teams!fixtures_home_team_id_fkey(*),
      away_team:teams!fixtures_away_team_id_fkey(*),
      venue:venues(*),
      prediction:predictions(*)
    `)
    .gte('match_date', now)
    .in('status', ['NS', 'TBD', 'SUSP', 'PST'])
    .order('match_date', { ascending: true })
    .limit(limit)

  if (error) throw error
  return data || []
}

// Get next round fixtures
export async function getNextRoundFixtures() {
  const now = new Date().toISOString()

  // First get the next round
  const { data: nextFixture } = await supabase
    .from('fixtures')
    .select('round')
    .gte('match_date', now)
    .in('status', ['NS', 'TBD'])
    .order('match_date', { ascending: true })
    .limit(1)
    .single()

  if (!nextFixture) return []

  // Type assertion
  const fixture = nextFixture as any

  // Get all fixtures for that round
  const { data, error } = await supabase
    .from('fixtures')
    .select(`
      *,
      home_team:teams!fixtures_home_team_id_fkey(*),
      away_team:teams!fixtures_away_team_id_fkey(*),
      venue:venues(*),
      prediction:predictions(*)
    `)
    .eq('round', fixture.round)
    .order('match_date', { ascending: true })

  if (error) throw error
  return data || []
}

// Get completed fixtures
export async function getCompletedFixtures(limit = 20) {
  const { data, error } = await supabase
    .from('fixtures')
    .select(`
      *,
      home_team:teams!fixtures_home_team_id_fkey(*),
      away_team:teams!fixtures_away_team_id_fkey(*)
    `)
    .in('status', ['FT', 'AET', 'PEN'])
    .order('match_date', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// Get fixture by ID with full details
export async function getFixture(id: string) {
  const { data, error } = await supabase
    .from('fixtures')
    .select(`
      *,
      home_team:teams!fixtures_home_team_id_fkey(*),
      away_team:teams!fixtures_away_team_id_fkey(*),
      venue:venues(*),
      prediction:predictions(*),
      statistics:fixture_statistics(*),
      events:fixture_events(*),
      lineups:lineups(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Get standings
export async function getStandings(): Promise<any[]> {
  const { data, error } = await supabase
    .from('standings')
    .select(`
      *,
      team:teams(*)
    `)
    .eq('season', 2025)
    .order('rank', { ascending: true })

  if (error) throw error
  return data || []
}

// Get top performers
export async function getTopPerformers(category: 'goals' | 'assists' | 'yellow_cards' | 'red_cards', limit = 10) {
  const { data, error } = await supabase
    .from('top_performers')
    .select('*')
    .eq('category', category)
    .eq('season', 2025)
    .order('rank', { ascending: true })
    .limit(limit)

  if (error) throw error
  return data || []
}

// Get head to head between two teams
export async function getHeadToHead(team1Id: string, team2Id: string) {
  const { data, error } = await supabase
    .from('head_to_head')
    .select('*')
    .or(`and(team1_id.eq.${team1Id},team2_id.eq.${team2Id}),and(team1_id.eq.${team2Id},team2_id.eq.${team1Id})`)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

// Get team form (last N matches)
export async function getTeamForm(teamId: string, limit = 5) {
  const { data, error } = await supabase
    .from('fixtures')
    .select('*')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .in('status', ['FT', 'AET', 'PEN'])
    .order('match_date', { ascending: false })
    .limit(limit)

  if (error) throw error

  // Calculate form string
  return (data || []).map((fixtureData) => {
    const fixture = fixtureData as any
    const isHome = fixture.home_team_id === teamId
    const teamGoals = isHome ? fixture.goals_home : fixture.goals_away
    const oppGoals = isHome ? fixture.goals_away : fixture.goals_home

    if (teamGoals === null || oppGoals === null) return 'N'
    if (teamGoals > oppGoals) return 'W'
    if (teamGoals < oppGoals) return 'L'
    return 'D'
  })
}

// Get prediction for fixture
export async function getPrediction(fixtureId: string) {
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('fixture_id', fixtureId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

// Save prediction
export async function savePrediction(fixtureId: string, prediction: any) {
  const { data, error } = await supabase
    .from('predictions')
    .upsert({
      fixture_id: fixtureId,
      overall_index: prediction.confidence,
      prediction_result: prediction.prediction_1x2,
      confidence_level: prediction.confidence >= 70 ? 'high' : prediction.confidence >= 50 ? 'medium' : 'low',
      factors: {
        home_win_pct: prediction.home_win_pct,
        draw_pct: prediction.draw_pct,
        away_win_pct: prediction.away_win_pct,
        over_under: prediction.over_under,
        btts: prediction.btts,
        value_bet: prediction.value_bet,
      },
      analysis_text: prediction.detailed_analysis,
      key_factors: prediction.key_factors,
      risk_factors: prediction.risk_factors,
      model_version: 'gpt-4o',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'fixture_id' })
    .select()
    .single()

  if (error) throw error
  return data
}

// Get team season stats
export async function getTeamSeasonStats(teamId: string) {
  const { data, error } = await supabase
    .from('team_season_stats')
    .select('*')
    .eq('team_id', teamId)
    .eq('season', 2025)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

// Get injuries for a team
export async function getTeamInjuries(teamId: string) {
  const { data, error } = await supabase
    .from('injuries')
    .select('*')
    .eq('team_id', teamId)
    .order('reported_date', { ascending: false })

  if (error) throw error
  return data || []
}
