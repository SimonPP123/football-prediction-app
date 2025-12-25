import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchInjuries, SEASON } from '@/lib/api-football'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface LogEntry {
  type: 'info' | 'success' | 'error' | 'warning'
  message: string
}

export async function POST() {
  const logs: LogEntry[] = []
  const addLog = (type: LogEntry['type'], message: string) => {
    logs.push({ type, message })
    console.log(`[Refresh Injuries] ${message}`)
  }

  try {
    addLog('info', 'Fetching injuries from API-Football...')

    // Fetch injuries from API-Football
    const data = await fetchInjuries()

    if (!data.response) {
      addLog('error', 'No injuries data returned from API')
      return NextResponse.json({
        success: false,
        error: 'No injuries data returned from API',
        logs,
      }, { status: 400 })
    }

    addLog('info', `Received ${data.response.length} injury records from API`)

    // Build team lookup
    const { data: teams } = await supabase.from('teams').select('id, api_id')
    const teamMap = new Map(teams?.map(t => [t.api_id, t.id]) || [])
    addLog('info', `Loaded ${teams?.length || 0} teams for mapping`)

    // Build player lookup
    const { data: players } = await supabase.from('players').select('id, api_id')
    const playerMap = new Map(players?.map(p => [p.api_id, p.id]) || [])
    addLog('info', `Loaded ${players?.length || 0} players for mapping`)

    let imported = 0
    let errors = 0
    let skipped = 0

    addLog('info', 'Processing injury records...')

    for (const item of data.response) {
      const teamId = teamMap.get(item.team.id)
      if (!teamId) {
        // Skip injuries for teams not in our database
        skipped++
        continue
      }

      const playerId = playerMap.get(item.player.id)

      const { error } = await supabase
        .from('injuries')
        .upsert({
          player_id: playerId || null,
          player_name: item.player.name,
          team_id: teamId,
          type: item.player.type || null,
          reason: item.player.reason || null,
          reported_date: item.fixture?.date ? new Date(item.fixture.date).toISOString().split('T')[0] : null,
        }, { onConflict: 'player_id,reported_date' })

      if (error) {
        addLog('error', `Error updating ${item.player.name}: ${error.message}`)
        errors++
      } else {
        imported++
      }
    }

    if (skipped > 0) {
      addLog('info', `Skipped ${skipped} injuries (teams not in database)`)
    }

    addLog('success', `Completed: ${imported} imported, ${errors} errors`)

    return NextResponse.json({
      success: true,
      imported,
      errors,
      skipped,
      total: data.response.length,
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
