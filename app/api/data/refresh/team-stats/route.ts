import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchTeamStats } from '@/lib/api-football'
import { getLeagueFromRequest } from '@/lib/league-context'
import { createSSEStream, wantsStreaming } from '@/lib/utils/streaming'
import { isAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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

async function handleStreamingRefresh(league: LeagueConfig) {
  const { stream, sendLog, close, closeWithError, headers } = createSSEStream()
  const startTime = Date.now()

  ;(async () => {
    try {
      sendLog({ type: 'info', message: `Starting team stats refresh for ${league.name}...` })

      // Get teams for this league
      const { data: teams } = await supabase
        .from('teams')
        .select('id, api_id, name')
        .eq('league_id', league.id)

      if (!teams || teams.length === 0) {
        sendLog({ type: 'error', message: 'No teams found in database for this league' })
        closeWithError('No teams found', Date.now() - startTime)
        return
      }

      sendLog({ type: 'info', message: `Found ${teams.length} teams to update` })

      // Collect all stats for batch upsert
      const statsToUpsert: any[] = []
      let fetchErrors = 0

      for (let i = 0; i < teams.length; i++) {
        const team = teams[i]
        await delay(300)

        sendLog({
          type: 'progress',
          message: `Fetching stats for ${team.name}...`,
          details: { progress: { current: i + 1, total: teams.length } }
        })

        try {
          const data = await fetchTeamStats(team.api_id, league.apiId, league.currentSeason)

          if (!data.response) {
            sendLog({ type: 'warning', message: `No stats returned for ${team.name}` })
            fetchErrors++
            continue
          }

          const stats = data.response

          statsToUpsert.push({
            team_id: team.id,
            league_id: league.id,
            season: league.currentSeason,
            fixtures_played: stats.fixtures?.played?.total || 0,
            wins: stats.fixtures?.wins?.total || 0,
            draws: stats.fixtures?.draws?.total || 0,
            losses: stats.fixtures?.loses?.total || 0,
            goals_for: stats.goals?.for?.total?.total || 0,
            goals_against: stats.goals?.against?.total?.total || 0,
            goals_for_avg: stats.goals?.for?.average?.total || null,
            goals_against_avg: stats.goals?.against?.average?.total || null,
            clean_sheets: stats.clean_sheet?.total || 0,
            failed_to_score: stats.failed_to_score?.total || 0,
            form: stats.form,
            home_stats: stats.fixtures?.played?.home ? {
              played: stats.fixtures.played.home,
              wins: stats.fixtures.wins.home,
              draws: stats.fixtures.draws.home,
              losses: stats.fixtures.loses.home,
              goals_for: stats.goals?.for?.total?.home,
              goals_against: stats.goals?.against?.total?.home,
            } : null,
            away_stats: stats.fixtures?.played?.away ? {
              played: stats.fixtures.played.away,
              wins: stats.fixtures.wins.away,
              draws: stats.fixtures.draws.away,
              losses: stats.fixtures.loses.away,
              goals_for: stats.goals?.for?.total?.away,
              goals_against: stats.goals?.against?.total?.away,
            } : null,
            updated_at: new Date().toISOString(),
          })
        } catch (err) {
          sendLog({ type: 'error', message: `Error fetching ${team.name}: ${err instanceof Error ? err.message : 'Unknown error'}` })
          fetchErrors++
        }
      }

      // Batch upsert all collected stats
      let imported = 0
      let dbErrors = 0

      if (statsToUpsert.length > 0) {
        sendLog({ type: 'info', message: `Batch upserting ${statsToUpsert.length} team stats...` })

        const { error } = await supabase
          .from('team_season_stats')
          .upsert(statsToUpsert, { onConflict: 'team_id,league_id,season' })

        if (error) {
          sendLog({ type: 'error', message: `Batch upsert error: ${error.message}` })
          dbErrors = statsToUpsert.length
        } else {
          imported = statsToUpsert.length
        }
      }

      const duration = Date.now() - startTime
      const totalErrors = fetchErrors + dbErrors
      sendLog({ type: 'success', message: `Completed: ${imported} imported, ${totalErrors} errors (${(duration / 1000).toFixed(1)}s)` })
      close({ success: true, imported, errors: totalErrors, total: teams.length, duration, league: league.name })
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
    console.log(`[Refresh Team Stats - ${league.name}] ${message}`)
  }

  try {
    addLog('info', `Starting team stats refresh for ${league.name}...`)

    // Get teams for this league
    const { data: teams } = await supabase
      .from('teams')
      .select('id, api_id, name')
      .eq('league_id', league.id)

    if (!teams || teams.length === 0) {
      addLog('error', 'No teams found in database for this league')
      return NextResponse.json({
        success: false,
        error: 'No teams found',
        logs,
        league: league.name,
      }, { status: 400 })
    }

    addLog('info', `Found ${teams.length} teams to update`)

    // Collect all stats for batch upsert
    const statsToUpsert: any[] = []
    let fetchErrors = 0

    for (const team of teams) {
      await delay(300) // Rate limiting

      try {
        addLog('info', `Fetching stats for ${team.name}...`)
        const data = await fetchTeamStats(team.api_id, league.apiId, league.currentSeason)

        if (!data.response) {
          addLog('warning', `No stats returned for ${team.name}`)
          fetchErrors++
          continue
        }

        const stats = data.response

        statsToUpsert.push({
          team_id: team.id,
          league_id: league.id,
          season: league.currentSeason,
          fixtures_played: stats.fixtures?.played?.total || 0,
          wins: stats.fixtures?.wins?.total || 0,
          draws: stats.fixtures?.draws?.total || 0,
          losses: stats.fixtures?.loses?.total || 0,
          goals_for: stats.goals?.for?.total?.total || 0,
          goals_against: stats.goals?.against?.total?.total || 0,
          goals_for_avg: stats.goals?.for?.average?.total || null,
          goals_against_avg: stats.goals?.against?.average?.total || null,
          clean_sheets: stats.clean_sheet?.total || 0,
          failed_to_score: stats.failed_to_score?.total || 0,
          form: stats.form,
          home_stats: stats.fixtures?.played?.home ? {
            played: stats.fixtures.played.home,
            wins: stats.fixtures.wins.home,
            draws: stats.fixtures.draws.home,
            losses: stats.fixtures.loses.home,
            goals_for: stats.goals?.for?.total?.home,
            goals_against: stats.goals?.against?.total?.home,
          } : null,
          away_stats: stats.fixtures?.played?.away ? {
            played: stats.fixtures.played.away,
            wins: stats.fixtures.wins.away,
            draws: stats.fixtures.draws.away,
            losses: stats.fixtures.loses.away,
            goals_for: stats.goals?.for?.total?.away,
            goals_against: stats.goals?.against?.total?.away,
          } : null,
          updated_at: new Date().toISOString(),
        })
      } catch (err) {
        addLog('error', `Error fetching ${team.name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        fetchErrors++
      }
    }

    // Batch upsert all collected stats
    let imported = 0
    let dbErrors = 0

    if (statsToUpsert.length > 0) {
      addLog('info', `Batch upserting ${statsToUpsert.length} team stats...`)

      const { error } = await supabase
        .from('team_season_stats')
        .upsert(statsToUpsert, { onConflict: 'team_id,league_id,season' })

      if (error) {
        addLog('error', `Batch upsert error: ${error.message}`)
        dbErrors = statsToUpsert.length
      } else {
        imported = statsToUpsert.length
      }
    }

    const totalErrors = fetchErrors + dbErrors
    addLog('success', `Completed: ${imported} imported, ${totalErrors} errors`)

    return NextResponse.json({
      success: true,
      imported,
      errors: totalErrors,
      total: teams.length,
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
