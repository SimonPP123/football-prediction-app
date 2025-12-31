import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { getLeagueFromRequest } from '@/lib/league-context'
import { getFixtureWindows, DATE_WINDOWS, MATCH_STATUS } from '@/lib/api/fixture-windows'
import { detectCurrentPhase, getPhaseDisplayInfo } from '@/lib/api/match-phase'

export const dynamic = 'force-dynamic'

function isAdmin(): boolean {
  const cookieStore = cookies()
  const authCookie = cookieStore.get('football_auth')?.value
  if (!authCookie) return false
  try {
    const authData = JSON.parse(authCookie)
    return authData.isAdmin === true
  } catch {
    return false
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface DataSourceStatus {
  name: string
  displayName: string
  lastRefresh: string | null
  recordCount: number
  needsRefresh: boolean
  status: 'fresh' | 'stale' | 'missing' | 'ok'
  reason?: string
}

interface FixtureStats {
  total: number
  completed: number
  upcoming: number
  live: number
  missingStats: number
  missingEvents: number
  missingLineups: number
}

/**
 * Get comprehensive data status for a league
 */
export async function GET(request: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const league = await getLeagueFromRequest(request)
    const windows = getFixtureWindows()
    const now = new Date()

    // Get fixtures with related data for analysis
    const { data: fixtures } = await supabase
      .from('fixtures')
      .select(`
        id, api_id, match_date, status, updated_at,
        home_team_id, away_team_id
      `)
      .eq('league_id', league.id)
      .order('match_date', { ascending: false })

    // Get fixture IDs for this league
    const fixtureIds = fixtures?.map(f => f.id) || []

    // Run parallel queries for efficiency
    const [
      statsResult,
      eventsResult,
      lineupsResult,
      teamsResult,
      standingsResult,
      injuriesResult,
      oddsResult,
      predictionsResult,
    ] = await Promise.all([
      // Fixture statistics
      supabase
        .from('fixture_statistics')
        .select('fixture_id, updated_at')
        .in('fixture_id', fixtureIds.slice(0, 500)),

      // Fixture events
      supabase
        .from('fixture_events')
        .select('fixture_id')
        .in('fixture_id', fixtureIds.slice(0, 500)),

      // Lineups
      supabase
        .from('lineups')
        .select('fixture_id, updated_at')
        .in('fixture_id', fixtureIds.slice(0, 500)),

      // Teams
      supabase
        .from('teams')
        .select('id, updated_at')
        .eq('league_id', league.id),

      // Standings
      supabase
        .from('standings')
        .select('updated_at')
        .eq('league_id', league.id)
        .order('updated_at', { ascending: false })
        .limit(1),

      // Injuries
      supabase
        .from('injuries')
        .select('id, updated_at')
        .eq('league_id', league.id)
        .order('updated_at', { ascending: false })
        .limit(1),

      // Odds
      supabase
        .from('odds')
        .select('fixture_id, updated_at')
        .in('fixture_id', fixtureIds.slice(0, 100))
        .order('updated_at', { ascending: false })
        .limit(1),

      // Predictions
      supabase
        .from('predictions')
        .select('fixture_id, created_at')
        .in('fixture_id', fixtureIds.slice(0, 100)),
    ])

    // Calculate fixture stats
    const completedFixtures = fixtures?.filter(f =>
      MATCH_STATUS.COMPLETED.includes(f.status as any)
    ) || []
    const upcomingFixtures = fixtures?.filter(f =>
      MATCH_STATUS.NOT_STARTED.includes(f.status as any) &&
      new Date(f.match_date) > now
    ) || []
    const liveFixtures = fixtures?.filter(f =>
      MATCH_STATUS.LIVE.includes(f.status as any)
    ) || []

    // Find fixtures missing data
    const statsSet = new Set(statsResult.data?.map(s => s.fixture_id) || [])
    const eventsSet = new Set(eventsResult.data?.map(e => e.fixture_id) || [])
    const lineupsSet = new Set(lineupsResult.data?.map(l => l.fixture_id) || [])

    const recentCompleted = completedFixtures.filter(f =>
      new Date(f.match_date) >= windows.recent
    )

    const missingStats = recentCompleted.filter(f => !statsSet.has(f.id)).length
    const missingEvents = recentCompleted.filter(f => !eventsSet.has(f.id)).length
    const missingLineups = recentCompleted.filter(f => !lineupsSet.has(f.id)).length

    // Fixture stats summary
    const fixtureStats: FixtureStats = {
      total: fixtures?.length || 0,
      completed: completedFixtures.length,
      upcoming: upcomingFixtures.length,
      live: liveFixtures.length,
      missingStats,
      missingEvents,
      missingLineups,
    }

    // Build data source statuses
    const dataSources: DataSourceStatus[] = [
      {
        name: 'fixtures',
        displayName: 'Fixtures',
        lastRefresh: fixtures?.[0]?.updated_at || null,
        recordCount: fixtures?.length || 0,
        needsRefresh: false,
        status: fixtures?.length ? 'ok' : 'missing',
      },
      {
        name: 'teams',
        displayName: 'Teams',
        lastRefresh: teamsResult.data?.[0]?.updated_at || null,
        recordCount: teamsResult.data?.length || 0,
        needsRefresh: false,
        status: teamsResult.data?.length ? 'ok' : 'missing',
      },
      {
        name: 'standings',
        displayName: 'Standings',
        lastRefresh: standingsResult.data?.[0]?.updated_at || null,
        recordCount: standingsResult.data?.length || 0,
        needsRefresh: isStale(standingsResult.data?.[0]?.updated_at, 24),
        status: getRefreshStatus(standingsResult.data?.[0]?.updated_at, 24),
      },
      {
        name: 'statistics',
        displayName: 'Match Statistics',
        lastRefresh: getLatestUpdate(statsResult.data),
        recordCount: statsResult.data?.length || 0,
        needsRefresh: missingStats > 0,
        status: missingStats > 0 ? 'stale' : 'ok',
        reason: missingStats > 0 ? `${missingStats} fixtures missing stats` : undefined,
      },
      {
        name: 'events',
        displayName: 'Match Events',
        lastRefresh: null, // Events don't have updated_at
        recordCount: eventsResult.data?.length || 0,
        needsRefresh: missingEvents > 0,
        status: missingEvents > 0 ? 'stale' : 'ok',
        reason: missingEvents > 0 ? `${missingEvents} fixtures missing events` : undefined,
      },
      {
        name: 'lineups',
        displayName: 'Lineups',
        lastRefresh: getLatestUpdate(lineupsResult.data),
        recordCount: lineupsResult.data?.length || 0,
        needsRefresh: missingLineups > 0,
        status: missingLineups > 0 ? 'stale' : 'ok',
        reason: missingLineups > 0 ? `${missingLineups} fixtures missing lineups` : undefined,
      },
      {
        name: 'injuries',
        displayName: 'Injuries',
        lastRefresh: injuriesResult.data?.[0]?.updated_at || null,
        recordCount: 0, // Count not easily available
        needsRefresh: isStale(injuriesResult.data?.[0]?.updated_at, 12),
        status: getRefreshStatus(injuriesResult.data?.[0]?.updated_at, 12),
      },
      {
        name: 'odds',
        displayName: 'Betting Odds',
        lastRefresh: oddsResult.data?.[0]?.updated_at || null,
        recordCount: 0,
        needsRefresh: isStale(oddsResult.data?.[0]?.updated_at, 6),
        status: getRefreshStatus(oddsResult.data?.[0]?.updated_at, 6),
      },
      {
        name: 'predictions',
        displayName: 'Predictions',
        lastRefresh: getLatestCreated(predictionsResult.data),
        recordCount: predictionsResult.data?.length || 0,
        needsRefresh: false,
        status: predictionsResult.data?.length ? 'ok' : 'missing',
      },
    ]

    // Detect current phase
    const recentUpcomingFixtures = fixtures?.filter(f =>
      new Date(f.match_date) >= windows.recent &&
      new Date(f.match_date) <= windows.upcomingEnd
    ) || []

    const phaseResult = detectCurrentPhase(recentUpcomingFixtures.map(f => ({
      ...f,
      api_id: f.api_id,
    })))
    const displayInfo = getPhaseDisplayInfo(phaseResult)

    return NextResponse.json({
      league: league.name,
      leagueId: league.id,
      generatedAt: now.toISOString(),
      phase: {
        current: phaseResult.phase,
        display: displayInfo,
        nextCheckMinutes: phaseResult.recommendation.nextCheckMinutes,
        recommendation: phaseResult.recommendation,
      },
      fixtures: fixtureStats,
      dataSources,
      upcomingMatches: upcomingFixtures.slice(0, 5).map(f => ({
        id: f.id,
        matchDate: f.match_date,
        status: f.status,
      })),
    })
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Check if a timestamp is stale (older than X hours)
 */
function isStale(timestamp: string | null, hours: number): boolean {
  if (!timestamp) return true
  const age = Date.now() - new Date(timestamp).getTime()
  return age > hours * 60 * 60 * 1000
}

/**
 * Get refresh status based on age
 */
function getRefreshStatus(
  timestamp: string | null,
  staleHours: number
): 'fresh' | 'stale' | 'missing' | 'ok' {
  if (!timestamp) return 'missing'
  const age = Date.now() - new Date(timestamp).getTime()
  const hours = age / (60 * 60 * 1000)

  if (hours < 1) return 'fresh'
  if (hours < staleHours) return 'ok'
  return 'stale'
}

/**
 * Get the latest updated_at from a list
 */
function getLatestUpdate(items: { updated_at?: string }[] | null): string | null {
  if (!items || items.length === 0) return null
  const sorted = items
    .filter(i => i.updated_at)
    .sort((a, b) => new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime())
  return sorted[0]?.updated_at || null
}

/**
 * Get the latest created_at from a list
 */
function getLatestCreated(items: { created_at?: string }[] | null): string | null {
  if (!items || items.length === 0) return null
  const sorted = items
    .filter(i => i.created_at)
    .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
  return sorted[0]?.created_at || null
}
