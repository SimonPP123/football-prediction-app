import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchPlayers, LEAGUE_ID, SEASON, ENDPOINTS } from '@/lib/api-football'

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
    console.log(`[Refresh Player Stats] ${message}`)
  }

  try {
    addLog('info', 'Starting player season stats refresh...')

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

    let playersImported = 0
    let statsImported = 0
    let errors = 0
    let page = 1
    let totalPages = 1

    const processPage = async (data: any) => {
      if (!data.response) return

      for (const item of data.response) {
        const player = item.player
        const stats = item.statistics?.[0]

        if (!stats) continue

        const teamId = teamMap.get(stats.team?.id)

        // Upsert player
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .upsert({
            api_id: player.id,
            name: player.name,
            firstname: player.firstname,
            lastname: player.lastname,
            age: player.age,
            birth_date: player.birth?.date,
            birth_place: player.birth?.place,
            birth_country: player.birth?.country,
            nationality: player.nationality,
            height: player.height,
            weight: player.weight,
            photo: player.photo,
            injured: player.injured,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'api_id' })
          .select('id')
          .single()

        if (playerError) {
          errors++
          continue
        }

        playersImported++

        // Upsert player season stats
        const { error: statsError } = await supabase
          .from('player_season_stats')
          .upsert({
            player_id: playerData.id,
            team_id: teamId || null,
            league_id: leagueData.id,
            season: SEASON,
            position: stats.games?.position,
            appearances: stats.games?.appearences || 0,
            lineups: stats.games?.lineups || 0,
            minutes: stats.games?.minutes || 0,
            rating: stats.games?.rating ? parseFloat(stats.games.rating) : null,
            goals: stats.goals?.total || 0,
            assists: stats.goals?.assists || 0,
            saves: stats.goals?.saves || 0,
            tackles: stats.tackles?.total || 0,
            duels_total: stats.duels?.total || 0,
            duels_won: stats.duels?.won || 0,
            dribbles_attempts: stats.dribbles?.attempts || 0,
            dribbles_success: stats.dribbles?.success || 0,
            fouls_drawn: stats.fouls?.drawn || 0,
            fouls_committed: stats.fouls?.committed || 0,
            yellow_cards: stats.cards?.yellow || 0,
            yellowred_cards: stats.cards?.yellowred || 0,
            red_cards: stats.cards?.red || 0,
            penalties_won: stats.penalty?.won || 0,
            penalties_committed: stats.penalty?.commited || 0,
            penalties_scored: stats.penalty?.scored || 0,
            penalties_missed: stats.penalty?.missed || 0,
            penalties_saved: stats.penalty?.saved || 0,
            passes_total: stats.passes?.total || 0,
            passes_key: stats.passes?.key || 0,
            passes_accuracy: stats.passes?.accuracy || 0,
            shots_total: stats.shots?.total || 0,
            shots_on: stats.shots?.on || 0,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'player_id,team_id,league_id,season' })

        if (statsError) {
          errors++
        } else {
          statsImported++
        }
      }
    }

    // First call to get total pages
    addLog('info', `Fetching page 1...`, {
      endpoint: `${ENDPOINTS.players.path}?league=${LEAGUE_ID}&season=${SEASON}&page=1`,
    })

    const firstPage = await fetchPlayers(1)
    totalPages = firstPage.paging?.total || 1

    addLog('info', `Found ${totalPages} pages of player data`)

    // Process first page
    await processPage(firstPage)
    page++

    // Process remaining pages
    while (page <= totalPages) {
      await delay(400) // Rate limiting

      addLog('progress', `Fetching page ${page}/${totalPages}...`, {
        endpoint: `${ENDPOINTS.players.path}?league=${LEAGUE_ID}&season=${SEASON}&page=${page}`,
        progress: { current: page, total: totalPages },
      })

      try {
        const data = await fetchPlayers(page)
        await processPage(data)
      } catch (err) {
        addLog('error', `Failed page ${page}: ${err instanceof Error ? err.message : 'Unknown'}`)
        errors++
      }

      page++
    }

    const duration = Date.now() - startTime
    addLog('success', `Completed: ${playersImported} players, ${statsImported} stats imported, ${errors} errors (${(duration / 1000).toFixed(1)}s)`)

    return NextResponse.json({
      success: true,
      imported: statsImported,
      playersImported,
      errors,
      total: totalPages,
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
