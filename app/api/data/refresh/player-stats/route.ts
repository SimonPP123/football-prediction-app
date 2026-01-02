import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchPlayers, LEAGUE_ID, SEASON, ENDPOINTS } from '@/lib/api-football'
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

  // Get league_id from query params for multi-league support
  const { searchParams } = new URL(request.url)
  const leagueIdParam = searchParams.get('league_id')

  if (wantsStreaming(request)) {
    return handleStreamingRefresh(leagueIdParam)
  }
  return handleBatchRefresh(leagueIdParam)
}

async function handleStreamingRefresh(leagueIdParam: string | null) {
  const { stream, sendLog, close, closeWithError, headers } = createSSEStream()
  const startTime = Date.now()

  ;(async () => {
    try {
      sendLog({ type: 'info', message: 'Starting player season stats refresh...' })

      // Look up league - by UUID if provided, otherwise by default LEAGUE_ID
      let leagueData: { id: string; api_id: number; current_season: number } | null = null
      if (leagueIdParam) {
        const { data } = await supabase
          .from('leagues')
          .select('id, api_id, current_season')
          .eq('id', leagueIdParam)
          .single()
        leagueData = data
      } else {
        const { data } = await supabase
          .from('leagues')
          .select('id, api_id, current_season')
          .eq('api_id', LEAGUE_ID)
          .single()
        leagueData = data
      }

      if (!leagueData) {
        sendLog({ type: 'error', message: 'League not found in database' })
        closeWithError('League not found in database', Date.now() - startTime)
        return
      }

      const leagueApiId = leagueData.api_id
      const leagueSeason = leagueData.current_season || SEASON
      sendLog({ type: 'info', message: `Fetching for league API ID: ${leagueApiId}, season: ${leagueSeason}` })

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

          const { error: statsError } = await supabase
            .from('player_season_stats')
            .upsert({
              player_id: playerData.id,
              team_id: teamId || null,
              league_id: leagueData.id,
              season: leagueSeason,
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

      sendLog({ type: 'info', message: 'Fetching page 1...' })

      const firstPage = await fetchPlayers(1, leagueApiId, leagueSeason)
      totalPages = firstPage.paging?.total || 1

      sendLog({ type: 'info', message: `Found ${totalPages} pages of player data` })

      await processPage(firstPage)
      page++

      while (page <= totalPages) {
        await delay(400)

        sendLog({
          type: 'progress',
          message: `Fetching page ${page}/${totalPages}...`,
          details: { progress: { current: page, total: totalPages } }
        })

        try {
          const data = await fetchPlayers(page, leagueApiId, leagueSeason)
          await processPage(data)
        } catch (err) {
          sendLog({ type: 'error', message: `Failed page ${page}: ${err instanceof Error ? err.message : 'Unknown'}` })
          errors++
        }

        page++
      }

      const duration = Date.now() - startTime
      sendLog({ type: 'success', message: `Completed: ${playersImported} players, ${statsImported} stats imported, ${errors} errors (${(duration / 1000).toFixed(1)}s)` })
      close({ success: true, imported: statsImported, errors, total: totalPages, duration })
    } catch (error) {
      const duration = Date.now() - startTime
      sendLog({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' })
      closeWithError(error instanceof Error ? error.message : 'Unknown error', duration)
    }
  })()

  return new Response(stream, { headers })
}

async function handleBatchRefresh(leagueIdParam: string | null) {
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

    // Look up league - by UUID if provided, otherwise by default LEAGUE_ID
    let leagueData: { id: string; api_id: number; current_season: number } | null = null
    if (leagueIdParam) {
      const { data } = await supabase
        .from('leagues')
        .select('id, api_id, current_season')
        .eq('id', leagueIdParam)
        .single()
      leagueData = data
    } else {
      const { data } = await supabase
        .from('leagues')
        .select('id, api_id, current_season')
        .eq('api_id', LEAGUE_ID)
        .single()
      leagueData = data
    }

    if (!leagueData) {
      addLog('error', 'League not found in database')
      return NextResponse.json({
        success: false,
        error: 'League not found in database',
        logs,
      }, { status: 400 })
    }

    const leagueApiId = leagueData.api_id
    const leagueSeason = leagueData.current_season || SEASON
    addLog('info', `Fetching for league API ID: ${leagueApiId}, season: ${leagueSeason}`)

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
            season: leagueSeason,
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
      endpoint: `${ENDPOINTS.players.path}?league=${leagueApiId}&season=${leagueSeason}&page=1`,
    })

    const firstPage = await fetchPlayers(1, leagueApiId, leagueSeason)
    totalPages = firstPage.paging?.total || 1

    addLog('info', `Found ${totalPages} pages of player data`)

    // Process first page
    await processPage(firstPage)
    page++

    // Process remaining pages
    while (page <= totalPages) {
      await delay(400) // Rate limiting

      addLog('progress', `Fetching page ${page}/${totalPages}...`, {
        endpoint: `${ENDPOINTS.players.path}?league=${leagueApiId}&season=${leagueSeason}&page=${page}`,
        progress: { current: page, total: totalPages },
      })

      try {
        const data = await fetchPlayers(page, leagueApiId, leagueSeason)
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
