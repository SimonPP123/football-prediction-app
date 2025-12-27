import { supabase, createServerClient } from './client'
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
export async function getUpcomingFixtures(limit?: number) {
  const now = new Date().toISOString()

  let query = supabase
    .from('fixtures')
    .select(`
      *,
      home_team:teams!fixtures_home_team_id_fkey(*),
      away_team:teams!fixtures_away_team_id_fkey(*),
      venue:venues(*),
      prediction:predictions(*),
      odds:odds(*)
    `)
    .gte('match_date', now)
    .in('status', ['NS', 'TBD', 'SUSP', 'PST'])
    .order('match_date', { ascending: true })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

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
      prediction:predictions(*),
      odds:odds(*)
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

// Get recently completed fixtures with their predictions (for results comparison)
export async function getRecentCompletedWithPredictions(limitRounds: number | 'all' = 2) {
  // If 'all' is requested, fetch all completed fixtures
  if (limitRounds === 'all') {
    const { data, error } = await supabase
      .from('fixtures')
      .select(`
        *,
        home_team:teams!fixtures_home_team_id_fkey(*),
        away_team:teams!fixtures_away_team_id_fkey(*),
        venue:venues(*),
        prediction:predictions(*)
      `)
      .in('status', ['FT', 'AET', 'PEN'])
      .order('match_date', { ascending: false })

    if (error) throw error
    return data || []
  }

  // Original logic: get specific number of rounds
  // First, get the rounds of recent completed matches
  const { data: recentFixtures, error: roundError } = await supabase
    .from('fixtures')
    .select('round')
    .in('status', ['FT', 'AET', 'PEN'])
    .order('match_date', { ascending: false })
    .limit(50) // Get enough to find recent rounds

  if (roundError) throw roundError

  // Extract unique rounds
  const uniqueRounds = Array.from(new Set(recentFixtures?.map(f => f.round).filter(Boolean)))
  const recentRounds = uniqueRounds.slice(0, limitRounds as number)

  if (recentRounds.length === 0) return []

  // Get all fixtures from those rounds with predictions
  const { data, error } = await supabase
    .from('fixtures')
    .select(`
      *,
      home_team:teams!fixtures_home_team_id_fkey(*),
      away_team:teams!fixtures_away_team_id_fkey(*),
      venue:venues(*),
      prediction:predictions(*)
    `)
    .in('round', recentRounds)
    .in('status', ['FT', 'AET', 'PEN'])
    .order('match_date', { ascending: false })

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
      lineups:lineups(*),
      odds:odds(*)
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

// Save prediction to history before updating
export async function savePredictionToHistory(fixtureId: string) {
  // Get current prediction
  const { data: current, error: fetchError } = await supabase
    .from('predictions')
    .select('*')
    .eq('fixture_id', fixtureId)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') throw fetchError
  if (!current) return null // No existing prediction to save

  // Use server client with service role key for INSERT operations
  const serverSupabase = createServerClient()

  // Save to history
  const { data, error } = await serverSupabase
    .from('prediction_history')
    .insert({
      fixture_id: current.fixture_id,
      model_used: current.model_used || current.model_version,
      prediction_result: current.prediction_result,
      overall_index: current.overall_index,
      factors: current.factors,
      score_predictions: current.score_predictions,
      most_likely_score: current.most_likely_score,
      analysis_text: current.analysis_text,
      key_factors: current.key_factors,
      risk_factors: current.risk_factors,
      home_win_pct: current.home_win_pct || current.factors?.home_win_pct,
      draw_pct: current.draw_pct || current.factors?.draw_pct,
      away_win_pct: current.away_win_pct || current.factors?.away_win_pct,
      over_under_2_5: current.over_under_2_5 || current.factors?.over_under,
      btts: current.btts || current.factors?.btts,
      confidence_pct: current.confidence_pct || current.overall_index,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Get prediction history for a fixture
export async function getPredictionHistory(fixtureId: string) {
  const { data, error } = await supabase
    .from('prediction_history')
    .select('*')
    .eq('fixture_id', fixtureId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Save prediction
export async function savePrediction(fixtureId: string, prediction: any, modelUsed: string = 'openai/gpt-5.2') {
  // Use server client with service role key for UPSERT operations
  const serverSupabase = createServerClient()

  // Use overall_index if provided, otherwise fall back to confidence
  // Round to integer since database columns are INTEGER type
  const overallIndex = Math.round(prediction.overall_index || prediction.confidence || 50)

  // Build the factors object - includes A-I breakdown and quick-access fields
  // If prediction.factors is provided (new format), use it; otherwise build from fields
  const factorsData = prediction.factors || {
    home_win_pct: prediction.home_win_pct,
    draw_pct: prediction.draw_pct,
    away_win_pct: prediction.away_win_pct,
    over_under: prediction.over_under,
    btts: prediction.btts,
    value_bet: prediction.value_bet,
  }

  // Round all percentage values to integers for database
  const homeWinPct = prediction.home_win_pct != null ? Math.round(prediction.home_win_pct) : null
  const drawPct = prediction.draw_pct != null ? Math.round(prediction.draw_pct) : null
  const awayWinPct = prediction.away_win_pct != null ? Math.round(prediction.away_win_pct) : null

  // Validate required fields
  if (!prediction.prediction) {
    console.error('Missing prediction field in AI output:', prediction)
    throw new Error('Invalid prediction: missing "prediction" field')
  }

  // Validate probabilities sum to 100 (within 1% tolerance)
  if (homeWinPct !== null && drawPct !== null && awayWinPct !== null) {
    const totalPct = homeWinPct + drawPct + awayWinPct
    if (Math.abs(totalPct - 100) > 1) {
      console.warn(`Prediction probabilities don't sum to 100: ${totalPct}% (${homeWinPct}/${drawPct}/${awayWinPct})`)
    }
  }

  const { data, error } = await serverSupabase
    .from('predictions')
    .upsert({
      fixture_id: fixtureId,
      overall_index: overallIndex,
      prediction_result: prediction.prediction,
      confidence_level: overallIndex >= 70 ? 'high' : overallIndex >= 50 ? 'medium' : 'low',
      confidence_pct: overallIndex,
      factors: factorsData, // Full A-I factor breakdown stored here
      analysis_text: prediction.analysis,
      key_factors: prediction.key_factors,
      risk_factors: prediction.risk_factors,
      model_version: modelUsed,
      model_used: modelUsed,
      score_predictions: prediction.score_predictions || null,
      most_likely_score: prediction.most_likely_score || null,
      home_win_pct: homeWinPct,
      draw_pct: drawPct,
      away_win_pct: awayWinPct,
      over_under_2_5: prediction.over_under_2_5,
      btts: prediction.btts,
      value_bet: prediction.value_bet,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'fixture_id' })
    .select()
    .single()

  if (error) throw error
  return data
}

// Delete prediction (main prediction for a fixture)
export async function deletePrediction(fixtureId: string) {
  const serverSupabase = createServerClient()

  const { error } = await serverSupabase
    .from('predictions')
    .delete()
    .eq('fixture_id', fixtureId)

  if (error) throw error
  return { success: true }
}

// Delete a specific prediction history record
export async function deletePredictionHistoryRecord(historyId: string) {
  const serverSupabase = createServerClient()

  const { error } = await serverSupabase
    .from('prediction_history')
    .delete()
    .eq('id', historyId)

  if (error) throw error
  return { success: true }
}

// Delete all prediction history for a fixture
export async function deleteAllPredictionHistory(fixtureId: string) {
  const serverSupabase = createServerClient()

  const { error } = await serverSupabase
    .from('prediction_history')
    .delete()
    .eq('fixture_id', fixtureId)

  if (error) throw error
  return { success: true }
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

// Get match analysis for a fixture
export async function getMatchAnalysis(fixtureId: string) {
  const { data, error } = await supabase
    .from('match_analysis')
    .select('*')
    .eq('fixture_id', fixtureId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

// Get recent analyses for a team (for memory context)
export async function getTeamRecentAnalyses(teamId: string, limit = 5) {
  const { data, error } = await supabase
    .from('match_analysis')
    .select('learning_points, key_insights, created_at, fixture_id')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// Get accuracy statistics across all analyses
export async function getAnalysisAccuracyStats() {
  const { data, error } = await supabase
    .from('match_analysis')
    .select('prediction_correct, score_correct, over_under_correct, btts_correct, accuracy_score')

  if (error) throw error

  const total = data.length
  if (total === 0) return null

  const resultCorrect = data.filter(a => a.prediction_correct).length
  const scoreCorrect = data.filter(a => a.score_correct).length
  const ouCorrect = data.filter(a => a.over_under_correct).length
  const bttsCorrect = data.filter(a => a.btts_correct).length
  const avgAccuracy = data.reduce((sum, a) => sum + a.accuracy_score, 0) / total

  return {
    total,
    result_accuracy: (resultCorrect / total) * 100,
    score_accuracy: (scoreCorrect / total) * 100,
    over_under_accuracy: (ouCorrect / total) * 100,
    btts_accuracy: (bttsCorrect / total) * 100,
    average_accuracy: avgAccuracy
  }
}
