import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  fetchInjuries,
  fetchInjuriesByFixtures,
  fetchInjuriesByFixture,
  fetchInjuriesByDate,
} from '@/lib/api-football'
import { getLeagueFromRequest } from '@/lib/league-context'
import { createSSEStream, wantsStreaming } from '@/lib/utils/streaming'
import { isAdminWithSessionValidation } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Refresh modes
type InjuryRefreshMode = 'all' | 'upcoming' | 'fixture' | 'fixtures' | 'date'

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

interface InjuryModeParams {
  mode: InjuryRefreshMode
  fixtureId?: number
  fixtureIds?: number[]
  date?: string
}

/**
 * Parse injury refresh mode and parameters from request
 */
function getInjuryModeParams(request: Request): InjuryModeParams {
  const url = new URL(request.url)
  const mode = url.searchParams.get('mode') as InjuryRefreshMode || 'all'
  const params: InjuryModeParams = { mode }

  // Parse fixture_id for single fixture mode
  const fixtureId = url.searchParams.get('fixture_id')
  if (fixtureId) {
    params.fixtureId = parseInt(fixtureId, 10)
  }

  // Parse fixture_ids for multiple fixtures
  const fixtureIds = url.searchParams.get('fixture_ids')
  if (fixtureIds) {
    params.fixtureIds = fixtureIds.split('-').map(id => parseInt(id, 10)).filter(id => !isNaN(id))
  }

  // Parse date
  const date = url.searchParams.get('date')
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    params.date = date
  }

  return params
}

export async function POST(request: Request) {
  if (!(await isAdminWithSessionValidation())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Get league from request (defaults to Premier League)
  const league = await getLeagueFromRequest(request)
  const modeParams = getInjuryModeParams(request)

  if (wantsStreaming(request)) {
    return handleStreamingRefresh(league, modeParams)
  }
  return handleBatchRefresh(league, modeParams)
}

async function handleStreamingRefresh(league: LeagueConfig, modeParams: InjuryModeParams) {
  const { stream, sendLog, close, closeWithError, headers } = createSSEStream()
  const startTime = Date.now()

  ;(async () => {
    try {
      const modeLabel = modeParams.mode === 'upcoming' ? 'upcoming fixtures' : modeParams.mode
      sendLog({ type: 'info', message: `Fetching injuries (${modeLabel}) for ${league.name} from API-Football...` })

      const data = await fetchInjuriesByMode(league, modeParams)

      if (!data.response || data.response.length === 0) {
        const msg = modeParams.mode === 'upcoming'
          ? `No injuries found for ${data.fixtureCount || 0} upcoming fixtures`
          : 'No injuries data returned from API'
        sendLog({ type: 'info', message: msg })
        close({ success: true, imported: 0, errors: 0, total: 0, duration: Date.now() - startTime, league: league.name, mode: modeParams.mode })
        return
      }

      sendLog({ type: 'info', message: `Received ${data.response.length} injury records from API` })

      // Get teams for this league
      const { data: teams } = await supabase
        .from('teams')
        .select('id, api_id')
        .eq('league_id', league.id)
      const teamMap = new Map(teams?.map(t => [t.api_id, t.id]) || [])
      sendLog({ type: 'info', message: `Loaded ${teams?.length || 0} teams for mapping` })

      const { data: players } = await supabase.from('players').select('id, api_id')
      const playerMap = new Map(players?.map(p => [p.api_id, p.id]) || [])
      sendLog({ type: 'info', message: `Loaded ${players?.length || 0} players for mapping` })

      sendLog({ type: 'info', message: 'Processing injury records...' })

      // Collect all injuries for batch upsert
      const injuriesToUpsert: any[] = []
      let skipped = 0

      for (const item of data.response) {
        const teamId = teamMap.get(item.team.id)
        if (!teamId) {
          skipped++
          continue
        }

        const playerId = playerMap.get(item.player.id)

        injuriesToUpsert.push({
          player_id: playerId || null,
          player_api_id: item.player.id,
          player_name: item.player.name,
          team_id: teamId,
          league_id: league.id,
          fixture_api_id: item.fixture?.id || null,
          injury_type: item.player.type || null,
          injury_reason: item.player.reason || null,
          reported_date: item.fixture?.date ? new Date(item.fixture.date).toISOString().split('T')[0] : null,
          updated_at: new Date().toISOString(),
        })
      }

      // Batch upsert all injuries at once
      let imported = 0
      let errors = 0

      if (injuriesToUpsert.length > 0) {
        sendLog({ type: 'info', message: `Batch upserting ${injuriesToUpsert.length} injuries...` })
        const { error } = await supabase
          .from('injuries')
          .upsert(injuriesToUpsert, { onConflict: 'player_api_id,fixture_api_id' })

        if (error) {
          sendLog({ type: 'error', message: `Batch upsert error: ${error.message}` })
          errors = injuriesToUpsert.length
        } else {
          imported = injuriesToUpsert.length
        }
      }

      if (skipped > 0) {
        sendLog({ type: 'info', message: `Skipped ${skipped} injuries (teams not in database)` })
      }

      const duration = Date.now() - startTime
      sendLog({ type: 'success', message: `Completed: ${imported} imported, ${errors} errors (${(duration / 1000).toFixed(1)}s)` })
      close({ success: true, imported, errors, total: data.response.length, duration, league: league.name, mode: modeParams.mode })
    } catch (error) {
      const duration = Date.now() - startTime
      sendLog({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' })
      closeWithError(error instanceof Error ? error.message : 'Unknown error', duration)
    }
  })()

  return new Response(stream, { headers })
}

/**
 * Fetch injuries based on mode
 */
async function fetchInjuriesByMode(
  league: LeagueConfig,
  modeParams: InjuryModeParams
): Promise<{ response: any[]; mode: string; fixtureCount?: number }> {
  const { mode, fixtureId, fixtureIds, date } = modeParams

  switch (mode) {
    case 'upcoming':
      // Fetch upcoming fixture IDs from database, then get injuries for those fixtures
      const now = new Date()
      const { data: upcomingFixtures } = await supabase
        .from('fixtures')
        .select('api_id')
        .eq('league_id', league.id)
        .in('status', ['NS', 'TBD'])
        .gte('match_date', now.toISOString())
        .order('match_date', { ascending: true })
        .limit(20) // API-Football max is 20 IDs per request

      if (!upcomingFixtures || upcomingFixtures.length === 0) {
        return { response: [], mode: 'upcoming', fixtureCount: 0 }
      }

      const upcomingIds = upcomingFixtures.map(f => f.api_id)
      const upcomingData = await fetchInjuriesByFixtures(upcomingIds)
      return {
        response: upcomingData.response || [],
        mode: 'upcoming',
        fixtureCount: upcomingIds.length
      }

    case 'fixture':
      // Fetch injuries for a single fixture
      if (!fixtureId) {
        return { response: [], mode: 'fixture' }
      }
      const fixtureData = await fetchInjuriesByFixture(fixtureId)
      return { response: fixtureData.response || [], mode: 'fixture' }

    case 'fixtures':
      // Fetch injuries for multiple specific fixtures
      if (!fixtureIds || fixtureIds.length === 0) {
        return { response: [], mode: 'fixtures' }
      }
      const fixturesData = await fetchInjuriesByFixtures(fixtureIds)
      return {
        response: fixturesData.response || [],
        mode: 'fixtures',
        fixtureCount: fixtureIds.length
      }

    case 'date':
      // Fetch injuries for a specific date
      const targetDate = date || new Date().toISOString().split('T')[0]
      const dateData = await fetchInjuriesByDate(targetDate)
      return { response: dateData.response || [], mode: 'date' }

    case 'all':
    default:
      // Fetch all injuries for the league/season
      const allData = await fetchInjuries(league.apiId, league.currentSeason)
      return { response: allData.response || [], mode: 'all' }
  }
}

async function handleBatchRefresh(league: LeagueConfig, modeParams: InjuryModeParams) {
  const logs: LogEntry[] = []
  const addLog = (type: LogEntry['type'], message: string) => {
    logs.push({ type, message })
    console.log(`[Refresh Injuries - ${league.name}] ${message}`)
  }

  try {
    const modeLabel = modeParams.mode === 'upcoming' ? 'upcoming fixtures' : modeParams.mode
    addLog('info', `Fetching injuries (${modeLabel}) for ${league.name} from API-Football...`)

    // Fetch injuries based on mode
    const data = await fetchInjuriesByMode(league, modeParams)

    if (!data.response || data.response.length === 0) {
      const msg = modeParams.mode === 'upcoming'
        ? `No injuries found for ${data.fixtureCount || 0} upcoming fixtures`
        : 'No injuries data returned from API'
      addLog('info', msg)
      return NextResponse.json({
        success: true,
        imported: 0,
        errors: 0,
        skipped: 0,
        total: 0,
        logs,
        league: league.name,
        mode: modeParams.mode,
        fixtureCount: data.fixtureCount,
      })
    }

    addLog('info', `Received ${data.response.length} injury records from API`)

    // Build team lookup for this league
    const { data: teams } = await supabase
      .from('teams')
      .select('id, api_id')
      .eq('league_id', league.id)
    const teamMap = new Map(teams?.map(t => [t.api_id, t.id]) || [])
    addLog('info', `Loaded ${teams?.length || 0} teams for mapping`)

    // Build player lookup
    const { data: players } = await supabase.from('players').select('id, api_id')
    const playerMap = new Map(players?.map(p => [p.api_id, p.id]) || [])
    addLog('info', `Loaded ${players?.length || 0} players for mapping`)

    addLog('info', 'Processing injury records...')

    // Collect all injuries for batch upsert
    const injuriesToUpsert: any[] = []
    let skipped = 0

    for (const item of data.response) {
      const teamId = teamMap.get(item.team.id)
      if (!teamId) {
        // Skip injuries for teams not in our database
        skipped++
        continue
      }

      const playerId = playerMap.get(item.player.id)

      injuriesToUpsert.push({
        player_id: playerId || null,
        player_api_id: item.player.id,
        player_name: item.player.name,
        team_id: teamId,
        league_id: league.id,
        fixture_api_id: item.fixture?.id || null,
        injury_type: item.player.type || null,
        injury_reason: item.player.reason || null,
        reported_date: item.fixture?.date ? new Date(item.fixture.date).toISOString().split('T')[0] : null,
        updated_at: new Date().toISOString(),
      })
    }

    // Batch upsert all injuries at once
    let imported = 0
    let errors = 0

    if (injuriesToUpsert.length > 0) {
      addLog('info', `Batch upserting ${injuriesToUpsert.length} injuries...`)
      const { error } = await supabase
        .from('injuries')
        .upsert(injuriesToUpsert, { onConflict: 'player_api_id,fixture_api_id' })

      if (error) {
        addLog('error', `Batch upsert error: ${error.message}`)
        errors = injuriesToUpsert.length
      } else {
        imported = injuriesToUpsert.length
      }
    }

    if (skipped > 0) {
      addLog('info', `Skipped ${skipped} injuries (teams not in database)`)
    }

    addLog('success', `Completed: ${imported} imported, ${errors} errors`)

    return NextResponse.json({
      success: true,
      imported,
      errors,
      skipped,
      total: data.response.length,
      logs,
      league: league.name,
      mode: modeParams.mode,
      fixtureCount: data.fixtureCount,
    })
  } catch (error) {
    addLog('error', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      logs,
      league: league.name,
      mode: modeParams.mode,
    }, { status: 500 })
  }
}
