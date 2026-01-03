import { supabase, createServerClient } from './client'
import type { Team, Fixture, Standing, Prediction, TopPerformer, TeamSeasonStats, HeadToHead } from '@/types'

// UUID validation regex for SQL injection prevention
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function validateUUID(id: string): boolean {
  return UUID_REGEX.test(id)
}

function assertValidUUID(id: string, fieldName: string): void {
  if (!validateUUID(id)) {
    throw new Error(`Invalid ${fieldName} format: must be a valid UUID`)
  }
}

// Get all teams (optionally filtered by league)
export async function getTeams(leagueId?: string): Promise<Team[]> {
  let query = supabase
    .from('teams')
    .select('*')
    .order('name')

  if (leagueId) {
    query = query.eq('league_id', leagueId)
  }

  const { data, error } = await query

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

// Get upcoming fixtures (not yet played), optionally filtered by league
export async function getUpcomingFixtures(limit?: number, leagueId?: string) {
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

  if (leagueId) {
    query = query.eq('league_id', leagueId)
  }

  if (limit) {
    query = query.limit(limit)
  } else {
    // Ensure we get all fixtures (Supabase default limit is 1000)
    query = query.limit(500)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Get next round fixtures (optionally filtered by league)
export async function getNextRoundFixtures(leagueId?: string) {
  const now = new Date().toISOString()

  // First get the next round
  let nextRoundQuery = supabase
    .from('fixtures')
    .select('round, league_id')
    .gte('match_date', now)
    .in('status', ['NS', 'TBD'])
    .order('match_date', { ascending: true })
    .limit(1)

  if (leagueId) {
    nextRoundQuery = nextRoundQuery.eq('league_id', leagueId)
  }

  const { data: nextFixture } = await nextRoundQuery.single()

  if (!nextFixture) return []

  // Type assertion
  const fixture = nextFixture as any

  // Get all fixtures for that round
  let fixturesQuery = supabase
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

  if (leagueId) {
    fixturesQuery = fixturesQuery.eq('league_id', leagueId)
  }

  const { data, error } = await fixturesQuery

  if (error) throw error
  return data || []
}

// Get live/in-progress fixtures (optionally filtered by league)
export async function getLiveFixtures(leagueId?: string) {
  let query = supabase
    .from('fixtures')
    .select(`
      *,
      home_team:teams!fixtures_home_team_id_fkey(*),
      away_team:teams!fixtures_away_team_id_fkey(*),
      venue:venues(*)
    `)
    .in('status', ['1H', '2H', 'HT', 'ET', 'BT', 'P'])
    .order('match_date', { ascending: true })

  if (leagueId) {
    query = query.eq('league_id', leagueId)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Get live fixtures with predictions, stats, events, and full details (for PredictionCard display)
export async function getLiveFixturesWithFactors(limit = 6, leagueId?: string) {
  // A match can only be "live" if it started within the last 3 hours
  // (football matches are ~2 hours max with extra time)
  const now = new Date()
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000)

  let query = supabase
    .from('fixtures')
    .select(`
      *,
      home_team:teams!fixtures_home_team_id_fkey(*),
      away_team:teams!fixtures_away_team_id_fkey(*),
      venue:venues(*),
      prediction:predictions(*),
      odds:odds(*),
      weather:weather(*),
      fixture_statistics(*),
      fixture_events(*)
    `)
    .in('status', ['1H', '2H', 'HT', 'ET', 'BT', 'P'])
    .lte('match_date', now.toISOString())           // Match has started
    .gte('match_date', threeHoursAgo.toISOString()) // Started within last 3 hours
    .order('match_date', { ascending: true })
    .limit(limit)

  if (leagueId) {
    query = query.eq('league_id', leagueId)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Get completed fixtures (optionally filtered by league)
export async function getCompletedFixtures(limit = 20, leagueId?: string) {
  let query = supabase
    .from('fixtures')
    .select(`
      *,
      home_team:teams!fixtures_home_team_id_fkey(*),
      away_team:teams!fixtures_away_team_id_fkey(*)
    `)
    .in('status', ['FT', 'AET', 'PEN'])
    .order('match_date', { ascending: false })
    .limit(limit)

  if (leagueId) {
    query = query.eq('league_id', leagueId)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Get recently completed fixtures with their predictions (for results comparison), optionally filtered by league
export async function getRecentCompletedWithPredictions(limitRounds: number | 'all' = 2, leagueId?: string) {
  // If 'all' is requested, fetch all completed fixtures
  if (limitRounds === 'all') {
    let query = supabase
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

    if (leagueId) {
      query = query.eq('league_id', leagueId)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  // Original logic: get specific number of rounds
  // First, get the rounds of recent completed matches
  let roundQuery = supabase
    .from('fixtures')
    .select('round')
    .in('status', ['FT', 'AET', 'PEN'])
    .order('match_date', { ascending: false })
    .limit(50) // Get enough to find recent rounds

  if (leagueId) {
    roundQuery = roundQuery.eq('league_id', leagueId)
  }

  const { data: recentFixtures, error: roundError } = await roundQuery

  if (roundError) throw roundError

  // Extract unique rounds
  const uniqueRounds = Array.from(new Set(recentFixtures?.map(f => f.round).filter(Boolean)))
  const recentRounds = uniqueRounds.slice(0, limitRounds as number)

  if (recentRounds.length === 0) return []

  // Get all fixtures from those rounds with predictions
  let fixturesQuery = supabase
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

  if (leagueId) {
    fixturesQuery = fixturesQuery.eq('league_id', leagueId)
  }

  const { data, error } = await fixturesQuery

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

// Get standings (optionally filtered by league)
export async function getStandings(leagueId?: string, season: number = 2025): Promise<any[]> {
  let query = supabase
    .from('standings')
    .select(`
      *,
      team:teams(*)
    `)
    .eq('season', season)
    .order('rank', { ascending: true })

  if (leagueId) {
    query = query.eq('league_id', leagueId)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Get top performers (optionally filtered by league)
export async function getTopPerformers(category: 'goals' | 'assists' | 'yellow_cards' | 'red_cards', limit = 10, leagueId?: string, season: number = 2025) {
  let query = supabase
    .from('top_performers')
    .select('*')
    .eq('category', category)
    .eq('season', season)
    .order('rank', { ascending: true })
    .limit(limit)

  if (leagueId) {
    query = query.eq('league_id', leagueId)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Get head to head between two teams
export async function getHeadToHead(team1Id: string, team2Id: string) {
  // Validate UUIDs to prevent SQL injection
  assertValidUUID(team1Id, 'team1Id')
  assertValidUUID(team2Id, 'team2Id')

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
  // Validate UUID to prevent SQL injection
  assertValidUUID(teamId, 'teamId')

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
      league_id: current.league_id,
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
      certainty_score: current.certainty_score,
      home_team_news: current.home_team_news,
      away_team_news: current.away_team_news,
      raw_ai_output: current.raw_ai_output,
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
export async function savePrediction(fixtureId: string, prediction: any, modelUsed: string = 'openai/gpt-5-mini') {
  // Use server client with service role key for UPSERT operations
  const serverSupabase = createServerClient()

  // AUTO-SAVE TO HISTORY: Check if prediction already exists
  // If it does, save current prediction to history BEFORE overwriting
  const existingPrediction = await getPrediction(fixtureId)
  if (existingPrediction) {
    try {
      await savePredictionToHistory(fixtureId)
      console.log(`[savePrediction] Saved existing prediction to history for fixture ${fixtureId}`)
    } catch (historyError) {
      console.error(`[savePrediction] Failed to save history for fixture ${fixtureId}:`, historyError)
      // Continue with save even if history fails - don't block the new prediction
    }
  }

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
      league_id: prediction.league_id || null,
      overall_index: overallIndex,
      prediction_result: prediction.prediction,
      confidence_level: overallIndex >= 70 ? 'high' : overallIndex >= 50 ? 'medium' : 'low',
      confidence_pct: overallIndex,
      certainty_score: prediction.certainty_score ? Math.round(prediction.certainty_score) : null,
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
      home_team_news: prediction.home_team_news || null,
      away_team_news: prediction.away_team_news || null,
      raw_ai_output: prediction.raw_ai_output || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'fixture_id' })
    .select()
    .single()

  if (error) throw error
  return data
}

// Delete prediction (main prediction for a fixture)
// After deletion, promotes the most recent history record to main prediction
export async function deletePrediction(fixtureId: string) {
  const serverSupabase = createServerClient()

  // 1. Delete from predictions table
  const { error } = await serverSupabase
    .from('predictions')
    .delete()
    .eq('fixture_id', fixtureId)

  if (error) throw error

  // 2. Get most recent history record to promote as new main prediction
  const { data: history, error: historyError } = await supabase
    .from('prediction_history')
    .select('*')
    .eq('fixture_id', fixtureId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // 3. If history exists, promote it to main prediction
  if (!historyError && history) {
    const { error: insertError } = await serverSupabase
      .from('predictions')
      .insert({
        fixture_id: fixtureId,
        league_id: history.league_id,
        prediction_result: history.prediction_result,
        overall_index: history.overall_index,
        confidence_level: history.overall_index >= 70 ? 'high' : history.overall_index >= 50 ? 'medium' : 'low',
        confidence_pct: history.confidence_pct || history.overall_index,
        certainty_score: history.certainty_score,
        factors: history.factors,
        analysis_text: history.analysis_text,
        key_factors: history.key_factors,
        risk_factors: history.risk_factors,
        model_version: history.model_used,
        model_used: history.model_used,
        score_predictions: history.score_predictions,
        most_likely_score: history.most_likely_score,
        home_win_pct: history.home_win_pct,
        draw_pct: history.draw_pct,
        away_win_pct: history.away_win_pct,
        over_under_2_5: history.over_under_2_5,
        btts: history.btts,
        home_team_news: history.home_team_news,
        away_team_news: history.away_team_news,
        raw_ai_output: history.raw_ai_output,
        updated_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error(`[deletePrediction] Failed to promote history to main:`, insertError)
    } else {
      // Delete the promoted history record to avoid duplication
      await serverSupabase
        .from('prediction_history')
        .delete()
        .eq('id', history.id)

      console.log(`[deletePrediction] Promoted history ${history.id} to main prediction for fixture ${fixtureId}`)
      return { success: true, promoted: true, promotedFrom: history.id }
    }
  }

  // If no history, fixture will show "Generate Prediction" button
  return { success: true, promoted: false }
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
  // Validate UUID to prevent SQL injection
  assertValidUUID(teamId, 'teamId')

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
export async function getAnalysisAccuracyStats(leagueId?: string) {
  // Note: match_analysis doesn't have league_id column, so we filter via fixture join
  let query = supabase
    .from('match_analysis')
    .select('prediction_correct, score_correct, over_under_correct, btts_correct, accuracy_score, fixture:fixtures!inner(league_id)')

  if (leagueId) {
    query = query.eq('fixture.league_id', leagueId)
  }

  const { data, error } = await query

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

// Get accuracy statistics grouped by model (optionally filtered by league)
export async function getAccuracyByModel(leagueId?: string) {
  // Note: match_analysis doesn't have league_id, so we filter via fixture join
  let query = supabase
    .from('match_analysis')
    .select('model_version, prediction_correct, score_correct, over_under_correct, btts_correct, accuracy_score, fixture:fixtures!inner(league_id)')

  if (leagueId) {
    query = query.eq('fixture.league_id', leagueId)
  }

  const { data, error } = await query

  if (error) throw error
  if (!data || data.length === 0) return []

  // Group by model
  const byModel: Record<string, {
    total: number
    resultCorrect: number
    scoreCorrect: number
    ouCorrect: number
    bttsCorrect: number
    totalAccuracy: number
  }> = {}

  data.forEach(analysis => {
    const model = analysis.model_version || 'Unknown'
    if (!byModel[model]) {
      byModel[model] = {
        total: 0,
        resultCorrect: 0,
        scoreCorrect: 0,
        ouCorrect: 0,
        bttsCorrect: 0,
        totalAccuracy: 0
      }
    }
    byModel[model].total++
    if (analysis.prediction_correct) byModel[model].resultCorrect++
    if (analysis.score_correct) byModel[model].scoreCorrect++
    if (analysis.over_under_correct) byModel[model].ouCorrect++
    if (analysis.btts_correct) byModel[model].bttsCorrect++
    byModel[model].totalAccuracy += analysis.accuracy_score || 0
  })

  return Object.entries(byModel)
    .map(([model, stats]) => ({
      model,
      total: stats.total,
      result_accuracy: (stats.resultCorrect / stats.total) * 100,
      score_accuracy: (stats.scoreCorrect / stats.total) * 100,
      over_under_accuracy: (stats.ouCorrect / stats.total) * 100,
      btts_accuracy: (stats.bttsCorrect / stats.total) * 100,
      average_accuracy: stats.totalAccuracy / stats.total
    }))
    .sort((a, b) => b.average_accuracy - a.average_accuracy)
}

// Get calibration data - compare predicted confidence with actual accuracy (optionally filtered by league)
export async function getCalibrationData(leagueId?: string) {
  // Note: match_analysis doesn't have league_id, so we filter via fixture join
  let query = supabase
    .from('match_analysis')
    .select('confidence_pct, prediction_correct, fixture:fixtures!inner(league_id)')

  if (leagueId) {
    query = query.eq('fixture.league_id', leagueId)
  }

  const { data, error } = await query

  if (error) throw error
  if (!data || data.length === 0) return []

  // Bucket by confidence level (10% buckets)
  const buckets: Record<string, { predicted: number; correct: number }> = {}

  data.forEach(analysis => {
    const confidence = analysis.confidence_pct || 50
    const bucketStart = Math.floor(confidence / 10) * 10
    const bucketKey = `${bucketStart}-${bucketStart + 9}`

    if (!buckets[bucketKey]) {
      buckets[bucketKey] = { predicted: 0, correct: 0 }
    }

    buckets[bucketKey].predicted++
    if (analysis.prediction_correct) {
      buckets[bucketKey].correct++
    }
  })

  return Object.entries(buckets)
    .map(([bucket, data]) => ({
      bucket,
      expectedRate: parseInt(bucket.split('-')[0]) + 5, // midpoint
      actualRate: data.predicted > 0 ? (data.correct / data.predicted) * 100 : 0,
      count: data.predicted
    }))
    .sort((a, b) => a.expectedRate - b.expectedRate)
}

// Get dashboard statistics
export async function getDashboardStats(leagueId?: string) {
  // Build queries with optional league filter
  let fixturesQuery = supabase.from('fixtures').select('*', { count: 'exact', head: true })
  let completedQuery = supabase.from('fixtures').select('*', { count: 'exact', head: true }).in('status', ['FT', 'AET', 'PEN'])
  let upcomingQuery = supabase.from('fixtures').select('*', { count: 'exact', head: true }).in('status', ['NS', 'TBD', 'SUSP', 'PST'])
  let predictionsQuery = supabase.from('predictions').select('*', { count: 'exact', head: true })
  let teamsQuery = supabase.from('teams').select('id')

  if (leagueId) {
    fixturesQuery = fixturesQuery.eq('league_id', leagueId)
    completedQuery = completedQuery.eq('league_id', leagueId)
    upcomingQuery = upcomingQuery.eq('league_id', leagueId)
    predictionsQuery = predictionsQuery.eq('league_id', leagueId)
    teamsQuery = teamsQuery.eq('league_id', leagueId)
  }

  // analysisStats includes league-filtered total count via fixture join
  const [
    { count: totalFixtures },
    { count: completedFixtures },
    { count: upcomingFixtures },
    { count: totalPredictions },
    { data: teams },
    analysisStats,
  ] = await Promise.all([
    fixturesQuery,
    completedQuery,
    upcomingQuery,
    predictionsQuery,
    teamsQuery,
    getAnalysisAccuracyStats(leagueId),
  ])

  return {
    totalFixtures: totalFixtures || 0,
    completedFixtures: completedFixtures || 0,
    upcomingFixtures: upcomingFixtures || 0,
    totalPredictions: totalPredictions || 0,
    analyzedMatches: analysisStats?.total || 0,
    totalTeams: teams?.length || 20,
    resultAccuracy: analysisStats?.result_accuracy || 0,
    averageAccuracy: analysisStats?.average_accuracy || 0,
  }
}

// Get upcoming fixtures with predictions and factor details (optionally filtered by league)
export async function getUpcomingWithFactors(limit = 6, leagueId?: string) {
  const now = new Date().toISOString()

  let query = supabase
    .from('fixtures')
    .select(`
      *,
      home_team:teams!fixtures_home_team_id_fkey(*),
      away_team:teams!fixtures_away_team_id_fkey(*),
      venue:venues(*),
      prediction:predictions(*),
      odds:odds(*),
      weather:weather(*)
    `)
    .gte('match_date', now)
    .in('status', ['NS', 'TBD', 'SUSP', 'PST'])
    .order('match_date', { ascending: true })
    .limit(limit)

  if (leagueId) {
    query = query.eq('league_id', leagueId)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Get recent results with prediction accuracy (optionally filtered by league)
export async function getRecentResultsWithAccuracy(limit = 5, leagueId?: string) {
  let query = supabase
    .from('fixtures')
    .select(`
      *,
      home_team:teams!fixtures_home_team_id_fkey(*),
      away_team:teams!fixtures_away_team_id_fkey(*),
      prediction:predictions(*),
      match_analysis:match_analysis(*)
    `)
    .in('status', ['FT', 'AET', 'PEN'])
    .order('match_date', { ascending: false })
    .limit(limit)

  if (leagueId) {
    query = query.eq('league_id', leagueId)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Get best performing factor from analyses
export async function getBestPerformingFactor(leagueId?: string) {
  // Note: match_analysis doesn't have league_id column, so we filter via fixture join
  let query = supabase
    .from('match_analysis')
    .select('factor_accuracy, fixture:fixtures!inner(league_id)')
    .not('factor_accuracy', 'is', null)
    .limit(100)

  if (leagueId) {
    query = query.eq('fixture.league_id', leagueId)
  }

  const { data, error } = await query

  if (error) throw error
  if (!data || data.length === 0) return null

  // Aggregate factor accuracies
  const factorTotals: Record<string, { correct: number; total: number }> = {}

  data.forEach(analysis => {
    const factors = analysis.factor_accuracy as Record<string, boolean> | null
    if (!factors) return

    Object.entries(factors).forEach(([factor, correct]) => {
      if (!factorTotals[factor]) {
        factorTotals[factor] = { correct: 0, total: 0 }
      }
      factorTotals[factor].total++
      if (correct) factorTotals[factor].correct++
    })
  })

  // Find best performing factor
  let bestFactor = null
  let bestAccuracy = 0

  Object.entries(factorTotals).forEach(([factor, stats]) => {
    if (stats.total >= 5) { // Minimum sample size
      const accuracy = (stats.correct / stats.total) * 100
      if (accuracy > bestAccuracy) {
        bestAccuracy = accuracy
        bestFactor = { factor, accuracy, total: stats.total }
      }
    }
  })

  return bestFactor
}
