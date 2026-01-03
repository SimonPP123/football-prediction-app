import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  fetchAllFixtures,
  fetchFixturesInRange,
  fetchFixturesNext,
  fetchFixturesLast,
  fetchLiveFixturesByLeague,
  fetchFixturesByDate,
  fetchFixturesByIds,
} from '@/lib/api-football'
import { getLeagueFromRequest } from '@/lib/league-context'
import { createSSEStream, wantsStreaming } from '@/lib/utils/streaming'
import { getFixtureWindows, DATE_WINDOWS } from '@/lib/api/fixture-windows'
import { isAdminWithSessionValidation } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Refresh modes - extended with new modes
type RefreshMode = 'smart' | 'full' | 'upcoming' | 'recent' | 'next' | 'last' | 'live' | 'date' | 'ids'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface LogEntry {
  type: 'info' | 'success' | 'error' | 'warning'
  message: string
}

interface LeagueConfig {
  id: string
  apiId: number
  name: string
  currentSeason: number
}

/**
 * Parse refresh mode from URL query params
 * @param request - The incoming request
 * @returns The refresh mode (defaults to 'smart')
 */
function getRefreshMode(request: Request): RefreshMode {
  const url = new URL(request.url)
  const mode = url.searchParams.get('mode')
  const validModes = ['smart', 'full', 'upcoming', 'recent', 'next', 'last', 'live', 'date', 'ids']
  if (mode && validModes.includes(mode)) {
    return mode as RefreshMode
  }
  return 'smart' // Default to smart mode
}

/**
 * Parse additional parameters for new modes
 */
function getModeParams(request: Request): { count?: number; date?: string; ids?: number[] } {
  const url = new URL(request.url)
  const params: { count?: number; date?: string; ids?: number[] } = {}

  const count = url.searchParams.get('count')
  if (count) {
    params.count = Math.min(99, Math.max(1, parseInt(count, 10) || 10))
  }

  const date = url.searchParams.get('date')
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    params.date = date
  }

  const ids = url.searchParams.get('ids')
  if (ids) {
    params.ids = ids.split('-').map(id => parseInt(id, 10)).filter(id => !isNaN(id))
  }

  return params
}

/**
 * Fetch fixtures based on the refresh mode
 */
async function fetchFixturesByMode(
  mode: RefreshMode,
  league: LeagueConfig,
  params: { count?: number; date?: string; ids?: number[] } = {}
): Promise<{ response: any[]; mode: string; dateRange?: { from: string; to: string }; count?: number }> {
  const windows = getFixtureWindows()

  switch (mode) {
    case 'full':
      // Fetch ALL fixtures for the season (380 for PL)
      const allData = await fetchAllFixtures(league.apiId, league.currentSeason)
      return { response: allData.response || [], mode: 'full' }

    case 'upcoming':
      // Only future fixtures (next 7 days)
      const upcomingData = await fetchFixturesInRange(
        league.apiId,
        league.currentSeason,
        windows.now,
        windows.upcomingEnd
      )
      return {
        response: upcomingData.response || [],
        mode: 'upcoming',
        dateRange: {
          from: windows.now.toISOString().split('T')[0],
          to: windows.upcomingEnd.toISOString().split('T')[0]
        }
      }

    case 'recent':
      // Only recent fixtures (past 3 days)
      const recentData = await fetchFixturesInRange(
        league.apiId,
        league.currentSeason,
        windows.recent,
        windows.now
      )
      return {
        response: recentData.response || [],
        mode: 'recent',
        dateRange: {
          from: windows.recent.toISOString().split('T')[0],
          to: windows.now.toISOString().split('T')[0]
        }
      }

    // NEW MODES
    case 'next':
      // Fetch next X upcoming fixtures
      const count = params.count || 10
      const nextData = await fetchFixturesNext(count, league.apiId, league.currentSeason)
      return { response: nextData.response || [], mode: 'next', count }

    case 'last':
      // Fetch last X completed fixtures
      const lastCount = params.count || 10
      const lastData = await fetchFixturesLast(lastCount, league.apiId, league.currentSeason)
      return { response: lastData.response || [], mode: 'last', count: lastCount }

    case 'live':
      // Fetch currently live fixtures for this league
      const liveData = await fetchLiveFixturesByLeague(league.apiId)
      return { response: liveData.response || [], mode: 'live' }

    case 'date':
      // Fetch fixtures for a specific date
      const date = params.date || new Date().toISOString().split('T')[0]
      const dateData = await fetchFixturesByDate(date, league.apiId, league.currentSeason)
      return {
        response: dateData.response || [],
        mode: 'date',
        dateRange: { from: date, to: date }
      }

    case 'ids':
      // Fetch specific fixtures by ID (includes full details)
      if (!params.ids || params.ids.length === 0) {
        return { response: [], mode: 'ids' }
      }
      const idsData = await fetchFixturesByIds(params.ids)
      return { response: idsData.response || [], mode: 'ids', count: params.ids.length }

    case 'smart':
    default:
      // Smart: past X days + next Y days (10-day window typically)
      const smartData = await fetchFixturesInRange(
        league.apiId,
        league.currentSeason,
        windows.recent,
        windows.upcomingEnd
      )
      return {
        response: smartData.response || [],
        mode: 'smart',
        dateRange: {
          from: windows.recent.toISOString().split('T')[0],
          to: windows.upcomingEnd.toISOString().split('T')[0]
        }
      }
  }
}

export async function POST(request: Request) {
  if (!(await isAdminWithSessionValidation())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Get league from request (defaults to Premier League)
  const league = await getLeagueFromRequest(request)
  const mode = getRefreshMode(request)
  const params = getModeParams(request)

  if (wantsStreaming(request)) {
    return handleStreamingRefresh(league, mode, params)
  }
  return handleBatchRefresh(league, mode, params)
}

async function handleStreamingRefresh(
  league: LeagueConfig,
  mode: RefreshMode,
  params: { count?: number; date?: string; ids?: number[] } = {}
) {
  const { stream, sendLog, close, closeWithError, headers } = createSSEStream()
  const startTime = Date.now()

  ;(async () => {
    try {
      const modeLabel = mode === 'full' ? 'all' : mode
      sendLog({ type: 'info', message: `Fetching ${modeLabel} fixtures for ${league.name}...` })

      const data = await fetchFixturesByMode(mode, league, params)

      if (!data.response || data.response.length === 0) {
        const msg = mode === 'smart'
          ? `No fixtures in date range (${data.dateRange?.from} to ${data.dateRange?.to})`
          : 'No fixtures returned from API'
        sendLog({ type: 'warning', message: msg })
        close({ success: true, inserted: 0, updated: 0, errors: 0, total: 0, duration: Date.now() - startTime, league: league.name, mode })
        return
      }

      const rangeInfo = data.dateRange ? ` (${data.dateRange.from} to ${data.dateRange.to})` : ''
      sendLog({ type: 'info', message: `Received ${data.response.length} fixtures${rangeInfo}` })

      // Get teams for this league
      const { data: teams } = await supabase
        .from('teams')
        .select('id, api_id')
        .eq('league_id', league.id)
      const teamMap = new Map(teams?.map(t => [t.api_id, t.id]) || [])
      sendLog({ type: 'info', message: `Loaded ${teams?.length || 0} teams for mapping` })

      const { data: venues } = await supabase.from('venues').select('id, api_id')
      const venueMap = new Map(venues?.map(v => [v.api_id, v.id]) || [])

      const total = data.response.length

      sendLog({ type: 'info', message: 'Processing fixtures...' })

      // Get existing fixture api_ids for this league (single query instead of N queries)
      const apiIds = data.response.map((item: any) => item.fixture.id)
      const { data: existingFixtures } = await supabase
        .from('fixtures')
        .select('api_id')
        .eq('league_id', league.id)
        .in('api_id', apiIds)
      const existingApiIds = new Set(existingFixtures?.map(f => f.api_id) || [])

      // Collect all fixtures for batch upsert
      const fixturesToUpsert: any[] = []
      let skipped = 0

      for (let i = 0; i < data.response.length; i++) {
        const item = data.response[i]
        const fixture = item.fixture
        const leagueInfo = item.league
        const teams_data = item.teams
        const goals = item.goals
        const score = item.score

        // Send progress every 50 fixtures
        if (i % 50 === 0 && i > 0) {
          sendLog({
            type: 'progress',
            message: `Preparing fixtures...`,
            details: { progress: { current: i, total } }
          })
        }

        const homeTeamId = teamMap.get(teams_data.home.id)
        const awayTeamId = teamMap.get(teams_data.away.id)

        if (!homeTeamId || !awayTeamId) {
          skipped++
          continue
        }

        fixturesToUpsert.push({
          api_id: fixture.id,
          league_id: league.id,
          season: league.currentSeason,
          round: leagueInfo.round,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          match_date: fixture.date,
          venue_id: venueMap.get(fixture.venue?.id) || null,
          referee: fixture.referee,
          status: fixture.status.short,
          goals_home: goals.home,
          goals_away: goals.away,
          score_halftime: score.halftime,
          score_fulltime: score.fulltime,
          updated_at: new Date().toISOString(),
        })
      }

      // Batch upsert all fixtures at once
      let inserted = 0
      let updated = 0
      let errors = 0

      if (fixturesToUpsert.length > 0) {
        sendLog({ type: 'info', message: `Batch upserting ${fixturesToUpsert.length} fixtures...` })
        const { error } = await supabase
          .from('fixtures')
          .upsert(fixturesToUpsert, { onConflict: 'api_id,league_id' })

        if (error) {
          sendLog({ type: 'error', message: `Batch upsert error: ${error.message}` })
          errors = fixturesToUpsert.length
        } else {
          // Count inserted vs updated based on existing set
          for (const f of fixturesToUpsert) {
            if (existingApiIds.has(f.api_id)) {
              updated++
            } else {
              inserted++
            }
          }
        }
      }
      errors += skipped

      const duration = Date.now() - startTime
      sendLog({ type: 'success', message: `Completed: ${inserted} new, ${updated} updated, ${errors} errors (${(duration / 1000).toFixed(1)}s)` })
      close({ success: true, inserted, updated, errors, total, duration, league: league.name, mode })
    } catch (error) {
      const duration = Date.now() - startTime
      sendLog({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' })
      closeWithError(error instanceof Error ? error.message : 'Unknown error', duration)
    }
  })()

  return new Response(stream, { headers })
}

async function handleBatchRefresh(
  league: LeagueConfig,
  mode: RefreshMode,
  params: { count?: number; date?: string; ids?: number[] } = {}
) {
  const logs: LogEntry[] = []
  const addLog = (type: LogEntry['type'], message: string) => {
    logs.push({ type, message })
    console.log(`[Refresh Fixtures - ${league.name}] ${message}`)
  }

  try {
    const modeLabel = mode === 'full' ? 'all' : mode
    addLog('info', `Fetching ${modeLabel} fixtures for ${league.name}...`)

    // Fetch fixtures based on mode
    const data = await fetchFixturesByMode(mode, league, params)

    if (!data.response || data.response.length === 0) {
      const msg = mode === 'smart'
        ? `No fixtures in date range (${data.dateRange?.from} to ${data.dateRange?.to})`
        : 'No fixtures returned from API'
      addLog('warning', msg)
      return NextResponse.json({
        success: true,
        inserted: 0,
        updated: 0,
        errors: 0,
        total: 0,
        logs,
        league: league.name,
        mode,
        dateRange: data.dateRange,
      })
    }

    const rangeInfo = data.dateRange ? ` (${data.dateRange.from} to ${data.dateRange.to})` : ''
    addLog('info', `Received ${data.response.length} fixtures${rangeInfo}`)

    // Build team lookup for this league
    const { data: teams } = await supabase
      .from('teams')
      .select('id, api_id')
      .eq('league_id', league.id)
    const teamMap = new Map(teams?.map(t => [t.api_id, t.id]) || [])
    addLog('info', `Loaded ${teams?.length || 0} teams for mapping`)

    // Build venue lookup
    const { data: venues } = await supabase.from('venues').select('id, api_id')
    const venueMap = new Map(venues?.map(v => [v.api_id, v.id]) || [])

    addLog('info', 'Processing fixtures...')

    // Get existing fixture api_ids for this league (single query instead of N queries)
    const apiIds = data.response.map((item: any) => item.fixture.id)
    const { data: existingFixtures } = await supabase
      .from('fixtures')
      .select('api_id')
      .eq('league_id', league.id)
      .in('api_id', apiIds)
    const existingApiIds = new Set(existingFixtures?.map(f => f.api_id) || [])

    // Collect all fixtures for batch upsert
    const fixturesToUpsert: any[] = []
    let skipped = 0

    for (const item of data.response) {
      const fixture = item.fixture
      const leagueInfo = item.league
      const teams_data = item.teams
      const goals = item.goals
      const score = item.score

      const homeTeamId = teamMap.get(teams_data.home.id)
      const awayTeamId = teamMap.get(teams_data.away.id)

      if (!homeTeamId || !awayTeamId) {
        skipped++
        continue
      }

      fixturesToUpsert.push({
        api_id: fixture.id,
        league_id: league.id,
        season: league.currentSeason,
        round: leagueInfo.round,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        match_date: fixture.date,
        venue_id: venueMap.get(fixture.venue?.id) || null,
        referee: fixture.referee,
        status: fixture.status.short,
        goals_home: goals.home,
        goals_away: goals.away,
        score_halftime: score.halftime,
        score_fulltime: score.fulltime,
        updated_at: new Date().toISOString(),
      })
    }

    // Batch upsert all fixtures at once
    let inserted = 0
    let updated = 0
    let errors = 0

    if (fixturesToUpsert.length > 0) {
      addLog('info', `Batch upserting ${fixturesToUpsert.length} fixtures...`)
      const { error } = await supabase
        .from('fixtures')
        .upsert(fixturesToUpsert, { onConflict: 'api_id,league_id' })

      if (error) {
        addLog('error', `Batch upsert error: ${error.message}`)
        errors = fixturesToUpsert.length
      } else {
        // Count inserted vs updated based on existing set
        for (const f of fixturesToUpsert) {
          if (existingApiIds.has(f.api_id)) {
            updated++
          } else {
            inserted++
          }
        }
      }
    }
    errors += skipped

    addLog('success', `Completed: ${inserted} new, ${updated} updated, ${errors} errors`)

    return NextResponse.json({
      success: true,
      inserted,
      updated,
      errors,
      total: data.response.length,
      logs,
      league: league.name,
      mode,
      dateRange: data.dateRange,
    })
  } catch (error) {
    addLog('error', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      logs,
      league: league.name,
      mode,
    }, { status: 500 })
  }
}
