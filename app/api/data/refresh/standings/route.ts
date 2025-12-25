import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchStandings, LEAGUE_ID, SEASON } from '@/lib/api-football'
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
      sendLog({ type: 'info', message: 'Fetching standings from API-Football...' })

      const data = await fetchStandings()

      if (!data.response || data.response.length === 0) {
        sendLog({ type: 'error', message: 'No standings returned from API' })
        closeWithError('No standings returned from API', Date.now() - startTime)
        return
      }

      sendLog({ type: 'info', message: 'Received standings data from API' })

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

      const { data: teams } = await supabase.from('teams').select('id, api_id')
      const teamMap = new Map(teams?.map(t => [t.api_id, t.id]) || [])
      sendLog({ type: 'info', message: `Loaded ${teams?.length || 0} teams for mapping` })

      const standings = data.response[0].league.standings[0]
      sendLog({ type: 'info', message: `Processing ${standings.length} team standings...` })

      let imported = 0
      let errors = 0

      for (let i = 0; i < standings.length; i++) {
        const item = standings[i]
        const teamId = teamMap.get(item.team.id)

        sendLog({
          type: 'progress',
          message: `Processing: ${item.team.name}`,
          details: { progress: { current: i + 1, total: standings.length } }
        })

        if (!teamId) {
          sendLog({ type: 'warning', message: `Team not found: ${item.team.name}` })
          errors++
          continue
        }

        const { error } = await supabase
          .from('standings')
          .upsert({
            league_id: leagueData.id,
            season: SEASON,
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
          }, { onConflict: 'league_id,season,team_id' })

        if (error) {
          sendLog({ type: 'error', message: `Error updating ${item.team.name}: ${error.message}` })
          errors++
        } else {
          imported++
        }
      }

      const duration = Date.now() - startTime
      sendLog({ type: 'success', message: `Completed: ${imported} imported, ${errors} errors (${(duration / 1000).toFixed(1)}s)` })
      close({ success: true, imported, errors, total: standings.length, duration })
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
    console.log(`[Refresh Standings] ${message}`)
  }

  try {
    addLog('info', 'Fetching standings from API-Football...')

    // Fetch standings from API-Football
    const data = await fetchStandings()

    if (!data.response || data.response.length === 0) {
      addLog('error', 'No standings returned from API')
      return NextResponse.json({
        success: false,
        error: 'No standings returned from API',
        logs,
      }, { status: 400 })
    }

    addLog('info', `Received standings data from API`)

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

    // Build team lookup
    const { data: teams } = await supabase.from('teams').select('id, api_id')
    const teamMap = new Map(teams?.map(t => [t.api_id, t.id]) || [])
    addLog('info', `Loaded ${teams?.length || 0} teams for mapping`)

    const standings = data.response[0].league.standings[0]
    addLog('info', `Processing ${standings.length} team standings...`)

    let imported = 0
    let errors = 0

    for (const item of standings) {
      const teamId = teamMap.get(item.team.id)
      if (!teamId) {
        addLog('warning', `Team not found: ${item.team.name}`)
        errors++
        continue
      }

      const { error } = await supabase
        .from('standings')
        .upsert({
          league_id: leagueData.id,
          season: SEASON,
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
        }, { onConflict: 'league_id,season,team_id' })

      if (error) {
        addLog('error', `Error updating ${item.team.name}: ${error.message}`)
        errors++
      } else {
        imported++
      }
    }

    addLog('success', `Completed: ${imported} imported, ${errors} errors`)

    return NextResponse.json({
      success: true,
      imported,
      errors,
      total: standings.length,
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
