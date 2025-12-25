import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchTransfers, ENDPOINTS } from '@/lib/api-football'

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

export async function POST() {
  const logs: LogEntry[] = []
  const startTime = Date.now()

  const addLog = (
    type: LogEntry['type'],
    message: string,
    details?: LogEntry['details']
  ) => {
    logs.push({ type, message, details })
    console.log(`[Refresh Transfers] ${message}`)
  }

  try {
    addLog('info', 'Starting transfers refresh...')

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

    // Build team lookup
    const teamMap = new Map(teams.map(t => [t.api_id, t.id]))

    // Build player lookup
    const { data: players } = await supabase.from('players').select('id, api_id')
    const playerMap = new Map(players?.map(p => [p.api_id, p.id]) || [])

    addLog('info', `Found ${teams.length} teams to process`)

    let imported = 0
    let errors = 0

    for (let i = 0; i < teams.length; i++) {
      const team = teams[i]
      await delay(300) // Rate limiting

      addLog('progress', `Fetching transfers for ${team.name}...`, {
        endpoint: `${ENDPOINTS.transfers.path}?team=${team.api_id}`,
        recordId: String(team.api_id),
        recordName: team.name,
        progress: { current: i + 1, total: teams.length },
      })

      try {
        const data = await fetchTransfers(team.api_id)

        if (!data.response || data.response.length === 0) {
          addLog('info', `No transfer data for ${team.name}`)
          continue
        }

        let teamTransfers = 0
        for (const item of data.response) {
          const playerApiId = item.player?.id
          const transfers = item.transfers || []

          for (const transfer of transfers) {
            const fromTeamId = teamMap.get(transfer.teams?.out?.id)
            const toTeamId = teamMap.get(transfer.teams?.in?.id)
            const playerId = playerMap.get(playerApiId)

            const { error } = await supabase
              .from('transfers')
              .upsert({
                player_api_id: playerApiId,
                player_id: playerId || null,
                player_name: item.player?.name || 'Unknown',
                from_team_api_id: transfer.teams?.out?.id || null,
                from_team_id: fromTeamId || null,
                from_team_name: transfer.teams?.out?.name || null,
                to_team_api_id: transfer.teams?.in?.id || null,
                to_team_id: toTeamId || null,
                to_team_name: transfer.teams?.in?.name || null,
                transfer_date: transfer.date,
                transfer_type: transfer.type,
              }, {
                onConflict: 'player_api_id,transfer_date,from_team_api_id,to_team_api_id',
                ignoreDuplicates: true
              })

            if (error && !error.message.includes('duplicate')) {
              errors++
            } else {
              teamTransfers++
              imported++
            }
          }
        }

        if (teamTransfers > 0) {
          addLog('success', `${team.name}: ${teamTransfers} transfers processed`)
        }
      } catch (err) {
        addLog('error', `Failed for ${team.name}: ${err instanceof Error ? err.message : 'Unknown'}`, {
          recordName: team.name,
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
