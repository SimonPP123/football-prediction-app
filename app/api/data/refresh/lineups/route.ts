import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchLineups, ENDPOINTS } from '@/lib/api-football'
import { createSSEStream, wantsStreaming } from '@/lib/utils/streaming'
import { DATE_WINDOWS } from '@/lib/api/fixture-windows'
import { isAdminWithSessionValidation } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Refresh modes for lineups
// - prematch: Only fixtures starting in next 2 hours (lineups available ~1h before)
// - backfill: Completed fixtures in past 7 days missing lineups
// - all: Both upcoming and backfill
type LineupsRefreshMode = 'prematch' | 'backfill' | 'all'

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
function getRefreshMode(request: Request): LineupsRefreshMode {
  const url = new URL(request.url)
  const mode = url.searchParams.get('mode')
  if (mode && ['prematch', 'backfill', 'all'].includes(mode)) {
    return mode as LineupsRefreshMode
  }
  return 'prematch' // Default to pre-match mode (most efficient)
}

export async function POST(request: Request) {
  if (!(await isAdminWithSessionValidation())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const mode = getRefreshMode(request)

  if (wantsStreaming(request)) {
    return handleStreamingRefresh(mode)
  }
  return handleBatchRefresh(mode)
}

async function handleStreamingRefresh(mode: LineupsRefreshMode) {
  const { stream, sendLog, close, closeWithError, headers } = createSSEStream()
  const startTime = Date.now()

  ;(async () => {
    try {
      sendLog({ type: 'info', message: `Starting lineups refresh (${mode} mode)...` })

      const now = new Date()
      let upcomingFixtures: any[] = []
      let completedFixtures: any[] = []

      // Pre-match mode: Only fixtures starting in next 2 hours
      if (mode === 'prematch' || mode === 'all') {
        const preMatchWindow = new Date(now.getTime() + DATE_WINDOWS.LINEUP_HOURS * 60 * 60 * 1000)
        sendLog({ type: 'info', message: `Looking for fixtures starting before ${preMatchWindow.toISOString().split('T')[1].slice(0, 5)}` })

        const { data } = await supabase
          .from('fixtures')
          .select(`
            id, api_id, match_date,
            home_team:teams!fixtures_home_team_id_fkey(name),
            away_team:teams!fixtures_away_team_id_fkey(name)
          `)
          .in('status', ['NS', 'TBD', '1H', '2H', 'HT'])
          .gte('match_date', now.toISOString())
          .lte('match_date', preMatchWindow.toISOString())
          .order('match_date', { ascending: true })

        upcomingFixtures = data || []
      }

      // Backfill mode: Completed fixtures in past 7 days
      if (mode === 'backfill' || mode === 'all') {
        const backfillWindow = new Date(now.getTime() - DATE_WINDOWS.STATS_BACKFILL_DAYS * 24 * 60 * 60 * 1000)
        sendLog({ type: 'info', message: `Looking for completed fixtures since ${backfillWindow.toISOString().split('T')[0]}` })

        const { data } = await supabase
          .from('fixtures')
          .select(`
            id, api_id, match_date,
            home_team:teams!fixtures_home_team_id_fkey(name),
            away_team:teams!fixtures_away_team_id_fkey(name)
          `)
          .in('status', ['FT', 'AET', 'PEN'])
          .gte('match_date', backfillWindow.toISOString())
          .order('match_date', { ascending: false })

        completedFixtures = data || []
      }

      const fixtures = [...upcomingFixtures, ...completedFixtures]

      if (!fixtures || fixtures.length === 0) {
        sendLog({ type: 'info', message: 'No fixtures found in time window' })
        close({ success: true, imported: 0, errors: 0, total: 0, duration: Date.now() - startTime, mode })
        return
      }

      const { data: existingLineups } = await supabase
        .from('lineups')
        .select('fixture_id')

      const existingSet = new Set(existingLineups?.map(l => l.fixture_id) || [])
      const fixturesToProcess = fixtures.filter(f => !existingSet.has(f.id))

      sendLog({ type: 'info', message: `Found ${fixturesToProcess.length} fixtures needing lineups (${upcomingFixtures.length} upcoming, ${completedFixtures.length} completed)` })

      const { data: teams } = await supabase.from('teams').select('id, api_id')
      const teamMap = new Map(teams?.map(t => [t.api_id, t.id]) || [])

      let imported = 0
      let errors = 0

      for (let i = 0; i < fixturesToProcess.length; i++) {
        const fixture = fixturesToProcess[i]
        await delay(300)

        const matchName = `${(fixture.home_team as any)?.name || 'Home'} vs ${(fixture.away_team as any)?.name || 'Away'}`

        sendLog({
          type: 'progress',
          message: `Fetching lineups for ${matchName}...`,
          details: { progress: { current: i + 1, total: fixturesToProcess.length } }
        })

        try {
          const data = await fetchLineups(fixture.api_id)

          if (!data.response || data.response.length === 0) {
            sendLog({ type: 'info', message: `No lineups for ${matchName}` })
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
              errors++
            } else {
              imported++
            }
          }

          sendLog({ type: 'success', message: `Imported lineups for ${matchName}` })
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

async function handleBatchRefresh(mode: LineupsRefreshMode) {
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
    addLog('info', `Starting lineups refresh (${mode} mode)...`)

    const now = new Date()
    let upcomingFixtures: any[] = []
    let completedFixtures: any[] = []

    // Pre-match mode: Only fixtures starting in next 2 hours
    if (mode === 'prematch' || mode === 'all') {
      const preMatchWindow = new Date(now.getTime() + DATE_WINDOWS.LINEUP_HOURS * 60 * 60 * 1000)
      addLog('info', `Looking for fixtures starting before ${preMatchWindow.toISOString().split('T')[1].slice(0, 5)}`)

      const { data } = await supabase
        .from('fixtures')
        .select(`
          id, api_id, match_date,
          home_team:teams!fixtures_home_team_id_fkey(name),
          away_team:teams!fixtures_away_team_id_fkey(name)
        `)
        .in('status', ['NS', 'TBD', '1H', '2H', 'HT'])
        .gte('match_date', now.toISOString())
        .lte('match_date', preMatchWindow.toISOString())
        .order('match_date', { ascending: true })

      upcomingFixtures = data || []
    }

    // Backfill mode: Completed fixtures in past 7 days
    if (mode === 'backfill' || mode === 'all') {
      const backfillWindow = new Date(now.getTime() - DATE_WINDOWS.STATS_BACKFILL_DAYS * 24 * 60 * 60 * 1000)
      addLog('info', `Looking for completed fixtures since ${backfillWindow.toISOString().split('T')[0]}`)

      const { data } = await supabase
        .from('fixtures')
        .select(`
          id, api_id, match_date,
          home_team:teams!fixtures_home_team_id_fkey(name),
          away_team:teams!fixtures_away_team_id_fkey(name)
        `)
        .in('status', ['FT', 'AET', 'PEN'])
        .gte('match_date', backfillWindow.toISOString())
        .order('match_date', { ascending: false })

      completedFixtures = data || []
    }

    const fixtures = [...upcomingFixtures, ...completedFixtures]

    if (!fixtures || fixtures.length === 0) {
      addLog('info', 'No fixtures found in time window')
      return NextResponse.json({
        success: true,
        imported: 0,
        errors: 0,
        total: 0,
        logs,
        mode,
      })
    }

    // Check which fixtures already have lineups
    const { data: existingLineups } = await supabase
      .from('lineups')
      .select('fixture_id')

    const existingSet = new Set(existingLineups?.map(l => l.fixture_id) || [])
    const fixturesToProcess = fixtures.filter(f => !existingSet.has(f.id))

    addLog('info', `Found ${fixturesToProcess.length} fixtures needing lineups (${upcomingFixtures.length} upcoming, ${completedFixtures.length} completed)`)

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
