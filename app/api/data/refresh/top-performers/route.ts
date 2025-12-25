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
    console.log(`[Refresh Top Performers] ${message}`)
  }

  try {
    addLog('info', 'Starting top performers refresh...')

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

    // Build player lookup
    const { data: players } = await supabase.from('players').select('id, api_id')
    const playerMap = new Map(players?.map(p => [p.api_id, p.id]) || [])

    let imported = 0
    let errors = 0

    // Fetch each category
    const categories = [
      { name: 'goals', fetch: fetchTopScorers, endpoint: ENDPOINTS.topScorers.url },
      { name: 'assists', fetch: fetchTopAssists, endpoint: ENDPOINTS.topAssists.url },
      { name: 'yellow_cards', fetch: fetchTopYellowCards, endpoint: ENDPOINTS.topYellowCards.url },
      { name: 'red_cards', fetch: fetchTopRedCards, endpoint: ENDPOINTS.topRedCards.url },
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
              season: SEASON,
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
