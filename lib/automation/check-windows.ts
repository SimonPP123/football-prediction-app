import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Timing windows configuration (in minutes unless noted)
export const TIMING_WINDOWS = {
  PRE_MATCH: { minBefore: 25, maxBefore: 35 },    // 30 min ± 5 min before kickoff
  PREDICTION: { minBefore: 20, maxBefore: 30 },   // 25 min ± 5 min before kickoff
  LIVE: { statuses: ['1H', '2H', 'HT', 'ET', 'BT', 'P'] },
  POST_MATCH: { minAfter: 230, maxAfter: 250 },   // 4h ± 10 min after FT (in minutes)
  ANALYSIS: { minAfter: 245, maxAfter: 265 }      // 4h15m ± 10 min after FT (in minutes)
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
 * Query fixtures that are 25-35 minutes before kickoff (pre-match window)
 */
export async function queryPreMatchFixtures(): Promise<LeagueWithFixtures[]> {
  const now = new Date()
  const minAhead = new Date(now.getTime() + TIMING_WINDOWS.PRE_MATCH.minBefore * 60 * 1000)
  const maxAhead = new Date(now.getTime() + TIMING_WINDOWS.PRE_MATCH.maxBefore * 60 * 1000)

  const { data: fixtures, error } = await supabase
    .from('fixtures')
    .select(`
      id, api_id, league_id, match_date, status, home_team_id, away_team_id, round,
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

  // Group by league
  return groupByLeague(fixtures)
}

/**
 * Query fixtures that are 20-30 minutes before kickoff AND don't have predictions yet
 */
export async function queryPredictionFixtures(): Promise<FixtureForTrigger[]> {
  const now = new Date()
  const minAhead = new Date(now.getTime() + TIMING_WINDOWS.PREDICTION.minBefore * 60 * 1000)
  const maxAhead = new Date(now.getTime() + TIMING_WINDOWS.PREDICTION.maxBefore * 60 * 1000)

  const { data: fixtures, error } = await supabase
    .from('fixtures')
    .select(`
      id, api_id, league_id, match_date, status, home_team_id, away_team_id, round,
      home_team:teams!fixtures_home_team_id_fkey(id, name),
      away_team:teams!fixtures_away_team_id_fkey(id, name),
      venue:venues(name),
      league:leagues!inner(id, name, is_active),
      predictions(id)
    `)
    .eq('status', 'NS')
    .gte('match_date', minAhead.toISOString())
    .lte('match_date', maxAhead.toISOString())
    .eq('league.is_active', true)

  if (error || !fixtures) return []

  // Filter out fixtures that already have predictions and transform to correct shape
  return fixtures
    .filter(f => !f.predictions || f.predictions.length === 0)
    .map(f => ({
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
 * Query leagues that have finished matches 4 hours ago (post-match window)
 */
export async function queryPostMatchLeagues(): Promise<{ league_id: string; league_name: string; finished_count: number }[]> {
  const now = new Date()
  const minAgo = new Date(now.getTime() - TIMING_WINDOWS.POST_MATCH.maxAfter * 60 * 1000)
  const maxAgo = new Date(now.getTime() - TIMING_WINDOWS.POST_MATCH.minAfter * 60 * 1000)

  const { data: fixtures, error } = await supabase
    .from('fixtures')
    .select(`
      id, league_id,
      league:leagues!inner(id, name, is_active)
    `)
    .eq('status', 'FT')
    .gte('match_date', minAgo.toISOString())
    .lte('match_date', maxAgo.toISOString())
    .eq('league.is_active', true)

  if (error || !fixtures) return []

  // Group and count by league
  const leagueMap = new Map<string, { league_id: string; league_name: string; finished_count: number }>()

  for (const fixture of fixtures) {
    const leagueId = fixture.league_id
    const leagueName = (fixture.league as any)?.name || 'Unknown'

    if (leagueMap.has(leagueId)) {
      leagueMap.get(leagueId)!.finished_count++
    } else {
      leagueMap.set(leagueId, {
        league_id: leagueId,
        league_name: leagueName,
        finished_count: 1
      })
    }
  }

  return Array.from(leagueMap.values())
}

/**
 * Query fixtures that finished 4h15m ago AND have predictions but no analysis yet
 */
export async function queryAnalysisFixtures(): Promise<FixtureForTrigger[]> {
  const now = new Date()
  const minAgo = new Date(now.getTime() - TIMING_WINDOWS.ANALYSIS.maxAfter * 60 * 1000)
  const maxAgo = new Date(now.getTime() - TIMING_WINDOWS.ANALYSIS.minAfter * 60 * 1000)

  const { data: fixtures, error } = await supabase
    .from('fixtures')
    .select(`
      id, api_id, league_id, match_date, status, home_team_id, away_team_id, round,
      goals_home, goals_away,
      home_team:teams!fixtures_home_team_id_fkey(id, name),
      away_team:teams!fixtures_away_team_id_fkey(id, name),
      league:leagues!inner(id, name, is_active),
      predictions(id),
      match_analysis(id)
    `)
    .eq('status', 'FT')
    .gte('match_date', minAgo.toISOString())
    .lte('match_date', maxAgo.toISOString())
    .eq('league.is_active', true)

  if (error || !fixtures) return []

  // Filter: has prediction but no analysis, and transform to correct shape
  return fixtures
    .filter(f => {
      const hasPrediction = f.predictions && f.predictions.length > 0
      const hasAnalysis = f.match_analysis && f.match_analysis.length > 0
      return hasPrediction && !hasAnalysis
    })
    .map(f => ({
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
