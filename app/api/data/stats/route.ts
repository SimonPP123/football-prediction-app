import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { DataStats, TableStats } from '@/lib/types/data-management'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper to get table stats (count + lastUpdated)
async function getTableStats(
  tableName: string,
  hasUpdatedAt: boolean = true,
  updatedAtColumn: string = 'updated_at'
): Promise<TableStats> {
  try {
    if (hasUpdatedAt) {
      const result = await supabase
        .from(tableName)
        .select(updatedAtColumn, { count: 'exact', head: false })
        .order(updatedAtColumn, { ascending: false })
        .limit(1)

      const row = result.data?.[0] as Record<string, unknown> | undefined
      return {
        count: result.count || 0,
        lastUpdated: (row?.[updatedAtColumn] as string) || null,
      }
    } else {
      // Table without updated_at - try created_at
      const result = await supabase
        .from(tableName)
        .select('created_at', { count: 'exact', head: false })
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

export async function GET() {
  try {
    // Query all 24 tables in parallel
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
      // Core Foundation
      getTableStats('leagues', false),
      getTableStats('venues', false),
      getTableStats('teams', false),
      getTableStats('fixtures', true),
      // Match Data
      getTableStats('fixture_statistics', false),
      getTableStats('fixture_events', false),
      getTableStats('lineups', false),
      getTableStats('standings', true),
      // Team Intelligence
      getTableStats('team_season_stats', true),
      getTableStats('injuries', true),
      getTableStats('head_to_head', true),
      // Player Data
      getTableStats('players', true),
      getTableStats('player_squads', false),
      getTableStats('player_season_stats', true),
      getTableStats('player_match_stats', false),
      getTableStats('top_performers', true),
      getTableStats('coaches', true),
      // External Data
      getTableStats('odds', true),
      getTableStats('weather', true, 'fetched_at'),
      getTableStats('referee_stats', true),
      getTableStats('transfers', false),
      // AI Predictions
      getTableStats('predictions', true),
      getTableStats('prediction_history', false),
      getTableStats('api_predictions', false),
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
