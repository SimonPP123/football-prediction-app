import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchHeadToHead, ENDPOINTS } from '@/lib/api-football'

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
    console.log(`[Refresh Head-to-Head] ${message}`)
  }

  try {
    addLog('info', 'Starting head-to-head refresh...')

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

    // Generate all unique pairs
    const pairs: Array<{ team1: typeof teams[0], team2: typeof teams[0] }> = []
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        pairs.push({ team1: teams[i], team2: teams[j] })
      }
    }

    addLog('info', `Found ${pairs.length} unique team pairs to process`)

    let imported = 0
    let errors = 0

    for (let i = 0; i < pairs.length; i++) {
      const { team1, team2 } = pairs[i]
      await delay(300) // Rate limiting

      const pairName = `${team1.name} vs ${team2.name}`

      addLog('progress', `Fetching H2H for ${pairName}...`, {
        endpoint: `${ENDPOINTS.headToHead.path}?h2h=${team1.api_id}-${team2.api_id}&last=10`,
        recordName: pairName,
        progress: { current: i + 1, total: pairs.length },
      })

      try {
        const data = await fetchHeadToHead(team1.api_id, team2.api_id)

        if (!data.response || data.response.length === 0) {
          addLog('info', `No H2H data for ${pairName}`)
          continue
        }

        // Calculate H2H statistics
        let team1Wins = 0
        let team2Wins = 0
        let draws = 0
        let team1Goals = 0
        let team2Goals = 0

        const lastFixtures = data.response.slice(0, 10).map((f: any) => ({
          date: f.fixture?.date,
          homeTeam: f.teams?.home?.name,
          awayTeam: f.teams?.away?.name,
          homeGoals: f.goals?.home,
          awayGoals: f.goals?.away,
          winner: f.teams?.home?.winner ? 'home' : f.teams?.away?.winner ? 'away' : 'draw',
        }))

        for (const fixture of data.response) {
          const homeId = fixture.teams?.home?.id
          const goalsHome = fixture.goals?.home || 0
          const goalsAway = fixture.goals?.away || 0

          if (homeId === team1.api_id) {
            team1Goals += goalsHome
            team2Goals += goalsAway
            if (goalsHome > goalsAway) team1Wins++
            else if (goalsAway > goalsHome) team2Wins++
            else draws++
          } else {
            team2Goals += goalsHome
            team1Goals += goalsAway
            if (goalsHome > goalsAway) team2Wins++
            else if (goalsAway > goalsHome) team1Wins++
            else draws++
          }
        }

        const { error } = await supabase
          .from('head_to_head')
          .upsert({
            team1_id: team1.id,
            team2_id: team2.id,
            matches_played: data.response.length,
            team1_wins: team1Wins,
            team2_wins: team2Wins,
            draws,
            team1_goals: team1Goals,
            team2_goals: team2Goals,
            last_fixtures: lastFixtures,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'team1_id,team2_id' })

        if (error) {
          addLog('error', `Error for ${pairName}: ${error.message}`, {
            recordName: pairName,
            error: error.message,
          })
          errors++
        } else {
          addLog('success', `Updated: ${pairName} (${data.response.length} matches)`, {
            recordName: pairName,
          })
          imported++
        }
      } catch (err) {
        addLog('error', `Failed for ${pairName}: ${err instanceof Error ? err.message : 'Unknown'}`, {
          recordName: pairName,
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
      total: pairs.length,
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
