import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchStandings } from '@/lib/api-football'
import { getLeagueFromRequest } from '@/lib/league-context'
import { createSSEStream, wantsStreaming } from '@/lib/utils/streaming'
import { isAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface LogEntry {
  type: 'info' | 'success' | 'error' | 'warning'
  message: string
}

export async function POST(request: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Get league from request (defaults to Premier League)
  const league = await getLeagueFromRequest(request)

  if (wantsStreaming(request)) {
    return handleStreamingRefresh(league)
  }
  return handleBatchRefresh(league)
}

interface LeagueConfig {
  id: string
  apiId: number
  name: string
  currentSeason: number
}

async function handleStreamingRefresh(league: LeagueConfig) {
  const { stream, sendLog, close, closeWithError, headers } = createSSEStream()
  const startTime = Date.now()

  ;(async () => {
    try {
      sendLog({ type: 'info', message: `Fetching standings for ${league.name} from API-Football...` })

      const data = await fetchStandings(league.apiId, league.currentSeason)

      if (!data.response || data.response.length === 0) {
        sendLog({ type: 'error', message: 'No standings returned from API' })
        closeWithError('No standings returned from API', Date.now() - startTime)
        return
      }

      sendLog({ type: 'info', message: 'Received standings data from API' })

      // Get teams for this league
      const { data: teams } = await supabase
        .from('teams')
        .select('id, api_id')
        .eq('league_id', league.id)
      const teamMap = new Map(teams?.map(t => [t.api_id, t.id]) || [])
      sendLog({ type: 'info', message: `Loaded ${teams?.length || 0} teams for mapping` })

      const standings = data.response[0].league.standings[0]
      sendLog({ type: 'info', message: `Processing ${standings.length} team standings...` })

      // Collect all standings for batch upsert (instead of N+1 individual upserts)
      const missingTeams: string[] = []
      const standingsToUpsert = standings
        .map((item: any) => {
          const teamId = teamMap.get(item.team.id)
          if (!teamId) {
            missingTeams.push(item.team.name)
            return null
          }
          return {
            league_id: league.id,
            season: league.currentSeason,
            team_id: teamId,
            rank: item.rank,
            points: item.points,
            goal_diff: item.goalsDiff,
            form: item.form,
            description: item.description,
            played: item.all.played,
            won: item.all.win,
            drawn: item.all.draw,
            lost: item.all.lose,
            goals_for: item.all.goals.for,
            goals_against: item.all.goals.against,
            home_record: item.home,
            away_record: item.away,
            updated_at: new Date().toISOString(),
          }
        })
        .filter((s: any): s is NonNullable<typeof s> => s !== null)

      if (missingTeams.length > 0) {
        sendLog({ type: 'warning', message: `Teams not found: ${missingTeams.join(', ')}` })
      }

      let imported = 0
      let errors = missingTeams.length

      if (standingsToUpsert.length > 0) {
        sendLog({ type: 'progress', message: `Batch upserting ${standingsToUpsert.length} standings...` })

        const { error } = await supabase
          .from('standings')
          .upsert(standingsToUpsert, { onConflict: 'league_id,season,team_id' })

        if (error) {
          sendLog({ type: 'error', message: `Batch upsert error: ${error.message}` })
          errors += standingsToUpsert.length
        } else {
          imported = standingsToUpsert.length
        }
      }

      const duration = Date.now() - startTime
      sendLog({ type: 'success', message: `Completed: ${imported} imported, ${errors} errors (${(duration / 1000).toFixed(1)}s)` })
      close({ success: true, imported, errors, total: standings.length, duration, league: league.name })
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
    console.log(`[Refresh Standings - ${league.name}] ${message}`)
  }

  try {
    addLog('info', `Fetching standings for ${league.name} from API-Football...`)

    // Fetch standings from API-Football with league parameters
    const data = await fetchStandings(league.apiId, league.currentSeason)

    if (!data.response || data.response.length === 0) {
      addLog('error', 'No standings returned from API')
      return NextResponse.json({
        success: false,
        error: 'No standings returned from API',
        logs,
        league: league.name,
      }, { status: 400 })
    }

    addLog('info', `Received standings data from API`)

    // Get teams for this league
    const { data: teams } = await supabase
      .from('teams')
      .select('id, api_id')
      .eq('league_id', league.id)
    const teamMap = new Map(teams?.map(t => [t.api_id, t.id]) || [])
    addLog('info', `Loaded ${teams?.length || 0} teams for mapping`)

    const standings = data.response[0].league.standings[0]
    addLog('info', `Processing ${standings.length} team standings...`)

    // Collect all standings for batch upsert (instead of N+1 individual upserts)
    const missingTeams: string[] = []
    const standingsToUpsert = standings
      .map((item: any) => {
        const teamId = teamMap.get(item.team.id)
        if (!teamId) {
          missingTeams.push(item.team.name)
          return null
        }
        return {
          league_id: league.id,
          season: league.currentSeason,
          team_id: teamId,
          rank: item.rank,
          points: item.points,
          goal_diff: item.goalsDiff,
          form: item.form,
          description: item.description,
          played: item.all.played,
          won: item.all.win,
          drawn: item.all.draw,
          lost: item.all.lose,
          goals_for: item.all.goals.for,
          goals_against: item.all.goals.against,
          home_record: item.home,
          away_record: item.away,
          updated_at: new Date().toISOString(),
        }
      })
      .filter((s: any): s is NonNullable<typeof s> => s !== null)

    if (missingTeams.length > 0) {
      addLog('warning', `Teams not found: ${missingTeams.join(', ')}`)
    }

    let imported = 0
    let errors = missingTeams.length

    if (standingsToUpsert.length > 0) {
      const { error } = await supabase
        .from('standings')
        .upsert(standingsToUpsert, { onConflict: 'league_id,season,team_id' })

      if (error) {
        addLog('error', `Batch upsert error: ${error.message}`)
        errors += standingsToUpsert.length
      } else {
        imported = standingsToUpsert.length
      }
    }

    addLog('success', `Completed: ${imported} imported, ${errors} errors`)

    return NextResponse.json({
      success: true,
      imported,
      errors,
      total: standings.length,
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
