import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { getLeagueFromRequest } from '@/lib/league-context'
import { getFixtureWindows } from '@/lib/api/fixture-windows'
import { detectCurrentPhase, getPhaseDisplayInfo, MatchPhase } from '@/lib/api/match-phase'
import { isAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RefreshResult {
  endpoint: string
  success: boolean
  duration: number
  details?: any
  error?: string
}

/**
 * Execute a single refresh endpoint
 */
async function executeRefresh(
  endpoint: string,
  leagueId: string,
  baseUrl: string
): Promise<RefreshResult> {
  const startTime = Date.now()

  // Map endpoint names to actual routes
  const endpointMap: Record<string, { route: string; mode?: string }> = {
    'fixtures': { route: 'fixtures', mode: 'smart' },
    'lineups': { route: 'lineups', mode: 'prematch' },
    'statistics': { route: 'fixture-statistics', mode: 'smart' },
    'events': { route: 'fixture-events', mode: 'smart' },
    'standings': { route: 'standings' },
    'injuries': { route: 'injuries' },
    'odds': { route: 'odds' },
    'weather': { route: 'weather' },
    'team-stats': { route: 'team-stats' },
    'live-scores': { route: 'fixtures', mode: 'smart' }, // Live uses same route
    'h2h': { route: 'h2h' },
  }

  const config = endpointMap[endpoint]
  if (!config) {
    return {
      endpoint,
      success: false,
      duration: Date.now() - startTime,
      error: `Unknown endpoint: ${endpoint}`,
    }
  }

  try {
    const url = new URL(`${baseUrl}/api/data/refresh/${config.route}`)
    url.searchParams.set('league_id', leagueId)
    if (config.mode) {
      url.searchParams.set('mode', config.mode)
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies().toString(),
      },
    })

    const result = await response.json()

    return {
      endpoint,
      success: result.success !== false,
      duration: Date.now() - startTime,
      details: {
        inserted: result.inserted,
        updated: result.updated,
        imported: result.imported,
        errors: result.errors,
      },
    }
  } catch (error) {
    return {
      endpoint,
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Smart Refresh Orchestrator
 *
 * Single endpoint that detects the current match phase and refreshes
 * the appropriate data sources automatically.
 *
 * Query params:
 * - league_id: Target league (defaults to Premier League)
 * - dry_run: If true, only returns recommendations without executing
 * - include_optional: If true, also executes optional refreshes
 */
export async function POST(request: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const startTime = Date.now()
  const url = new URL(request.url)
  const dryRun = url.searchParams.get('dry_run') === 'true'
  const includeOptional = url.searchParams.get('include_optional') === 'true'

  try {
    // Get league context
    const league = await getLeagueFromRequest(request)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    // Get fixtures in the active window
    const windows = getFixtureWindows()
    const { data: fixtures } = await supabase
      .from('fixtures')
      .select('id, api_id, match_date, status, goals_home, goals_away, home_team_id, away_team_id')
      .eq('league_id', league.id)
      .gte('match_date', windows.recent.toISOString())
      .lte('match_date', windows.upcomingEnd.toISOString())
      .order('match_date', { ascending: true })

    // Detect current phase
    const phaseResult = detectCurrentPhase(fixtures || [])
    const displayInfo = getPhaseDisplayInfo(phaseResult)

    // If dry run, just return recommendations
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        league: league.name,
        phase: phaseResult.phase,
        display: displayInfo,
        recommendation: phaseResult.recommendation,
        fixturesInWindow: fixtures?.length || 0,
        nextMatch: phaseResult.nextMatch
          ? {
              id: phaseResult.nextMatch.id,
              matchDate: phaseResult.nextMatch.match_date,
              hoursUntil: phaseResult.hoursUntilNext,
            }
          : null,
      })
    }

    // Execute required refreshes
    const results: RefreshResult[] = []
    const endpointsToRefresh = [
      ...phaseResult.recommendation.required,
      ...(includeOptional ? phaseResult.recommendation.optional : []),
    ]

    for (const endpoint of endpointsToRefresh) {
      const result = await executeRefresh(endpoint, league.id, baseUrl)
      results.push(result)

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    const duration = Date.now() - startTime
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return NextResponse.json({
      success: failed === 0,
      league: league.name,
      phase: phaseResult.phase,
      display: displayInfo,
      refreshed: endpointsToRefresh,
      skipped: phaseResult.recommendation.skip,
      results,
      summary: {
        total: endpointsToRefresh.length,
        successful,
        failed,
        duration,
      },
      nextCheckMinutes: phaseResult.recommendation.nextCheckMinutes,
    })
  } catch (error) {
    console.error('Smart refresh error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for checking current phase without refreshing
 */
export async function GET(request: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const league = await getLeagueFromRequest(request)

    // Get fixtures in the active window
    const windows = getFixtureWindows()
    const { data: fixtures } = await supabase
      .from('fixtures')
      .select('id, api_id, match_date, status, goals_home, goals_away, home_team_id, away_team_id')
      .eq('league_id', league.id)
      .gte('match_date', windows.recent.toISOString())
      .lte('match_date', windows.upcomingEnd.toISOString())
      .order('match_date', { ascending: true })

    // Detect current phase
    const phaseResult = detectCurrentPhase(fixtures || [])
    const displayInfo = getPhaseDisplayInfo(phaseResult)

    return NextResponse.json({
      league: league.name,
      phase: phaseResult.phase,
      display: displayInfo,
      recommendation: phaseResult.recommendation,
      fixturesInWindow: fixtures?.length || 0,
      liveMatches: phaseResult.liveMatches,
      upcomingToday: phaseResult.upcomingToday,
      recentlyCompleted: phaseResult.recentlyCompleted,
      nextMatch: phaseResult.nextMatch
        ? {
            id: phaseResult.nextMatch.id,
            matchDate: phaseResult.nextMatch.match_date,
            hoursUntil: phaseResult.hoursUntilNext,
          }
        : null,
    })
  } catch (error) {
    console.error('Phase detection error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
