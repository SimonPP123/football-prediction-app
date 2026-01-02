import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  fetchTopScorers,
  fetchTopAssists,
  fetchTopYellowCards,
  fetchTopRedCards,
  LEAGUE_ID,
  SEASON,
  ENDPOINTS,
} from '@/lib/api-football'
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
      sendLog({ type: 'info', message: 'Starting top performers refresh...' })

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

      const { data: players } = await supabase.from('players').select('id, api_id')
      const playerMap = new Map(players?.map(p => [p.api_id, p.id]) || [])

      let imported = 0
      let errors = 0

      const categories = [
        { name: 'goals', fetch: () => fetchTopScorers(leagueApiId, leagueSeason) },
        { name: 'assists', fetch: () => fetchTopAssists(leagueApiId, leagueSeason) },
        { name: 'yellow_cards', fetch: () => fetchTopYellowCards(leagueApiId, leagueSeason) },
        { name: 'red_cards', fetch: () => fetchTopRedCards(leagueApiId, leagueSeason) },
      ]

      for (let c = 0; c < categories.length; c++) {
        const category = categories[c]
        sendLog({
          type: 'progress',
          message: `Fetching ${category.name}...`,
          details: { progress: { current: c + 1, total: categories.length } }
        })
        await delay(300)

        try {
          const data = await category.fetch()

          if (!data.response || data.response.length === 0) {
            sendLog({ type: 'warning', message: `No data for ${category.name}` })
            continue
          }

          for (let i = 0; i < data.response.length; i++) {
            const item = data.response[i]
            const player = item.player
            const stats = item.statistics?.[0]

            if (!stats) continue

            const teamId = teamMap.get(stats.team?.id)
            const playerId = playerMap.get(player.id)

            let value = 0
            if (category.name === 'goals') value = stats.goals?.total || 0
            else if (category.name === 'assists') value = stats.goals?.assists || 0
            else if (category.name === 'yellow_cards') value = stats.cards?.yellow || 0
            else if (category.name === 'red_cards') value = stats.cards?.red || 0

            const { error } = await supabase
              .from('top_performers')
              .upsert({
                league_id: leagueData.id,
                season: leagueSeason,
                category: category.name,
                rank: i + 1,
                player_api_id: player.id,
                player_id: playerId || null,
                player_name: player.name,
                player_photo: player.photo,
                team_api_id: stats.team?.id || null,
                team_id: teamId || null,
                team_name: stats.team?.name || null,
                team_logo: stats.team?.logo || null,
                value,
                appearances: stats.games?.appearences || 0,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'league_id,season,category,player_api_id' })

            if (error) {
              errors++
            } else {
              imported++
            }
          }

          sendLog({ type: 'success', message: `${category.name}: ${data.response.length} processed` })
        } catch (err) {
          sendLog({ type: 'error', message: `Failed to fetch ${category.name}` })
          errors++
        }
      }

      const duration = Date.now() - startTime
      sendLog({ type: 'success', message: `Completed: ${imported} imported, ${errors} errors (${(duration / 1000).toFixed(1)}s)` })
      close({ success: true, imported, errors, total: imported + errors, duration })
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
    console.log(`[Refresh Top Performers] ${message}`)
  }

  try {
    addLog('info', 'Starting top performers refresh...')

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

    // Build player lookup
    const { data: players } = await supabase.from('players').select('id, api_id')
    const playerMap = new Map(players?.map(p => [p.api_id, p.id]) || [])

    let imported = 0
    let errors = 0

    // Fetch each category
    const categories = [
      { name: 'goals', fetch: () => fetchTopScorers(leagueApiId, leagueSeason), endpoint: ENDPOINTS.topScorers.url },
      { name: 'assists', fetch: () => fetchTopAssists(leagueApiId, leagueSeason), endpoint: ENDPOINTS.topAssists.url },
      { name: 'yellow_cards', fetch: () => fetchTopYellowCards(leagueApiId, leagueSeason), endpoint: ENDPOINTS.topYellowCards.url },
      { name: 'red_cards', fetch: () => fetchTopRedCards(leagueApiId, leagueSeason), endpoint: ENDPOINTS.topRedCards.url },
    ]

    for (const category of categories) {
      addLog('info', `Fetching ${category.name}...`, { endpoint: category.endpoint })
      await delay(300) // Rate limiting

      try {
        const data = await category.fetch()

        if (!data.response || data.response.length === 0) {
          addLog('warning', `No data for ${category.name}`)
          continue
        }

        addLog('info', `Processing ${data.response.length} ${category.name} entries`)

        for (let i = 0; i < data.response.length; i++) {
          const item = data.response[i]
          const player = item.player
          const stats = item.statistics?.[0]

          if (!stats) continue

          const teamId = teamMap.get(stats.team?.id)
          const playerId = playerMap.get(player.id)

          // Determine value based on category
          let value = 0
          if (category.name === 'goals') value = stats.goals?.total || 0
          else if (category.name === 'assists') value = stats.goals?.assists || 0
          else if (category.name === 'yellow_cards') value = stats.cards?.yellow || 0
          else if (category.name === 'red_cards') value = stats.cards?.red || 0

          const { error } = await supabase
            .from('top_performers')
            .upsert({
              league_id: leagueData.id,
              season: leagueSeason,
              category: category.name,
              rank: i + 1,
              player_api_id: player.id,
              player_id: playerId || null,
              player_name: player.name,
              player_photo: player.photo,
              team_api_id: stats.team?.id || null,
              team_id: teamId || null,
              team_name: stats.team?.name || null,
              team_logo: stats.team?.logo || null,
              value,
              appearances: stats.games?.appearences || 0,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'league_id,season,category,player_api_id' })

          if (error) {
            addLog('error', `Error for ${player.name}: ${error.message}`, {
              recordName: player.name,
              error: error.message,
            })
            errors++
          } else {
            imported++
          }
        }

        addLog('success', `${category.name}: ${data.response.length} processed`)
      } catch (err) {
        addLog('error', `Failed to fetch ${category.name}: ${err instanceof Error ? err.message : 'Unknown'}`)
        errors++
      }
    }

    const duration = Date.now() - startTime
    addLog('success', `Completed: ${imported} imported, ${errors} errors (${(duration / 1000).toFixed(1)}s)`)

    return NextResponse.json({
      success: true,
      imported,
      errors,
      total: imported + errors,
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
