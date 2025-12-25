import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchAllFixtures, LEAGUE_ID, SEASON } from '@/lib/api-football'

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
    console.log(`[Refresh Fixtures] ${message}`)
  }

  try {
    addLog('info', 'Fetching fixtures from API-Football...')

    // Fetch all fixtures from API-Football
    const data = await fetchAllFixtures()

    if (!data.response || data.response.length === 0) {
      addLog('error', 'No fixtures returned from API')
      return NextResponse.json({
        success: false,
        error: 'No fixtures returned from API',
        logs,
      }, { status: 400 })
    }

    addLog('info', `Received ${data.response.length} fixtures from API`)

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
      }, { status: 400 })
    }

    // Build team lookup
    const { data: teams } = await supabase.from('teams').select('id, api_id')
    const teamMap = new Map(teams?.map(t => [t.api_id, t.id]) || [])
    addLog('info', `Loaded ${teams?.length || 0} teams for mapping`)

    // Build venue lookup
    const { data: venues } = await supabase.from('venues').select('id, api_id')
    const venueMap = new Map(venues?.map(v => [v.api_id, v.id]) || [])

    let imported = 0
    let errors = 0

    addLog('info', 'Processing fixtures...')

    for (const item of data.response) {
      const fixture = item.fixture
      const league = item.league
      const teams_data = item.teams
      const goals = item.goals
      const score = item.score

      const homeTeamId = teamMap.get(teams_data.home.id)
      const awayTeamId = teamMap.get(teams_data.away.id)

      if (!homeTeamId || !awayTeamId) {
        errors++
        continue
      }

      const { error } = await supabase
        .from('fixtures')
        .upsert({
          api_id: fixture.id,
          league_id: leagueData.id,
          season: SEASON,
          round: league.round,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          match_date: fixture.date,
          venue_id: venueMap.get(fixture.venue?.id) || null,
          referee: fixture.referee,
          status: fixture.status.short,
          goals_home: goals.home,
          goals_away: goals.away,
          score_halftime: score.halftime,
          score_fulltime: score.fulltime,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'api_id' })

      if (error) {
        errors++
      } else {
        imported++
      }
    }

    addLog('success', `Completed: ${imported} imported, ${errors} errors`)

    return NextResponse.json({
      success: true,
      imported,
      errors,
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
