import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchPlayerSquads, SEASON, ENDPOINTS } from '@/lib/api-football'
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
      sendLog({ type: 'info', message: 'Starting player squads refresh...' })

      const { data: teams } = await supabase.from('teams').select('id, api_id, name')

      if (!teams || teams.length === 0) {
        sendLog({ type: 'error', message: 'No teams found in database' })
        closeWithError('No teams found', Date.now() - startTime)
        return
      }

      sendLog({ type: 'info', message: `Found ${teams.length} teams to process` })

      let playersImported = 0
      let squadsImported = 0
      let errors = 0

      for (let i = 0; i < teams.length; i++) {
        const team = teams[i]
        await delay(300)

        sendLog({
          type: 'progress',
          message: `Fetching squad for ${team.name}...`,
          details: { progress: { current: i + 1, total: teams.length } }
        })

        try {
          const data = await fetchPlayerSquads(team.api_id)

          if (!data.response || data.response.length === 0) {
            sendLog({ type: 'warning', message: `No squad data for ${team.name}` })
            continue
          }

          const squadData = data.response[0]
          const players = squadData.players || []

          for (const player of players) {
            const { data: playerData, error: playerError } = await supabase
              .from('players')
              .upsert({
                api_id: player.id,
                name: player.name,
                age: player.age,
                photo: player.photo,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'api_id' })
              .select('id')
              .single()

            if (playerError) {
              errors++
              continue
            }

            playersImported++

            const { error: squadError } = await supabase
              .from('player_squads')
              .upsert({
                player_id: playerData.id,
                team_id: team.id,
                season: SEASON,
                number: player.number,
                position: player.position,
              }, { onConflict: 'player_id,team_id,season' })

            if (squadError) {
              errors++
            } else {
              squadsImported++
            }
          }

          sendLog({ type: 'success', message: `${team.name}: ${players.length} players processed` })
        } catch (err) {
          sendLog({ type: 'error', message: `Failed for ${team.name}: ${err instanceof Error ? err.message : 'Unknown'}` })
          errors++
        }
      }

      const duration = Date.now() - startTime
      sendLog({ type: 'success', message: `Completed: ${playersImported} players, ${squadsImported} squads, ${errors} errors (${(duration / 1000).toFixed(1)}s)` })
      close({ success: true, imported: squadsImported, errors, total: teams.length, duration })
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
    console.log(`[Refresh Player Squads] ${message}`)
  }

  try {
    addLog('info', 'Starting player squads refresh...')

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

    addLog('info', `Found ${teams.length} teams to process`)

    let playersImported = 0
    let squadsImported = 0
    let errors = 0

    for (let i = 0; i < teams.length; i++) {
      const team = teams[i]
      await delay(300) // Rate limiting

      addLog('progress', `Fetching squad for ${team.name}...`, {
        endpoint: `${ENDPOINTS.playerSquads.path}?team=${team.api_id}`,
        recordId: String(team.api_id),
        recordName: team.name,
        progress: { current: i + 1, total: teams.length },
      })

      try {
        const data = await fetchPlayerSquads(team.api_id)

        if (!data.response || data.response.length === 0) {
          addLog('warning', `No squad data for ${team.name}`)
          continue
        }

        const squadData = data.response[0]
        const players = squadData.players || []

        for (const player of players) {
          // Upsert player
          const { data: playerData, error: playerError } = await supabase
            .from('players')
            .upsert({
              api_id: player.id,
              name: player.name,
              age: player.age,
              photo: player.photo,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'api_id' })
            .select('id')
            .single()

          if (playerError) {
            addLog('warning', `Player error for ${player.name}: ${playerError.message}`)
            errors++
            continue
          }

          playersImported++

          // Upsert squad assignment
          const { error: squadError } = await supabase
            .from('player_squads')
            .upsert({
              player_id: playerData.id,
              team_id: team.id,
              season: SEASON,
              number: player.number,
              position: player.position,
            }, { onConflict: 'player_id,team_id,season' })

          if (squadError) {
            addLog('warning', `Squad error for ${player.name}: ${squadError.message}`)
            errors++
          } else {
            squadsImported++
          }
        }

        addLog('success', `${team.name}: ${players.length} players processed`, {
          recordId: String(team.api_id),
          recordName: team.name,
        })
      } catch (err) {
        addLog('error', `Failed for ${team.name}: ${err instanceof Error ? err.message : 'Unknown'}`, {
          recordName: team.name,
          error: err instanceof Error ? err.message : 'Unknown',
        })
        errors++
      }
    }

    const duration = Date.now() - startTime
    addLog('success', `Completed: ${playersImported} players, ${squadsImported} squads, ${errors} errors (${(duration / 1000).toFixed(1)}s)`)

    return NextResponse.json({
      success: true,
      imported: squadsImported,
      playersImported,
      errors,
      total: teams.length,
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
