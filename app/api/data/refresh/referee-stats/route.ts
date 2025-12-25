import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface LogEntry {
  type: 'info' | 'success' | 'error' | 'warning' | 'progress'
  message: string
  details?: {
    recordName?: string
    progress?: { current: number; total: number }
    error?: string
  }
}

export async function POST() {
  const logs: LogEntry[] = []
  const startTime = Date.now()

  const addLog = (type: LogEntry['type'], message: string, details?: LogEntry['details']) => {
    logs.push({ type, message, details })
    console.log(`[Refresh Referee Stats] ${message}`)
  }

  try {
    addLog('info', 'Starting referee stats computation from fixture data...')

    // Get all completed fixtures with referee info
    const { data: fixtures } = await supabase
      .from('fixtures')
      .select('id, referee, goals_home, goals_away, status')
      .not('referee', 'is', null)
      .in('status', ['FT', 'AET', 'PEN'])

    if (!fixtures || fixtures.length === 0) {
      addLog('info', 'No completed fixtures with referee data found')
      return NextResponse.json({
        success: true,
        imported: 0,
        errors: 0,
        total: 0,
        logs,
      })
    }

    addLog('info', `Found ${fixtures.length} completed fixtures with referee data`)

    // Get fixture events (cards) for these fixtures
    const fixtureIds = fixtures.map(f => f.id)
    const { data: events } = await supabase
      .from('fixture_events')
      .select('fixture_id, type, detail')
      .in('fixture_id', fixtureIds)

    // Group fixtures by referee
    const refereeData: Record<string, {
      matches: number
      yellowCards: number
      redCards: number
      fouls: number
      penalties: number
      homeWins: number
      awayWins: number
      draws: number
    }> = {}

    // Process fixtures
    for (const fixture of fixtures) {
      const refName = fixture.referee?.trim()
      if (!refName) continue

      if (!refereeData[refName]) {
        refereeData[refName] = {
          matches: 0,
          yellowCards: 0,
          redCards: 0,
          fouls: 0,
          penalties: 0,
          homeWins: 0,
          awayWins: 0,
          draws: 0,
        }
      }

      refereeData[refName].matches++

      // Determine result
      const homeGoals = fixture.goals_home ?? 0
      const awayGoals = fixture.goals_away ?? 0
      if (homeGoals > awayGoals) {
        refereeData[refName].homeWins++
      } else if (awayGoals > homeGoals) {
        refereeData[refName].awayWins++
      } else {
        refereeData[refName].draws++
      }

      // Count cards and penalties from events
      const fixtureEvents = events?.filter(e => e.fixture_id === fixture.id) || []
      for (const event of fixtureEvents) {
        if (event.type === 'Card') {
          if (event.detail === 'Yellow Card') {
            refereeData[refName].yellowCards++
          } else if (event.detail === 'Red Card' || event.detail === 'Second Yellow card') {
            refereeData[refName].redCards++
          }
        } else if (event.type === 'Goal' && event.detail === 'Penalty') {
          refereeData[refName].penalties++
        }
      }
    }

    const referees = Object.keys(refereeData)
    addLog('info', `Processing ${referees.length} unique referees...`)

    let imported = 0
    let errors = 0

    for (let i = 0; i < referees.length; i++) {
      const refName = referees[i]
      const data = refereeData[refName]

      addLog('progress', `Computing stats for ${refName}...`, {
        recordName: refName,
        progress: { current: i + 1, total: referees.length },
      })

      const totalMatches = data.matches
      const avgYellow = totalMatches > 0 ? data.yellowCards / totalMatches : 0
      const avgRed = totalMatches > 0 ? data.redCards / totalMatches : 0
      const penaltiesPerMatch = totalMatches > 0 ? data.penalties / totalMatches : 0
      const homeWinPct = totalMatches > 0 ? (data.homeWins / totalMatches) * 100 : 0
      const awayWinPct = totalMatches > 0 ? (data.awayWins / totalMatches) * 100 : 0
      const drawPct = totalMatches > 0 ? (data.draws / totalMatches) * 100 : 0

      const { error } = await supabase
        .from('referee_stats')
        .upsert({
          name: refName,
          matches_refereed: totalMatches,
          avg_yellow_cards: avgYellow,
          avg_red_cards: avgRed,
          avg_fouls: null, // Not available from fixture_events
          penalties_per_match: penaltiesPerMatch,
          home_win_pct: homeWinPct,
          away_win_pct: awayWinPct,
          draw_pct: drawPct,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'name' })

      if (error) {
        addLog('error', `Error for ${refName}: ${error.message}`)
        errors++
      } else {
        addLog('success', `${refName}: ${totalMatches} matches, ${avgYellow.toFixed(1)} yellow/match`)
        imported++
      }
    }

    const duration = Date.now() - startTime
    addLog('success', `Completed: ${imported} referees updated, ${errors} errors (${(duration / 1000).toFixed(1)}s)`)

    return NextResponse.json({
      success: true,
      imported,
      errors,
      total: referees.length,
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
