import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchAPIPredictions, ENDPOINTS } from '@/lib/api-football'
import { createSSEStream, wantsStreaming } from '@/lib/utils/streaming'
import { isAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

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

export async function POST(request: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

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
      sendLog({ type: 'info', message: 'Starting API predictions refresh from API-Football...' })

      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)

      const { data: fixtures } = await supabase
        .from('fixtures')
        .select(`
          id, api_id,
          home_team:teams!fixtures_home_team_id_fkey(name),
          away_team:teams!fixtures_away_team_id_fkey(name)
        `)
        .gte('match_date', new Date().toISOString())
        .lte('match_date', nextWeek.toISOString())
        .eq('status', 'NS')

      if (!fixtures || fixtures.length === 0) {
        sendLog({ type: 'info', message: 'No upcoming fixtures found' })
        close({ success: true, imported: 0, errors: 0, total: 0, duration: Date.now() - startTime })
        return
      }

      const { data: existingPredictions } = await supabase
        .from('api_predictions')
        .select('fixture_id')

      const existingSet = new Set(existingPredictions?.map(p => p.fixture_id) || [])
      const fixturesToProcess = fixtures.filter(f => !existingSet.has(f.id))

      sendLog({ type: 'info', message: `Found ${fixturesToProcess.length} fixtures needing predictions (${fixtures.length} total upcoming)` })

      let imported = 0
      let errors = 0

      for (let i = 0; i < fixturesToProcess.length; i++) {
        const fixture = fixturesToProcess[i]
        await delay(400)

        const matchName = `${(fixture.home_team as any)?.name || 'Home'} vs ${(fixture.away_team as any)?.name || 'Away'}`

        sendLog({
          type: 'progress',
          message: `Fetching prediction for ${matchName}...`,
          details: { progress: { current: i + 1, total: fixturesToProcess.length } }
        })

        try {
          const data = await fetchAPIPredictions(fixture.api_id)

          if (!data.response || data.response.length === 0) {
            sendLog({ type: 'info', message: `No prediction data for ${matchName}` })
            continue
          }

          const pred = data.response[0]
          const predictions = pred.predictions || {}
          const teams = pred.teams || {}
          const comparison = pred.comparison || {}
          const h2h = pred.h2h || []

          const { error } = await supabase
            .from('api_predictions')
            .upsert({
              fixture_id: fixture.id,
              winner_id: predictions.winner?.id || null,
              winner_name: predictions.winner?.name || null,
              winner_comment: predictions.winner?.comment || null,
              win_or_draw: predictions.win_or_draw || null,
              under_over: predictions.under_over || null,
              goals_home: predictions.goals?.home || null,
              goals_away: predictions.goals?.away || null,
              advice: predictions.advice || null,
              percent_home: predictions.percent?.home || null,
              percent_draw: predictions.percent?.draw || null,
              percent_away: predictions.percent?.away || null,
              comparison: comparison,
              teams_comparison: { home: teams.home, away: teams.away },
              h2h_summary: h2h.slice(0, 5),
              created_at: new Date().toISOString(),
            }, { onConflict: 'fixture_id' })

          if (error) {
            errors++
          } else {
            const advice = predictions.advice || 'No advice'
            sendLog({ type: 'success', message: `${matchName}: ${advice}` })
            imported++
          }
        } catch (err) {
          errors++
        }
      }

      const duration = Date.now() - startTime
      sendLog({ type: 'success', message: `Completed: ${imported} imported, ${errors} errors (${(duration / 1000).toFixed(1)}s)` })
      close({ success: true, imported, errors, total: fixturesToProcess.length, duration })
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
  const startTime = Date.now()

  const addLog = (type: LogEntry['type'], message: string, details?: LogEntry['details']) => {
    logs.push({ type, message, details })
    console.log(`[Refresh API Predictions] ${message}`)
  }

  try {
    addLog('info', 'Starting API predictions refresh from API-Football...')

    // Get upcoming fixtures (next 7 days)
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)

    const { data: fixtures } = await supabase
      .from('fixtures')
      .select(`
        id, api_id,
        home_team:teams!fixtures_home_team_id_fkey(name),
        away_team:teams!fixtures_away_team_id_fkey(name)
      `)
      .gte('match_date', new Date().toISOString())
      .lte('match_date', nextWeek.toISOString())
      .eq('status', 'NS')

    if (!fixtures || fixtures.length === 0) {
      addLog('info', 'No upcoming fixtures found')
      return NextResponse.json({
        success: true,
        imported: 0,
        errors: 0,
        total: 0,
        logs,
      })
    }

    // Check which fixtures already have predictions
    const { data: existingPredictions } = await supabase
      .from('api_predictions')
      .select('fixture_id')

    const existingSet = new Set(existingPredictions?.map(p => p.fixture_id) || [])
    const fixturesToProcess = fixtures.filter(f => !existingSet.has(f.id))

    addLog('info', `Found ${fixturesToProcess.length} fixtures needing predictions (${fixtures.length} total upcoming)`)

    let imported = 0
    let errors = 0

    for (let i = 0; i < fixturesToProcess.length; i++) {
      const fixture = fixturesToProcess[i]
      await delay(400) // Rate limiting

      const matchName = `${(fixture.home_team as any)?.name || 'Home'} vs ${(fixture.away_team as any)?.name || 'Away'}`

      addLog('progress', `Fetching prediction for ${matchName}...`, {
        endpoint: `/predictions?fixture=${fixture.api_id}`,
        recordId: String(fixture.api_id),
        recordName: matchName,
        progress: { current: i + 1, total: fixturesToProcess.length },
      })

      try {
        const data = await fetchAPIPredictions(fixture.api_id)

        if (!data.response || data.response.length === 0) {
          addLog('info', `No prediction data for ${matchName}`)
          continue
        }

        const pred = data.response[0]
        const predictions = pred.predictions || {}
        const teams = pred.teams || {}
        const comparison = pred.comparison || {}
        const h2h = pred.h2h || []

        const { error } = await supabase
          .from('api_predictions')
          .upsert({
            fixture_id: fixture.id,
            winner_id: predictions.winner?.id || null,
            winner_name: predictions.winner?.name || null,
            winner_comment: predictions.winner?.comment || null,
            win_or_draw: predictions.win_or_draw || null,
            under_over: predictions.under_over || null,
            goals_home: predictions.goals?.home || null,
            goals_away: predictions.goals?.away || null,
            advice: predictions.advice || null,
            percent_home: predictions.percent?.home || null,
            percent_draw: predictions.percent?.draw || null,
            percent_away: predictions.percent?.away || null,
            comparison: comparison,
            teams_comparison: {
              home: teams.home,
              away: teams.away,
            },
            h2h_summary: h2h.slice(0, 5), // Last 5 H2H matches
            created_at: new Date().toISOString(),
          }, { onConflict: 'fixture_id' })

        if (error) {
          addLog('error', `Error for ${matchName}: ${error.message}`)
          errors++
        } else {
          const advice = predictions.advice || 'No advice'
          addLog('success', `${matchName}: ${advice}`)
          imported++
        }
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
    })
  } catch (error) {
    const duration = Date.now() - startTime
    addLog('error', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
      logs,
    }, { status: 500 })
  }
}
