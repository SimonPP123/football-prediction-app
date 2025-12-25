import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchLineups, ENDPOINTS } from '@/lib/api-football'

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
    console.log(`[Refresh Lineups] ${message}`)
  }

  try {
    addLog('info', 'Starting lineups refresh...')

    // Get completed fixtures without lineups
    const { data: fixtures } = await supabase
      .from('fixtures')
      .select(`
        id, api_id,
        home_team:teams!fixtures_home_team_id_fkey(name),
        away_team:teams!fixtures_away_team_id_fkey(name)
      `)
      .in('status', ['FT', 'AET', 'PEN'])

    if (!fixtures || fixtures.length === 0) {
      addLog('info', 'No completed fixtures found')
      return NextResponse.json({
        success: true,
        imported: 0,
        errors: 0,
        total: 0,
        logs,
      })
    }

    // Check which fixtures already have lineups
    const { data: existingLineups } = await supabase
      .from('lineups')
      .select('fixture_id')

    const existingSet = new Set(existingLineups?.map(l => l.fixture_id) || [])
    const fixturesToProcess = fixtures.filter(f => !existingSet.has(f.id))

    addLog('info', `Found ${fixturesToProcess.length} fixtures needing lineups (${fixtures.length} total completed)`)

    // Build team lookup
    const { data: teams } = await supabase.from('teams').select('id, api_id')
    const teamMap = new Map(teams?.map(t => [t.api_id, t.id]) || [])

    let imported = 0
    let errors = 0

    for (let i = 0; i < fixturesToProcess.length; i++) {
      const fixture = fixturesToProcess[i]
      await delay(300) // Rate limiting

      const matchName = `${(fixture.home_team as any)?.name || 'Home'} vs ${(fixture.away_team as any)?.name || 'Away'}`

      addLog('progress', `Fetching lineups for ${matchName}...`, {
        endpoint: `${ENDPOINTS.lineups.path}?fixture=${fixture.api_id}`,
        recordId: String(fixture.api_id),
        recordName: matchName,
        progress: { current: i + 1, total: fixturesToProcess.length },
      })

      try {
        const data = await fetchLineups(fixture.api_id)

        if (!data.response || data.response.length === 0) {
          addLog('info', `No lineups for ${matchName}`)
          continue
        }

        for (const lineup of data.response) {
          const teamId = teamMap.get(lineup.team?.id)
          if (!teamId) continue

          const { error } = await supabase
            .from('lineups')
            .upsert({
              fixture_id: fixture.id,
              team_id: teamId,
              formation: lineup.formation,
              starting_xi: lineup.startXI?.map((p: any) => ({
                id: p.player?.id,
                name: p.player?.name,
                number: p.player?.number,
                pos: p.player?.pos,
                grid: p.player?.grid,
              })) || [],
              substitutes: lineup.substitutes?.map((p: any) => ({
                id: p.player?.id,
                name: p.player?.name,
                number: p.player?.number,
                pos: p.player?.pos,
              })) || [],
              coach_name: lineup.coach?.name || null,
              coach_id: lineup.coach?.id || null,
            }, { onConflict: 'fixture_id,team_id' })

          if (error) {
            addLog('error', `Error for ${matchName}: ${error.message}`)
            errors++
          } else {
            imported++
          }
        }

        addLog('success', `Imported lineups for ${matchName}`)
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
