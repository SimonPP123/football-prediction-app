import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchFixtureEvents, ENDPOINTS } from '@/lib/api-football'
import { createSSEStream, wantsStreaming } from '@/lib/utils/streaming'
import { getFixtureWindows, DATE_WINDOWS } from '@/lib/api/fixture-windows'
import { isAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Refresh modes for events
type EventsRefreshMode = 'smart' | 'recent' | 'missing' | 'all' | 'live'

// Live match statuses
const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'BT', 'P']
const COMPLETED_STATUSES = ['FT', 'AET', 'PEN']

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
function getRefreshMode(request: Request): EventsRefreshMode {
  const url = new URL(request.url)
  const mode = url.searchParams.get('mode')
  if (mode && ['smart', 'recent', 'missing', 'all', 'live'].includes(mode)) {
    return mode as EventsRefreshMode
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

async function handleStreamingRefresh(mode: EventsRefreshMode) {
  const { stream, sendLog, close, closeWithError, headers } = createSSEStream()
  const startTime = Date.now()

  ;(async () => {
    try {
      const modeLabel = mode
      sendLog({ type: 'info', message: `Starting fixture events refresh (${modeLabel} mode)...` })

      // Build query based on mode
      let query = supabase
        .from('fixtures')
        .select(`
          id, api_id, match_date,
          home_team:teams!fixtures_home_team_id_fkey(name),
          away_team:teams!fixtures_away_team_id_fkey(name)
        `)

      // Filter by status based on mode
      if (mode === 'live') {
        query = query.in('status', LIVE_STATUSES)
        sendLog({ type: 'info', message: 'Fetching events for LIVE matches' })
      } else {
        query = query.in('status', COMPLETED_STATUSES)
      }

      // Apply date filter for smart/recent modes
      if (mode === 'smart' || mode === 'recent') {
        const windows = getFixtureWindows()
        query = query.gte('match_date', windows.recent.toISOString())
        sendLog({ type: 'info', message: `Filtering to fixtures since ${windows.recent.toISOString().split('T')[0]}` })
      }

      const { data: fixtures } = await query

      if (!fixtures || fixtures.length === 0) {
        const noMatchMsg = mode === 'live' ? 'No live fixtures found' : 'No completed fixtures found in date range'
        sendLog({ type: 'info', message: noMatchMsg })
        close({ success: true, imported: 0, errors: 0, total: 0, duration: Date.now() - startTime, mode })
        return
      }

      // For live mode, always refresh all live fixtures (events change constantly)
      // For other modes, check which fixtures already have events
      let fixturesToProcess = fixtures
      if (mode !== 'live' && mode !== 'all') {
        // Filter by fixture IDs to avoid full table scan
        const fixtureIds = fixtures.map(f => f.id)
        const { data: existingEvents } = await supabase
          .from('fixture_events')
          .select('fixture_id')
          .in('fixture_id', fixtureIds)

        const existingSet = new Set(existingEvents?.map(e => e.fixture_id) || [])
        fixturesToProcess = fixtures.filter(f => !existingSet.has(f.id))
      }

      sendLog({ type: 'info', message: `Found ${fixturesToProcess.length} fixtures needing events (${fixtures.length} total in range)` })

      const { data: teams } = await supabase.from('teams').select('id, api_id')
      const teamMap = new Map(teams?.map(t => [t.api_id, t.id]) || [])

      let imported = 0
      let errors = 0

      // Use faster rate limiting for live mode
      const delayMs = mode === 'live' ? 150 : 300

      for (let i = 0; i < fixturesToProcess.length; i++) {
        const fixture = fixturesToProcess[i]
        await delay(delayMs)

        const matchName = `${(fixture.home_team as any)?.name || 'Home'} vs ${(fixture.away_team as any)?.name || 'Away'}`

        sendLog({
          type: 'progress',
          message: `Fetching events for ${matchName}...`,
          details: { progress: { current: i + 1, total: fixturesToProcess.length } }
        })

        try {
          const data = await fetchFixtureEvents(fixture.api_id)

          if (!data.response || data.response.length === 0) {
            sendLog({ type: 'info', message: `No events for ${matchName}` })
            continue
          }

          // Collect all events for batch upsert (instead of N+1 individual upserts)
          const eventsToUpsert = data.response
            .filter((event: any) => event.time?.elapsed !== undefined && event.time?.elapsed !== null)
            .map((event: any) => ({
              fixture_id: fixture.id,
              team_id: teamMap.get(event.team?.id) || null,
              elapsed: event.time.elapsed,
              extra_time: event.time?.extra || null,
              type: event.type || 'Unknown',
              detail: event.detail || null,
              player_name: event.player?.name || null,
              player_id: event.player?.id || null,
              assist_name: event.assist?.name || null,
              assist_id: event.assist?.id || null,
              comments: event.comments || null,
            }))

          if (eventsToUpsert.length > 0) {
            const { error } = await supabase
              .from('fixture_events')
              .upsert(eventsToUpsert, {
                onConflict: 'fixture_id,elapsed,type,player_name',
                ignoreDuplicates: true
              })

            if (error) {
              if (!error.message.includes('duplicate')) {
                sendLog({ type: 'warning', message: `Event error for ${matchName}: ${error.message}` })
                errors++
              }
            } else {
              imported += eventsToUpsert.length
            }
          }

          sendLog({ type: 'success', message: `${matchName}: ${eventsToUpsert.length} events imported` })
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

async function handleBatchRefresh(mode: EventsRefreshMode) {
  const logs: LogEntry[] = []
  const startTime = Date.now()

  const addLog = (
    type: LogEntry['type'],
    message: string,
    details?: LogEntry['details']
  ) => {
    logs.push({ type, message, details })
    console.log(`[Refresh Fixture Events] ${message}`)
  }

  try {
    const modeLabel = mode
    addLog('info', `Starting fixture events refresh (${modeLabel} mode)...`)

    // Build query based on mode
    let query = supabase
      .from('fixtures')
      .select(`
        id, api_id, match_date,
        home_team:teams!fixtures_home_team_id_fkey(name),
        away_team:teams!fixtures_away_team_id_fkey(name)
      `)

    // Filter by status based on mode
    if (mode === 'live') {
      query = query.in('status', LIVE_STATUSES)
      addLog('info', 'Fetching events for LIVE matches')
    } else {
      query = query.in('status', COMPLETED_STATUSES)
    }

    // Apply date filter for smart/recent modes
    if (mode === 'smart' || mode === 'recent') {
      const windows = getFixtureWindows()
      query = query.gte('match_date', windows.recent.toISOString())
      addLog('info', `Filtering to fixtures since ${windows.recent.toISOString().split('T')[0]}`)
    }

    const { data: fixtures } = await query

    if (!fixtures || fixtures.length === 0) {
      const noMatchMsg = mode === 'live' ? 'No live fixtures found' : 'No completed fixtures found in date range'
      addLog('info', noMatchMsg)
      return NextResponse.json({
        success: true,
        imported: 0,
        errors: 0,
        total: 0,
        logs,
        mode,
      })
    }

    // For live mode, always refresh all live fixtures (events change constantly)
    // For other modes, check which fixtures already have events
    let fixturesToProcess = fixtures
    if (mode !== 'live' && mode !== 'all') {
      // Filter by fixture IDs to avoid full table scan
      const fixtureIds = fixtures.map(f => f.id)
      const { data: existingEvents } = await supabase
        .from('fixture_events')
        .select('fixture_id')
        .in('fixture_id', fixtureIds)

      const existingSet = new Set(existingEvents?.map(e => e.fixture_id) || [])
      fixturesToProcess = fixtures.filter(f => !existingSet.has(f.id))
    }

    addLog('info', `Found ${fixturesToProcess.length} fixtures needing events (${fixtures.length} total in range)`)

    // Build team lookup
    const { data: teams } = await supabase.from('teams').select('id, api_id')
    const teamMap = new Map(teams?.map(t => [t.api_id, t.id]) || [])

    let imported = 0
    let errors = 0

    // Use faster rate limiting for live mode
    const delayMs = mode === 'live' ? 150 : 300

    for (let i = 0; i < fixturesToProcess.length; i++) {
      const fixture = fixturesToProcess[i]
      await delay(delayMs)

      const matchName = `${(fixture.home_team as any)?.name || 'Home'} vs ${(fixture.away_team as any)?.name || 'Away'}`

      addLog('progress', `Fetching events for ${matchName}...`, {
        endpoint: `${ENDPOINTS.fixtureEvents.path}?fixture=${fixture.api_id}`,
        recordId: String(fixture.api_id),
        recordName: matchName,
        progress: { current: i + 1, total: fixturesToProcess.length },
      })

      try {
        const data = await fetchFixtureEvents(fixture.api_id)

        if (!data.response || data.response.length === 0) {
          addLog('info', `No events for ${matchName}`)
          continue
        }

        // Collect all events for batch upsert (instead of N+1 individual upserts)
        const eventsToUpsert = data.response
          .filter((event: any) => event.time?.elapsed !== undefined && event.time?.elapsed !== null)
          .map((event: any) => ({
            fixture_id: fixture.id,
            team_id: teamMap.get(event.team?.id) || null,
            elapsed: event.time.elapsed,
            extra_time: event.time?.extra || null,
            type: event.type || 'Unknown',
            detail: event.detail || null,
            player_name: event.player?.name || null,
            player_id: event.player?.id || null,
            assist_name: event.assist?.name || null,
            assist_id: event.assist?.id || null,
            comments: event.comments || null,
          }))

        if (eventsToUpsert.length > 0) {
          const { error } = await supabase
            .from('fixture_events')
            .upsert(eventsToUpsert, {
              onConflict: 'fixture_id,elapsed,type,player_name',
              ignoreDuplicates: true
            })

          if (error) {
            if (!error.message.includes('duplicate')) {
              errors++
            }
          } else {
            imported += eventsToUpsert.length
          }
        }

        addLog('success', `${matchName}: ${eventsToUpsert.length} events imported`)
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
