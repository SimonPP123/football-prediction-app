import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { DataStats, TableStats } from '@/lib/types/data-management'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper to get table stats (count + lastUpdated)
interface TableStatsOptions {
  hasUpdatedAt?: boolean
  updatedAtColumn?: string
  leagueId?: string | null
  hasLeagueId?: boolean
}

async function getTableStats(
  tableName: string,
  options: TableStatsOptions = {}
): Promise<TableStats> {
  const {
    hasUpdatedAt = true,
    updatedAtColumn = 'updated_at',
    leagueId,
    hasLeagueId = false
  } = options

  try {
    if (hasUpdatedAt) {
      let query = supabase
        .from(tableName)
        .select(updatedAtColumn, { count: 'exact', head: false })

      // Filter by league_id if provided and table supports it
      if (leagueId && hasLeagueId) {
        query = query.eq('league_id', leagueId)
      }

      const result = await query
        .order(updatedAtColumn, { ascending: false })
        .limit(1)

      const row = result.data?.[0] as Record<string, unknown> | undefined
      return {
        count: result.count || 0,
        lastUpdated: (row?.[updatedAtColumn] as string) || null,
      }
    } else {
      // Table without updated_at - try created_at
      let query = supabase
        .from(tableName)
        .select('created_at', { count: 'exact', head: false })

      // Filter by league_id if provided and table supports it
      if (leagueId && hasLeagueId) {
        query = query.eq('league_id', leagueId)
      }

      const result = await query
        .order('created_at', { ascending: false })
        .limit(1)

      return {
        count: result.count || 0,
        lastUpdated: result.data?.[0]?.created_at || null,
      }
    }
  } catch (error) {
    console.error(`[Stats] Error fetching ${tableName}:`, error)
    return { count: 0, lastUpdated: null }
  }
}

export async function GET(request: Request) {
  try {
    // Get league_id from query params
    const { searchParams } = new URL(request.url)
    const leagueId = searchParams.get('league_id')

    // Query all 24 tables in parallel
    // Tables with league_id column will be filtered when leagueId is provided
    const [
      // Core Foundation (4)
      leagues,
      venues,
      teams,
      fixtures,
      // Match Data (4)
      fixture_statistics,
      fixture_events,
      lineups,
      standings,
      // Team Intelligence (3)
      team_season_stats,
      injuries,
      head_to_head,
      // Player Data (6)
      players,
      player_squads,
      player_season_stats,
      player_match_stats,
      top_performers,
      coaches,
      // External Data (4)
      odds,
      weather,
      referee_stats,
      transfers,
      // AI Predictions (3)
      predictions,
      prediction_history,
      api_predictions,
    ] = await Promise.all([
      // Core Foundation - leagues/venues are global, teams/fixtures have league_id
      getTableStats('leagues', { hasUpdatedAt: false }),
      getTableStats('venues', { hasUpdatedAt: false }),
      getTableStats('teams', { hasUpdatedAt: false, leagueId, hasLeagueId: true }),
      getTableStats('fixtures', { hasUpdatedAt: true, leagueId, hasLeagueId: true }),
      // Match Data - all have league_id via fixture relationship
      getTableStats('fixture_statistics', { hasUpdatedAt: false, leagueId, hasLeagueId: true }),
      getTableStats('fixture_events', { hasUpdatedAt: false, leagueId, hasLeagueId: true }),
      getTableStats('lineups', { hasUpdatedAt: false, leagueId, hasLeagueId: true }),
      getTableStats('standings', { hasUpdatedAt: true, leagueId, hasLeagueId: true }),
      // Team Intelligence - team_season_stats/injuries have league_id, h2h is global
      getTableStats('team_season_stats', { hasUpdatedAt: true, leagueId, hasLeagueId: true }),
      getTableStats('injuries', { hasUpdatedAt: true, leagueId, hasLeagueId: true }),
      getTableStats('head_to_head', { hasUpdatedAt: true }),
      // Player Data - all are global (players can play in multiple leagues)
      getTableStats('players', { hasUpdatedAt: true }),
      getTableStats('player_squads', { hasUpdatedAt: false }),
      getTableStats('player_season_stats', { hasUpdatedAt: true }),
      getTableStats('player_match_stats', { hasUpdatedAt: false }),
      getTableStats('top_performers', { hasUpdatedAt: true }),
      getTableStats('coaches', { hasUpdatedAt: true }),
      // External Data - odds/weather have league_id, referee/transfers are global
      getTableStats('odds', { hasUpdatedAt: true, leagueId, hasLeagueId: true }),
      getTableStats('weather', { hasUpdatedAt: true, updatedAtColumn: 'fetched_at', leagueId, hasLeagueId: true }),
      getTableStats('referee_stats', { hasUpdatedAt: true }),
      getTableStats('transfers', { hasUpdatedAt: false }),
      // AI Predictions - predictions has league_id, others are global
      getTableStats('predictions', { hasUpdatedAt: true, leagueId, hasLeagueId: true }),
      getTableStats('prediction_history', { hasUpdatedAt: false }),
      getTableStats('api_predictions', { hasUpdatedAt: false }),
    ])

    const stats: DataStats = {
      // Core Foundation
      leagues,
      venues,
      teams,
      fixtures,
      // Match Data
      fixture_statistics,
      fixture_events,
      lineups,
      standings,
      // Team Intelligence
      team_season_stats,
      injuries,
      head_to_head,
      // Player Data
      players,
      player_squads,
      player_season_stats,
      player_match_stats,
      top_performers,
      coaches,
      // External Data
      odds,
      weather,
      referee_stats,
      transfers,
      // AI Predictions
      predictions,
      prediction_history,
      api_predictions,
    }

    // Calculate totals
    const totalRecords = Object.values(stats).reduce((sum, s) => sum + s.count, 0)
    const lastSync = Object.values(stats)
      .map(s => s.lastUpdated)
      .filter(Boolean)
      .sort()
      .reverse()[0] || null

    return NextResponse.json({
      ...stats,
      _summary: {
        totalTables: 24,
        totalRecords,
        lastSync,
      },
    })
  } catch (error) {
    console.error('[API Stats] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
