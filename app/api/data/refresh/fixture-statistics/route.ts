import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchFixtureStats, ENDPOINTS } from '@/lib/api-football'
import { createSSEStream, wantsStreaming } from '@/lib/utils/streaming'
import { getFixtureWindows, DATE_WINDOWS } from '@/lib/api/fixture-windows'
import { isAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Refresh modes for statistics
type StatsRefreshMode = 'smart' | 'recent' | 'missing' | 'all'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface LogEntry {
  type: 'info' | 'success' | 'error' | 'warning' | 'progress'
  message: string
  details?: {
    endpoint?: string
    recordId?: string
    recordName?: string
    progress?: { current: number; total: number }
    error?: string
  }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Parse refresh mode from URL query params
 */
function getRefreshMode(request: Request): StatsRefreshMode {
  const url = new URL(request.url)
  const mode = url.searchParams.get('mode')
  if (mode && ['smart', 'recent', 'missing', 'all'].includes(mode)) {
    return mode as StatsRefreshMode
  }
  return 'smart' // Default to smart mode
}

export async function POST(request: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const mode = getRefreshMode(request)

  if (wantsStreaming(request)) {
    return handleStreamingRefresh(mode)
  }
  return handleBatchRefresh(mode)
}

async function handleStreamingRefresh(mode: StatsRefreshMode) {
  const { stream, sendLog, close, closeWithError, headers } = createSSEStream()
  const startTime = Date.now()

  ;(async () => {
    try {
      const modeLabel = mode === 'all' ? 'all' : mode
      sendLog({ type: 'info', message: `Starting fixture statistics refresh (${modeLabel} mode)...` })

      // Build query based on mode
      let query = supabase
        .from('fixtures')
        .select(`
          id, api_id, match_date,
          home_team:teams!fixtures_home_team_id_fkey(name),
          away_team:teams!fixtures_away_team_id_fkey(name)
        `)
        .in('status', ['FT', 'AET', 'PEN'])

      // Apply date filter for smart/recent modes
      if (mode === 'smart' || mode === 'recent') {
        const windows = getFixtureWindows()
        query = query.gte('match_date', windows.recent.toISOString())
        sendLog({ type: 'info', message: `Filtering to fixtures since ${windows.recent.toISOString().split('T')[0]}` })
      }

      const { data: fixtures } = await query

      if (!fixtures || fixtures.length === 0) {
        sendLog({ type: 'info', message: 'No completed fixtures found in date range' })
        close({ success: true, imported: 0, errors: 0, total: 0, duration: Date.now() - startTime, mode })
        return
      }

      // Check which fixtures already have statistics
      const { data: existingStats } = await supabase
        .from('fixture_statistics')
        .select('fixture_id')

      const existingSet = new Set(existingStats?.map(s => s.fixture_id) || [])

      // For 'all' mode, include all fixtures. For others, only missing stats
      const fixturesToProcess = mode === 'all'
        ? fixtures
        : fixtures.filter(f => !existingSet.has(f.id))

      sendLog({ type: 'info', message: `Found ${fixturesToProcess.length} fixtures needing statistics (${fixtures.length} total in range)` })

      const { data: teams } = await supabase.from('teams').select('id, api_id')
      const teamMap = new Map(teams?.map(t => [t.api_id, t.id]) || [])

      let imported = 0
      let errors = 0

      for (let i = 0; i < fixturesToProcess.length; i++) {
        const fixture = fixturesToProcess[i]
        await delay(500)

        const matchName = `${(fixture.home_team as any)?.name || 'Home'} vs ${(fixture.away_team as any)?.name || 'Away'}`

        sendLog({
          type: 'progress',
          message: `Fetching stats for ${matchName}...`,
          details: { progress: { current: i + 1, total: fixturesToProcess.length } }
        })

        try {
          const data = await fetchFixtureStats(fixture.api_id)

          if (!data.response || data.response.length === 0) {
            sendLog({ type: 'warning', message: `No statistics for ${matchName}` })
            continue
          }

          for (const teamStats of data.response) {
            const teamId = teamMap.get(teamStats.team?.id)
            if (!teamId) continue

            const stats: Record<string, any> = {}
            for (const stat of teamStats.statistics || []) {
              const key = stat.type?.toLowerCase().replace(/ /g, '_')
              if (key) stats[key] = stat.value
            }

            const { error } = await supabase
              .from('fixture_statistics')
              .upsert({
                fixture_id: fixture.id,
                team_id: teamId,
                shots_total: parseInt(stats.total_shots) || null,
                shots_on_goal: parseInt(stats.shots_on_goal) || null,
                shots_off_goal: parseInt(stats.shots_off_goal) || null,
                shots_blocked: parseInt(stats.blocked_shots) || null,
                shots_inside_box: parseInt(stats.shots_insidebox) || null,
                shots_outside_box: parseInt(stats.shots_outsidebox) || null,
                corners: parseInt(stats.corner_kicks) || null,
                offsides: parseInt(stats.offsides) || null,
                fouls: parseInt(stats.fouls) || null,
                ball_possession: stats.ball_possession ? parseInt(stats.ball_possession.replace('%', '')) : null,
                yellow_cards: parseInt(stats.yellow_cards) || null,
                red_cards: parseInt(stats.red_cards) || null,
                goalkeeper_saves: parseInt(stats.goalkeeper_saves) || null,
                passes_total: parseInt(stats.total_passes) || null,
                passes_accurate: parseInt(stats.passes_accurate) || null,
                passes_pct: stats.passes_pct ? parseInt(stats.passes_pct.replace('%', '')) : null,
                expected_goals: stats.expected_goals ? parseFloat(stats.expected_goals) : null,
              }, { onConflict: 'fixture_id,team_id' })

            if (error) {
              sendLog({ type: 'warning', message: `Stats error for ${matchName}: ${error.message}` })
              errors++
            } else {
              imported++
            }
          }

          sendLog({ type: 'success', message: `Imported stats for ${matchName}` })
        } catch (err) {
          sendLog({ type: 'error', message: `Failed for ${matchName}: ${err instanceof Error ? err.message : 'Unknown'}` })
          errors++
        }
      }

      const duration = Date.now() - startTime
      sendLog({ type: 'success', message: `Completed: ${imported} imported, ${errors} errors (${(duration / 1000).toFixed(1)}s)` })
      close({ success: true, imported, errors, total: fixturesToProcess.length, duration, mode })
    } catch (error) {
      const duration = Date.now() - startTime
      sendLog({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' })
      closeWithError(error instanceof Error ? error.message : 'Unknown error', duration)
    }
  })()

  return new Response(stream, { headers })
}

async function handleBatchRefresh(mode: StatsRefreshMode) {
  const logs: LogEntry[] = []
  const startTime = Date.now()

  const addLog = (
    type: LogEntry['type'],
    message: string,
    details?: LogEntry['details']
  ) => {
    logs.push({ type, message, details })
    console.log(`[Refresh Fixture Statistics] ${message}`)
  }

  try {
    const modeLabel = mode === 'all' ? 'all' : mode
    addLog('info', `Starting fixture statistics refresh (${modeLabel} mode)...`)

    // Build query based on mode
    let query = supabase
      .from('fixtures')
      .select(`
        id, api_id, match_date,
        home_team:teams!fixtures_home_team_id_fkey(name),
        away_team:teams!fixtures_away_team_id_fkey(name)
      `)
      .in('status', ['FT', 'AET', 'PEN'])

    // Apply date filter for smart/recent modes
    if (mode === 'smart' || mode === 'recent') {
      const windows = getFixtureWindows()
      query = query.gte('match_date', windows.recent.toISOString())
      addLog('info', `Filtering to fixtures since ${windows.recent.toISOString().split('T')[0]}`)
    }

    const { data: fixtures } = await query

    if (!fixtures || fixtures.length === 0) {
      addLog('info', 'No completed fixtures found in date range')
      return NextResponse.json({
        success: true,
        imported: 0,
        errors: 0,
        total: 0,
        logs,
        mode,
      })
    }

    // Check which fixtures already have statistics
    const { data: existingStats } = await supabase
      .from('fixture_statistics')
      .select('fixture_id')

    const existingSet = new Set(existingStats?.map(s => s.fixture_id) || [])

    // For 'all' mode, include all fixtures. For others, only missing stats
    const fixturesToProcess = mode === 'all'
      ? fixtures
      : fixtures.filter(f => !existingSet.has(f.id))

    addLog('info', `Found ${fixturesToProcess.length} fixtures needing statistics (${fixtures.length} total in range)`)

    // Build team lookup
    const { data: teams } = await supabase.from('teams').select('id, api_id')
    const teamMap = new Map(teams?.map(t => [t.api_id, t.id]) || [])

    let imported = 0
    let errors = 0

    for (let i = 0; i < fixturesToProcess.length; i++) {
      const fixture = fixturesToProcess[i]
      await delay(500) // Rate limiting - 500ms for statistics

      const matchName = `${(fixture.home_team as any)?.name || 'Home'} vs ${(fixture.away_team as any)?.name || 'Away'}`

      addLog('progress', `Fetching stats for ${matchName}...`, {
        endpoint: `${ENDPOINTS.fixtureStatistics.path}?fixture=${fixture.api_id}`,
        recordId: String(fixture.api_id),
        recordName: matchName,
        progress: { current: i + 1, total: fixturesToProcess.length },
      })

      try {
        const data = await fetchFixtureStats(fixture.api_id)

        if (!data.response || data.response.length === 0) {
          addLog('warning', `No statistics for ${matchName}`)
          continue
        }

        // Process statistics for each team
        for (const teamStats of data.response) {
          const teamId = teamMap.get(teamStats.team?.id)
          if (!teamId) continue

          // Extract statistics
          const stats: Record<string, any> = {}
          for (const stat of teamStats.statistics || []) {
            const key = stat.type?.toLowerCase().replace(/ /g, '_')
            if (key) stats[key] = stat.value
          }

          const { error } = await supabase
            .from('fixture_statistics')
            .upsert({
              fixture_id: fixture.id,
              team_id: teamId,
              shots_total: parseInt(stats.total_shots) || null,
              shots_on_goal: parseInt(stats.shots_on_goal) || null,
              shots_off_goal: parseInt(stats.shots_off_goal) || null,
              shots_blocked: parseInt(stats.blocked_shots) || null,
              shots_inside_box: parseInt(stats.shots_insidebox) || null,
              shots_outside_box: parseInt(stats.shots_outsidebox) || null,
              corners: parseInt(stats.corner_kicks) || null,
              offsides: parseInt(stats.offsides) || null,
              fouls: parseInt(stats.fouls) || null,
              ball_possession: stats.ball_possession ? parseInt(stats.ball_possession.replace('%', '')) : null,
              yellow_cards: parseInt(stats.yellow_cards) || null,
              red_cards: parseInt(stats.red_cards) || null,
              goalkeeper_saves: parseInt(stats.goalkeeper_saves) || null,
              passes_total: parseInt(stats.total_passes) || null,
              passes_accurate: parseInt(stats.passes_accurate) || null,
              passes_pct: stats.passes_pct ? parseInt(stats.passes_pct.replace('%', '')) : null,
              expected_goals: stats.expected_goals ? parseFloat(stats.expected_goals) : null,
            }, { onConflict: 'fixture_id,team_id' })

          if (error) {
            addLog('error', `Error for ${matchName}: ${error.message}`)
            errors++
          } else {
            imported++
          }
        }

        addLog('success', `Imported stats for ${matchName}`)
      } catch (err) {
        addLog('error', `Failed for ${matchName}: ${err instanceof Error ? err.message : 'Unknown'}`, {
          recordName: matchName,
          error: err instanceof Error ? err.message : 'Unknown',
        })
        errors++
      }
    }

    const duration = Date.now() - startTime
    addLog('success', `Completed: ${imported} imported, ${errors} errors (${(duration / 1000).toFixed(1)}s)`)

    return NextResponse.json({
      success: true,
      imported,
      errors,
      total: fixturesToProcess.length,
      duration,
      logs,
      mode,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    addLog('error', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
      logs,
      mode,
    }, { status: 500 })
  }
}
