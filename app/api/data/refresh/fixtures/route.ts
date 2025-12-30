import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchAllFixtures } from '@/lib/api-football'
import { getLeagueFromRequest } from '@/lib/league-context'
import { createSSEStream, wantsStreaming } from '@/lib/utils/streaming'

export const dynamic = 'force-dynamic'

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

export async function POST(request: Request) {
  // Get league from request (defaults to Premier League)
  const league = await getLeagueFromRequest(request)

  if (wantsStreaming(request)) {
    return handleStreamingRefresh(league)
  }
  return handleBatchRefresh(league)
}

async function handleStreamingRefresh(league: LeagueConfig) {
  const { stream, sendLog, close, closeWithError, headers } = createSSEStream()
  const startTime = Date.now()

  ;(async () => {
    try {
      sendLog({ type: 'info', message: `Fetching fixtures for ${league.name} from API-Football...` })

      const data = await fetchAllFixtures(league.apiId, league.currentSeason)

      if (!data.response || data.response.length === 0) {
        sendLog({ type: 'error', message: 'No fixtures returned from API' })
        closeWithError('No fixtures returned from API', Date.now() - startTime)
        return
      }

      sendLog({ type: 'info', message: `Received ${data.response.length} fixtures from API` })

      // Get teams for this league
      const { data: teams } = await supabase
        .from('teams')
        .select('id, api_id')
        .eq('league_id', league.id)
      const teamMap = new Map(teams?.map(t => [t.api_id, t.id]) || [])
      sendLog({ type: 'info', message: `Loaded ${teams?.length || 0} teams for mapping` })

      const { data: venues } = await supabase.from('venues').select('id, api_id')
      const venueMap = new Map(venues?.map(v => [v.api_id, v.id]) || [])

      let inserted = 0
      let updated = 0
      let errors = 0
      const total = data.response.length

      sendLog({ type: 'info', message: 'Processing fixtures...' })

      for (let i = 0; i < data.response.length; i++) {
        const item = data.response[i]
        const fixture = item.fixture
        const leagueInfo = item.league
        const teams_data = item.teams
        const goals = item.goals
        const score = item.score

        // Send progress every 20 fixtures to avoid too many updates
        if (i % 20 === 0) {
          sendLog({
            type: 'progress',
            message: `Processing fixtures...`,
            details: { progress: { current: i + 1, total } }
          })
        }

        const homeTeamId = teamMap.get(teams_data.home.id)
        const awayTeamId = teamMap.get(teams_data.away.id)

        if (!homeTeamId || !awayTeamId) {
          errors++
          continue
        }

        // Check if record exists for this league
        const { data: existing } = await supabase
          .from('fixtures')
          .select('id')
          .eq('api_id', fixture.id)
          .eq('league_id', league.id)
          .single()

        const { error } = await supabase
          .from('fixtures')
          .upsert({
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
          }, { onConflict: 'api_id,league_id' })

        if (error) {
          errors++
        } else if (existing) {
          updated++
        } else {
          inserted++
        }
      }

      const duration = Date.now() - startTime
      sendLog({ type: 'success', message: `Completed: ${inserted} new, ${updated} updated, ${errors} errors (${(duration / 1000).toFixed(1)}s)` })
      close({ success: true, inserted, updated, errors, total, duration, league: league.name })
    } catch (error) {
      const duration = Date.now() - startTime
      sendLog({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' })
      closeWithError(error instanceof Error ? error.message : 'Unknown error', duration)
    }
  })()

  return new Response(stream, { headers })
}

async function handleBatchRefresh(league: LeagueConfig) {
  const logs: LogEntry[] = []
  const addLog = (type: LogEntry['type'], message: string) => {
    logs.push({ type, message })
    console.log(`[Refresh Fixtures - ${league.name}] ${message}`)
  }

  try {
    addLog('info', `Fetching fixtures for ${league.name} from API-Football...`)

    // Fetch all fixtures from API-Football for this league
    const data = await fetchAllFixtures(league.apiId, league.currentSeason)

    if (!data.response || data.response.length === 0) {
      addLog('error', 'No fixtures returned from API')
      return NextResponse.json({
        success: false,
        error: 'No fixtures returned from API',
        logs,
        league: league.name,
      }, { status: 400 })
    }

    addLog('info', `Received ${data.response.length} fixtures from API`)

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

    let inserted = 0
    let updated = 0
    let errors = 0

    addLog('info', 'Processing fixtures...')

    for (const item of data.response) {
      const fixture = item.fixture
      const leagueInfo = item.league
      const teams_data = item.teams
      const goals = item.goals
      const score = item.score

      const homeTeamId = teamMap.get(teams_data.home.id)
      const awayTeamId = teamMap.get(teams_data.away.id)

      if (!homeTeamId || !awayTeamId) {
        errors++
        continue
      }

      // Check if record exists
      const { data: existing } = await supabase
        .from('fixtures')
        .select('id')
        .eq('api_id', fixture.id)
        .eq('league_id', league.id)
        .single()

      const { error } = await supabase
        .from('fixtures')
        .upsert({
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
        }, { onConflict: 'api_id,league_id' })

      if (error) {
        errors++
      } else if (existing) {
        updated++
      } else {
        inserted++
      }
    }

    addLog('success', `Completed: ${inserted} new, ${updated} updated, ${errors} errors`)

    return NextResponse.json({
      success: true,
      inserted,
      updated,
      errors,
      total: data.response.length,
      logs,
      league: league.name,
    })
  } catch (error) {
    addLog('error', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      logs,
      league: league.name,
    }, { status: 500 })
  }
}
