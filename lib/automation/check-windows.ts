import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Timing windows configuration (in minutes)
// Windows define when cron picks up fixtures for each trigger type
export const TIMING_WINDOWS = {
  PRE_MATCH: { minBefore: 50, maxBefore: 60 },    // 50-60 min before kickoff (10 min window)
  PREDICTION: { minBefore: 10, maxBefore: 50 },   // 10-50 min before kickoff (40 min window)
  LIVE: { statuses: ['1H', '2H', 'HT', 'ET', 'BT', 'P'] },
  POST_MATCH: { minAfter: 355, maxAfter: 365 },   // ~6 hours after kickoff (10 min window)
  ANALYSIS: { minAfter: 370, maxAfter: 380 }      // ~6h 15min after kickoff (10 min window)
} as const

// Processing configuration for batch operations
export const PROCESSING_CONFIG = {
  MAX_PREDICTIONS_PER_RUN: 9,     // Maximum predictions per cron run (3 batches of 3)
  MAX_ANALYSES_PER_RUN: 9,        // Maximum analyses per cron run (3 batches of 3)
  BATCH_SIZE: 3,                   // Number of fixtures to process in parallel
  PROCESSING_BUFFER_MINUTES: 7,    // Wait this many minutes before considering a trigger as failed
  BATCH_DELAY_MS: 1000             // Delay between batches in milliseconds
} as const

export type TriggerType = 'pre-match' | 'prediction' | 'live' | 'post-match' | 'analysis'

export interface FixtureForTrigger {
  id: string
  api_id: number
  league_id: string
  match_date: string
  status: string
  home_team_id: string
  away_team_id: string
  home_team?: { id: string; name: string }
  away_team?: { id: string; name: string }
  venue?: { name: string }
  round?: string
  goals_home?: number
  goals_away?: number
}

export interface LeagueWithFixtures {
  league_id: string
  league_name: string
  fixtures: FixtureForTrigger[]
}

/**
 * Query fixtures that are 50-60 minutes before kickoff (pre-match window)
 * Only returns fixtures that haven't been triggered yet today
 */
export async function queryPreMatchFixtures(): Promise<LeagueWithFixtures[]> {
  const now = new Date()
  const minAhead = new Date(now.getTime() + TIMING_WINDOWS.PRE_MATCH.minBefore * 60 * 1000)
  const maxAhead = new Date(now.getTime() + TIMING_WINDOWS.PRE_MATCH.maxBefore * 60 * 1000)

  const { data: fixtures, error } = await supabase
    .from('fixtures')
    .select(`
      id, api_id, league_id, match_date, status, home_team_id, away_team_id, round,
      pre_match_triggered_at,
      home_team:teams!fixtures_home_team_id_fkey(id, name),
      away_team:teams!fixtures_away_team_id_fkey(id, name),
      venue:venues(name),
      league:leagues!inner(id, name, is_active)
    `)
    .eq('status', 'NS')
    .gte('match_date', minAhead.toISOString())
    .lte('match_date', maxAhead.toISOString())
    .eq('league.is_active', true)

  if (error || !fixtures) return []

  // Filter out fixtures that have already been triggered for pre-match today
  // Pre-match only needs to run once per fixture
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const needsPreMatch = fixtures.filter(f => {
    const triggeredAt = f.pre_match_triggered_at ? new Date(f.pre_match_triggered_at) : null
    // If never triggered or triggered before today, include it
    if (!triggeredAt) return true
    if (triggeredAt < todayStart) return true
    // Already triggered today - skip
    return false
  })

  if (needsPreMatch.length > 0) {
    console.log(`[Query Pre-Match] Found ${needsPreMatch.length} fixtures needing pre-match (${fixtures.length - needsPreMatch.length} already triggered)`)
  }

  // Group by league
  return groupByLeague(needsPreMatch)
}

/**
 * Query fixtures that need predictions (with retry logic)
 *
 * GOAL: Ensure exactly ONE successful AUTOMATED prediction per fixture.
 * Manual predictions do NOT block automation - automation will regenerate with fresh data.
 *
 * Includes:
 * 1. Fixtures in prediction window (10-50 min before kickoff) without automated prediction
 * 2. Fixtures that were triggered >7 min ago but automation failed (retry)
 *
 * Excludes:
 * - Fixtures with source='automation' prediction (automation already succeeded)
 * - Fixtures triggered <7 min ago (still processing)
 *
 * Returns sorted by kickoff time (earliest first), limited to MAX_PREDICTIONS_PER_RUN
 */
export async function queryPredictionFixtures(): Promise<FixtureForTrigger[]> {
  const now = new Date()
  const processingBuffer = PROCESSING_CONFIG.PROCESSING_BUFFER_MINUTES * 60 * 1000
  const bufferCutoff = new Date(now.getTime() - processingBuffer)

  // Window boundaries (when fixtures enter the prediction window)
  const windowStart = new Date(now.getTime() + TIMING_WINDOWS.PREDICTION.minBefore * 60 * 1000)
  const windowEnd = new Date(now.getTime() + TIMING_WINDOWS.PREDICTION.maxBefore * 60 * 1000)

  const { data: fixtures, error } = await supabase
    .from('fixtures')
    .select(`
      id, api_id, league_id, match_date, status, home_team_id, away_team_id, round,
      prediction_triggered_at,
      home_team:teams!fixtures_home_team_id_fkey(id, name),
      away_team:teams!fixtures_away_team_id_fkey(id, name),
      venue:venues(name),
      league:leagues!inner(id, name, is_active),
      predictions(id, source)
    `)
    .eq('status', 'NS')
    .gte('match_date', windowStart.toISOString())
    .lte('match_date', windowEnd.toISOString())
    .eq('league.is_active', true)
    .order('match_date', { ascending: true })

  if (error || !fixtures) {
    console.error('[Query Predictions] Error:', error)
    return []
  }

  // Filter fixtures that need prediction generation
  const needsPrediction = fixtures.filter(f => {
    const predictions = f.predictions && Array.isArray(f.predictions) ? f.predictions : []
    const triggeredAt = f.prediction_triggered_at ? new Date(f.prediction_triggered_at) : null
    const homeName = (f.home_team as any)?.name || 'Unknown'
    const awayName = (f.away_team as any)?.name || 'Unknown'

    // Check if automation already succeeded: has prediction with source='automation'
    const hasAutomatedPrediction = predictions.some((p: any) => p.source === 'automation')

    if (hasAutomatedPrediction) {
      console.log(`[Query Predictions] SKIP ${homeName} vs ${awayName}: Automated prediction exists`)
      return false
    }

    // No automated prediction - check if we should trigger or wait
    if (triggeredAt) {
      // Automation was triggered but hasn't completed yet
      // If triggered recently (within buffer), skip - still processing
      if (triggeredAt > bufferCutoff) {
        const minAgo = Math.round((now.getTime() - triggeredAt.getTime()) / 60000)
        console.log(`[Query Predictions] SKIP ${homeName} vs ${awayName}: Triggered ${minAgo} min ago, still processing (buffer: ${PROCESSING_CONFIG.PROCESSING_BUFFER_MINUTES} min)`)
        return false
      }

      // Triggered >7 min ago but no automated prediction - retry needed
      const minAgo = Math.round((now.getTime() - triggeredAt.getTime()) / 60000)
      console.log(`[Query Predictions] INCLUDE ${homeName} vs ${awayName}: Automation failed, retrying after ${minAgo} min`)
      return true
    }

    // Never triggered - include (manual predictions don't block automation)
    const manualCount = predictions.length
    if (manualCount > 0) {
      console.log(`[Query Predictions] INCLUDE ${homeName} vs ${awayName}: Has ${manualCount} manual prediction(s), automation not yet run`)
    } else {
      console.log(`[Query Predictions] INCLUDE ${homeName} vs ${awayName}: No prediction, never triggered`)
    }
    return true
  })

  // Limit to MAX_PREDICTIONS_PER_RUN
  const limited = needsPrediction.slice(0, PROCESSING_CONFIG.MAX_PREDICTIONS_PER_RUN)

  if (limited.length > 0) {
    console.log(`[Query Predictions] Found ${needsPrediction.length} fixtures needing predictions, processing ${limited.length}`)
  }

  return limited.map(f => ({
    id: f.id,
    api_id: f.api_id,
    league_id: f.league_id,
    match_date: f.match_date,
    status: f.status,
    home_team_id: f.home_team_id,
    away_team_id: f.away_team_id,
    round: f.round,
    home_team: Array.isArray(f.home_team) ? f.home_team[0] : f.home_team,
    away_team: Array.isArray(f.away_team) ? f.away_team[0] : f.away_team,
    venue: Array.isArray(f.venue) ? f.venue[0] : f.venue
  }))
}

/**
 * Query leagues that have live matches
 */
export async function queryLiveLeagues(): Promise<{ league_id: string; league_name: string; live_count: number }[]> {
  const { data: fixtures, error } = await supabase
    .from('fixtures')
    .select(`
      id, league_id,
      league:leagues!inner(id, name, is_active)
    `)
    .in('status', TIMING_WINDOWS.LIVE.statuses)
    .eq('league.is_active', true)

  if (error || !fixtures) return []

  // Group and count by league
  const leagueMap = new Map<string, { league_id: string; league_name: string; live_count: number }>()

  for (const fixture of fixtures) {
    const leagueId = fixture.league_id
    const leagueName = (fixture.league as any)?.name || 'Unknown'

    if (leagueMap.has(leagueId)) {
      leagueMap.get(leagueId)!.live_count++
    } else {
      leagueMap.set(leagueId, {
        league_id: leagueId,
        league_name: leagueName,
        live_count: 1
      })
    }
  }

  return Array.from(leagueMap.values())
}

/**
 * Query leagues that have finished matches in post-match window (90-150 min after FT)
 * Only includes fixtures that haven't been triggered for post-match yet
 */
export async function queryPostMatchLeagues(): Promise<{ league_id: string; league_name: string; finished_count: number; fixture_ids: string[] }[]> {
  const now = new Date()
  const minAgo = new Date(now.getTime() - TIMING_WINDOWS.POST_MATCH.maxAfter * 60 * 1000)
  const maxAgo = new Date(now.getTime() - TIMING_WINDOWS.POST_MATCH.minAfter * 60 * 1000)

  const { data: fixtures, error } = await supabase
    .from('fixtures')
    .select(`
      id, league_id, post_match_triggered_at,
      league:leagues!inner(id, name, is_active)
    `)
    .eq('status', 'FT')
    .gte('match_date', minAgo.toISOString())
    .lte('match_date', maxAgo.toISOString())
    .eq('league.is_active', true)

  if (error || !fixtures) return []

  // Filter out fixtures that have already been triggered for post-match
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const needsPostMatch = fixtures.filter(f => {
    const triggeredAt = f.post_match_triggered_at ? new Date(f.post_match_triggered_at) : null
    // If never triggered or triggered before today, include it
    if (!triggeredAt) return true
    if (triggeredAt < todayStart) return true
    // Already triggered today - skip
    return false
  })

  if (needsPostMatch.length === 0) return []

  console.log(`[Query Post-Match] Found ${needsPostMatch.length} fixtures needing post-match (${fixtures.length - needsPostMatch.length} already triggered)`)

  // Group and count by league
  const leagueMap = new Map<string, { league_id: string; league_name: string; finished_count: number; fixture_ids: string[] }>()

  for (const fixture of needsPostMatch) {
    const leagueId = fixture.league_id
    const leagueName = (fixture.league as any)?.name || 'Unknown'

    if (leagueMap.has(leagueId)) {
      leagueMap.get(leagueId)!.finished_count++
      leagueMap.get(leagueId)!.fixture_ids.push(fixture.id)
    } else {
      leagueMap.set(leagueId, {
        league_id: leagueId,
        league_name: leagueName,
        finished_count: 1,
        fixture_ids: [fixture.id]
      })
    }
  }

  return Array.from(leagueMap.values())
}

/**
 * Query fixtures that need post-match analysis (with retry logic)
 *
 * GOAL: Ensure exactly ONE analysis per fixture (manual OR automated).
 * Unlike predictions, analysis only runs once since match data doesn't change.
 *
 * Includes:
 * 1. Fixtures in analysis window (~6h 15min after kickoff) with NO analysis
 * 2. Fixtures that were triggered >7 min ago but automation failed (retry)
 *
 * Excludes:
 * - Fixtures with ANY analysis (manual or automated) - analysis only runs once
 * - Fixtures triggered <7 min ago (still processing)
 * - Fixtures without predictions (analysis requires prediction)
 *
 * Returns sorted by match end time (earliest first), limited to MAX_ANALYSES_PER_RUN
 */
export async function queryAnalysisFixtures(): Promise<FixtureForTrigger[]> {
  const now = new Date()
  const processingBuffer = PROCESSING_CONFIG.PROCESSING_BUFFER_MINUTES * 60 * 1000
  const bufferCutoff = new Date(now.getTime() - processingBuffer)

  // Window boundaries (minutes after match start - match typically ~100 min long)
  const windowStart = new Date(now.getTime() - TIMING_WINDOWS.ANALYSIS.maxAfter * 60 * 1000)
  const windowEnd = new Date(now.getTime() - TIMING_WINDOWS.ANALYSIS.minAfter * 60 * 1000)

  const { data: fixtures, error } = await supabase
    .from('fixtures')
    .select(`
      id, api_id, league_id, match_date, status, home_team_id, away_team_id, round,
      goals_home, goals_away, analysis_triggered_at,
      home_team:teams!fixtures_home_team_id_fkey(id, name),
      away_team:teams!fixtures_away_team_id_fkey(id, name),
      league:leagues!inner(id, name, is_active),
      predictions(id),
      match_analysis(id, source)
    `)
    .eq('status', 'FT')
    .gte('match_date', windowStart.toISOString())
    .lte('match_date', windowEnd.toISOString())
    .eq('league.is_active', true)
    .order('match_date', { ascending: true })

  if (error || !fixtures) {
    console.error('[Query Analysis] Error:', error)
    return []
  }

  // Filter fixtures that need analysis
  const needsAnalysis = fixtures.filter(f => {
    const hasPrediction = f.predictions && Array.isArray(f.predictions) && f.predictions.length > 0
    const analyses = f.match_analysis && Array.isArray(f.match_analysis) ? f.match_analysis : []
    const triggeredAt = f.analysis_triggered_at ? new Date(f.analysis_triggered_at) : null
    const homeName = (f.home_team as any)?.name || 'Unknown'
    const awayName = (f.away_team as any)?.name || 'Unknown'

    // Must have a prediction to generate analysis
    if (!hasPrediction) {
      console.log(`[Query Analysis] SKIP ${homeName} vs ${awayName}: No prediction`)
      return false
    }

    // Check if ANY analysis exists (manual OR automated) - analysis only runs once
    if (analyses.length > 0) {
      const source = analyses[0]?.source || 'unknown'
      console.log(`[Query Analysis] SKIP ${homeName} vs ${awayName}: Analysis already exists (source: ${source})`)
      return false
    }

    // No analysis - check if we should trigger or wait
    if (triggeredAt) {
      // Automation was triggered but hasn't completed yet
      // If triggered recently (within buffer), skip - still processing
      if (triggeredAt > bufferCutoff) {
        const minAgo = Math.round((now.getTime() - triggeredAt.getTime()) / 60000)
        console.log(`[Query Analysis] SKIP ${homeName} vs ${awayName}: Triggered ${minAgo} min ago, still processing (buffer: ${PROCESSING_CONFIG.PROCESSING_BUFFER_MINUTES} min)`)
        return false
      }

      // Triggered >7 min ago but no analysis created - retry needed
      const minAgo = Math.round((now.getTime() - triggeredAt.getTime()) / 60000)
      console.log(`[Query Analysis] INCLUDE ${homeName} vs ${awayName}: Automation failed, retrying after ${minAgo} min`)
      return true
    }

    // Never triggered, no analysis - include
    console.log(`[Query Analysis] INCLUDE ${homeName} vs ${awayName}: No analysis, never triggered`)
    return true
  })

  // Limit to MAX_ANALYSES_PER_RUN
  const limited = needsAnalysis.slice(0, PROCESSING_CONFIG.MAX_ANALYSES_PER_RUN)

  if (limited.length > 0) {
    console.log(`[Query Analysis] Found ${needsAnalysis.length} fixtures needing analysis, processing ${limited.length}`)
  }

  return limited.map(f => ({
    id: f.id,
    api_id: f.api_id,
    league_id: f.league_id,
    match_date: f.match_date,
    status: f.status,
    home_team_id: f.home_team_id,
    away_team_id: f.away_team_id,
    round: f.round,
    goals_home: f.goals_home,
    goals_away: f.goals_away,
    home_team: Array.isArray(f.home_team) ? f.home_team[0] : f.home_team,
    away_team: Array.isArray(f.away_team) ? f.away_team[0] : f.away_team
  }))
}

/**
 * Get automation config from database
 */
export async function getAutomationConfig() {
  const { data, error } = await supabase
    .from('automation_config')
    .select('*')
    .single()

  if (error) {
    console.error('Failed to get automation config:', error)
    return null
  }

  return data
}

/**
 * Update automation config
 */
export async function updateAutomationConfig(updates: Record<string, any>) {
  const { data: existing } = await supabase
    .from('automation_config')
    .select('id')
    .single()

  if (!existing) return null

  const { data, error } = await supabase
    .from('automation_config')
    .update(updates)
    .eq('id', existing.id)
    .select()
    .single()

  if (error) {
    console.error('Failed to update automation config:', error)
    return null
  }

  return data
}

/**
 * Update trigger timestamp for a fixture
 * Called before triggering prediction/analysis/pre-match/post-match to prevent duplicate triggers
 */
export async function updateTriggerTimestamp(
  fixtureId: string,
  type: 'prediction' | 'analysis' | 'pre-match' | 'post-match'
): Promise<void> {
  const columnMap = {
    'prediction': 'prediction_triggered_at',
    'analysis': 'analysis_triggered_at',
    'pre-match': 'pre_match_triggered_at',
    'post-match': 'post_match_triggered_at'
  }
  const column = columnMap[type]

  const { error } = await supabase
    .from('fixtures')
    .update({ [column]: new Date().toISOString() })
    .eq('id', fixtureId)

  if (error) {
    console.error(`[Update Trigger] Failed to update ${column} for fixture ${fixtureId}:`, error)
  }
}

/**
 * Helper to group fixtures by league
 */
function groupByLeague(fixtures: any[]): LeagueWithFixtures[] {
  const leagueMap = new Map<string, LeagueWithFixtures>()

  for (const fixture of fixtures) {
    const leagueId = fixture.league_id
    const league = Array.isArray(fixture.league) ? fixture.league[0] : fixture.league
    const leagueName = league?.name || 'Unknown'

    if (!leagueMap.has(leagueId)) {
      leagueMap.set(leagueId, {
        league_id: leagueId,
        league_name: leagueName,
        fixtures: []
      })
    }

    leagueMap.get(leagueId)!.fixtures.push({
      id: fixture.id,
      api_id: fixture.api_id,
      league_id: fixture.league_id,
      match_date: fixture.match_date,
      status: fixture.status,
      home_team_id: fixture.home_team_id,
      away_team_id: fixture.away_team_id,
      home_team: Array.isArray(fixture.home_team) ? fixture.home_team[0] : fixture.home_team,
      away_team: Array.isArray(fixture.away_team) ? fixture.away_team[0] : fixture.away_team,
      venue: Array.isArray(fixture.venue) ? fixture.venue[0] : fixture.venue,
      round: fixture.round
    })
  }

  return Array.from(leagueMap.values())
}
