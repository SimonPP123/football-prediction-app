import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchTeamStats, LEAGUE_ID, SEASON } from '@/lib/api-football'
import { createSSEStream, wantsStreaming } from '@/lib/utils/streaming'

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

export async function POST(request: Request) {
  if (wantsStreaming(request)) {
    return handleStreamingRefresh()
  }
  return handleBatchRefresh()
}

async function handleStreamingRefresh() {
  const { stream, sendLog, close, closeWithError, headers } = createSSEStream()
  const startTime = Date.now()

  ;(async () => {
    try {
      sendLog({ type: 'info', message: 'Starting team stats refresh...' })

      const { data: leagueData } = await supabase
        .from('leagues')
        .select('id')
        .eq('api_id', LEAGUE_ID)
        .single()

      if (!leagueData) {
        sendLog({ type: 'error', message: 'League not found in database' })
        closeWithError('League not found in database', Date.now() - startTime)
        return
      }

      const { data: teams } = await supabase.from('teams').select('id, api_id, name')

      if (!teams || teams.length === 0) {
        sendLog({ type: 'error', message: 'No teams found in database' })
        closeWithError('No teams found', Date.now() - startTime)
        return
      }

      sendLog({ type: 'info', message: `Found ${teams.length} teams to update` })

      let imported = 0
      let errors = 0

      for (let i = 0; i < teams.length; i++) {
        const team = teams[i]
        await delay(300)

        sendLog({
          type: 'progress',
          message: `Fetching stats for ${team.name}...`,
          details: { progress: { current: i + 1, total: teams.length } }
        })

        try {
          const data = await fetchTeamStats(team.api_id)

          if (!data.response) {
            sendLog({ type: 'warning', message: `No stats returned for ${team.name}` })
            errors++
            continue
          }

          const stats = data.response

          const { error } = await supabase
            .from('team_season_stats')
            .upsert({
              team_id: team.id,
              league_id: leagueData.id,
              season: SEASON,
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
            }, { onConflict: 'team_id,league_id,season' })

          if (error) {
            sendLog({ type: 'error', message: `Error updating ${team.name}: ${error.message}` })
            errors++
          } else {
            imported++
          }
        } catch (err) {
          sendLog({ type: 'error', message: `Error fetching ${team.name}: ${err instanceof Error ? err.message : 'Unknown error'}` })
          errors++
        }
      }

      const duration = Date.now() - startTime
      sendLog({ type: 'success', message: `Completed: ${imported} imported, ${errors} errors (${(duration / 1000).toFixed(1)}s)` })
      close({ success: true, imported, errors, total: teams.length, duration })
    } catch (error) {
      const duration = Date.now() - startTime
      sendLog({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' })
      closeWithError(error instanceof Error ? error.message : 'Unknown error', duration)
    }
  })()

  return new Response(stream, { headers })
}

async function handleBatchRefresh() {
  const logs: LogEntry[] = []
  const addLog = (type: LogEntry['type'], message: string) => {
    logs.push({ type, message })
    console.log(`[Refresh Team Stats] ${message}`)
  }

  try {
    addLog('info', 'Starting team stats refresh...')

    // Get league UUID
    const { data: leagueData } = await supabase
      .from('leagues')
      .select('id')
      .eq('api_id', LEAGUE_ID)
      .single()

    if (!leagueData) {
      addLog('error', 'League not found in database')
      return NextResponse.json({
        success: false,
        error: 'League not found in database',
        logs,
      }, { status: 400 })
    }

    // Get all teams
    const { data: teams } = await supabase.from('teams').select('id, api_id, name')

    if (!teams || teams.length === 0) {
      addLog('error', 'No teams found in database')
      return NextResponse.json({
        success: false,
        error: 'No teams found',
        logs,
      }, { status: 400 })
    }

    addLog('info', `Found ${teams.length} teams to update`)

    let imported = 0
    let errors = 0

    for (const team of teams) {
      await delay(300) // Rate limiting

      try {
        addLog('info', `Fetching stats for ${team.name}...`)
        const data = await fetchTeamStats(team.api_id)

        if (!data.response) {
          addLog('warning', `No stats returned for ${team.name}`)
          errors++
          continue
        }

        const stats = data.response

        const { error } = await supabase
          .from('team_season_stats')
          .upsert({
            team_id: team.id,
            league_id: leagueData.id,
            season: SEASON,
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
          }, { onConflict: 'team_id,league_id,season' })

        if (error) {
          addLog('error', `Error updating ${team.name}: ${error.message}`)
          errors++
        } else {
          addLog('success', `Updated: ${team.name}`)
          imported++
        }
      } catch (err) {
        addLog('error', `Error fetching ${team.name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        errors++
      }
    }

    addLog('success', `Completed: ${imported} imported, ${errors} errors`)

    return NextResponse.json({
      success: true,
      imported,
      errors,
      total: teams.length,
      logs,
    })
  } catch (error) {
    addLog('error', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      logs,
    }, { status: 500 })
  }
}
