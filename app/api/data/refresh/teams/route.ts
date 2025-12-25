import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchTeams, LEAGUE_ID, SEASON, ENDPOINTS } from '@/lib/api-football'
import { createSSEStream, wantsStreaming } from '@/lib/utils/streaming'

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
      sendLog({ type: 'info', message: 'Starting teams refresh...', details: { endpoint: ENDPOINTS.teams.url } })

      const data = await fetchTeams()

      if (!data.response || data.response.length === 0) {
        sendLog({ type: 'error', message: 'No teams returned from API' })
        closeWithError('No teams returned from API', Date.now() - startTime)
        return
      }

      sendLog({ type: 'info', message: `Received ${data.response.length} teams from API` })

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

      let teamsImported = 0
      let venuesImported = 0
      let errors = 0
      const total = data.response.length

      for (let i = 0; i < data.response.length; i++) {
        const item = data.response[i]
        const team = item.team
        const venue = item.venue

        sendLog({
          type: 'progress',
          message: `Processing: ${team.name}`,
          details: { recordId: String(team.id), recordName: team.name, progress: { current: i + 1, total } }
        })

        let venueId = null
        if (venue && venue.id) {
          const { data: venueData, error: venueError } = await supabase
            .from('venues')
            .upsert({
              api_id: venue.id,
              name: venue.name,
              city: venue.city,
              country: 'England',
              capacity: venue.capacity,
              surface: venue.surface,
              lat: null,
              lng: null,
            }, { onConflict: 'api_id' })
            .select('id')
            .single()

          if (venueError) {
            sendLog({ type: 'warning', message: `Venue error for ${venue.name}: ${venueError.message}` })
          } else if (venueData) {
            venueId = venueData.id
            venuesImported++
          }
        }

        const { error: teamError } = await supabase
          .from('teams')
          .upsert({
            api_id: team.id,
            name: team.name,
            code: team.code,
            country: team.country,
            logo: team.logo,
            venue_id: venueId,
          }, { onConflict: 'api_id' })

        if (teamError) {
          sendLog({ type: 'error', message: `Error updating ${team.name}: ${teamError.message}` })
          errors++
        } else {
          teamsImported++
        }
      }

      const duration = Date.now() - startTime
      sendLog({ type: 'success', message: `Completed: ${teamsImported} teams, ${venuesImported} venues imported, ${errors} errors (${(duration / 1000).toFixed(1)}s)` })
      close({ success: true, imported: teamsImported, errors, total, duration })
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

  const addLog = (
    type: LogEntry['type'],
    message: string,
    details?: LogEntry['details']
  ) => {
    logs.push({ type, message, details })
    console.log(`[Refresh Teams] ${message}`)
  }

  try {
    addLog('info', 'Starting teams refresh...', {
      endpoint: ENDPOINTS.teams.url,
    })

    // Fetch teams from API-Football
    const data = await fetchTeams()

    if (!data.response || data.response.length === 0) {
      addLog('error', 'No teams returned from API')
      return NextResponse.json({
        success: false,
        error: 'No teams returned from API',
        logs,
        endpoint: ENDPOINTS.teams.url,
      }, { status: 400 })
    }

    addLog('info', `Received ${data.response.length} teams from API`)

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
        endpoint: ENDPOINTS.teams.url,
      }, { status: 400 })
    }

    let teamsImported = 0
    let venuesImported = 0
    let errors = 0
    const total = data.response.length

    for (let i = 0; i < data.response.length; i++) {
      const item = data.response[i]
      const team = item.team
      const venue = item.venue

      addLog('progress', `Processing: ${team.name}`, {
        recordId: String(team.id),
        recordName: team.name,
        progress: { current: i + 1, total },
      })

      // Upsert venue first
      let venueId = null
      if (venue && venue.id) {
        const { data: venueData, error: venueError } = await supabase
          .from('venues')
          .upsert({
            api_id: venue.id,
            name: venue.name,
            city: venue.city,
            country: 'England',
            capacity: venue.capacity,
            surface: venue.surface,
            lat: null,
            lng: null,
          }, { onConflict: 'api_id' })
          .select('id')
          .single()

        if (venueError) {
          addLog('warning', `Venue error for ${venue.name}: ${venueError.message}`)
        } else if (venueData) {
          venueId = venueData.id
          venuesImported++
        }
      }

      // Upsert team
      const { error: teamError } = await supabase
        .from('teams')
        .upsert({
          api_id: team.id,
          name: team.name,
          code: team.code,
          country: team.country,
          logo: team.logo,
          venue_id: venueId,
        }, { onConflict: 'api_id' })

      if (teamError) {
        addLog('error', `Error updating ${team.name}: ${teamError.message}`, {
          recordId: String(team.id),
          recordName: team.name,
          error: teamError.message,
        })
        errors++
      } else {
        addLog('success', `Updated: ${team.name}`, {
          recordId: String(team.id),
          recordName: team.name,
        })
        teamsImported++
      }
    }

    const duration = Date.now() - startTime
    addLog('success', `Completed: ${teamsImported} teams, ${venuesImported} venues imported, ${errors} errors (${(duration / 1000).toFixed(1)}s)`)

    return NextResponse.json({
      success: true,
      imported: teamsImported,
      venuesImported,
      errors,
      total,
      duration,
      endpoint: ENDPOINTS.teams.url,
      logs,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    addLog('error', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
      endpoint: ENDPOINTS.teams.url,
      logs,
    }, { status: 500 })
  }
}
