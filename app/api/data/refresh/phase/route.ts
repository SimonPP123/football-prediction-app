import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getLeagueFromRequest } from '@/lib/league-context'
import { detectCurrentPhase, getPhaseDisplayInfo } from '@/lib/api/match-phase'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Match phases that the orchestrator can handle
type OrchestratablePhase = 'pre-match' | 'imminent' | 'live' | 'post-match'

// Endpoint configuration for each phase
const PHASE_ENDPOINTS: Record<OrchestratablePhase, { required: string[]; optional: string[] }> = {
  'pre-match': {
    required: ['fixtures?mode=next&count=10', 'standings', 'injuries?mode=upcoming'],
    optional: ['head-to-head', 'team-stats', 'weather', 'odds'],
  },
  'imminent': {
    required: ['lineups?mode=prematch', 'odds'],
    optional: ['injuries?mode=upcoming'],
  },
  'live': {
    required: ['fixtures?mode=live'],
    optional: ['fixture-statistics', 'fixture-events'],
  },
  'post-match': {
    required: ['fixtures?mode=last&count=5', 'fixture-statistics?mode=smart', 'fixture-events?mode=smart', 'standings'],
    optional: [],
  },
}

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

interface LeagueConfig {
  id: string
  apiId: number
  name: string
  currentSeason: number
}

interface RefreshResult {
  endpoint: string
  success: boolean
  duration: number
  error?: string
  details?: any
}

/**
 * Execute a single refresh endpoint
 */
async function executeEndpoint(
  endpointWithParams: string,
  league: LeagueConfig,
  baseUrl: string
): Promise<RefreshResult> {
  const startTime = Date.now()
  const [endpoint, queryString] = endpointWithParams.split('?')

  try {
    // Build the URL for the refresh endpoint
    const params = new URLSearchParams(queryString || '')
    params.set('league_id', league.id)

    const url = `${baseUrl}/api/data/refresh/${endpoint}?${params.toString()}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Cookie: cookies().toString(),
      },
    })

    const data = await response.json()
    const duration = Date.now() - startTime

    return {
      endpoint: endpointWithParams,
      success: response.ok && data.success !== false,
      duration,
      details: data,
    }
  } catch (error) {
    return {
      endpoint: endpointWithParams,
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Detect current phase from fixtures
 */
async function detectPhaseFromFixtures(leagueId: string): Promise<OrchestratablePhase | null> {
  const now = new Date()
  const past3Days = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('id, api_id, match_date, status')
    .eq('league_id', leagueId)
    .gte('match_date', past3Days.toISOString())
    .lte('match_date', next7Days.toISOString())
    .order('match_date', { ascending: true })

  if (!fixtures || fixtures.length === 0) {
    return null
  }

  // Use the existing detectCurrentPhase function
  const phaseResult = detectCurrentPhase(fixtures)
  const phase = phaseResult.phase

  // Map to orchestratable phases
  switch (phase) {
    case 'pre-match':
    case 'matchday-morning':
    case 'day-before':
      return 'pre-match'
    case 'imminent':
      return 'imminent'
    case 'live':
      return 'live'
    case 'post-match':
    case 'day-after':
      return 'post-match'
    default:
      return 'pre-match' // Default
  }
}

export async function POST(request: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const league = await getLeagueFromRequest(request)
  const url = new URL(request.url)
  const baseUrl = `${url.protocol}//${url.host}`

  // Get phase from query params or auto-detect
  let phase = url.searchParams.get('phase') as OrchestratablePhase | null
  const includeOptional = url.searchParams.get('include_optional') === 'true'
  const dryRun = url.searchParams.get('dry_run') === 'true'

  // Auto-detect phase if not provided
  if (!phase) {
    phase = await detectPhaseFromFixtures(league.id)
  }

  if (!phase || !PHASE_ENDPOINTS[phase]) {
    return NextResponse.json({
      success: false,
      error: 'Invalid or unable to detect phase',
      validPhases: Object.keys(PHASE_ENDPOINTS),
    }, { status: 400 })
  }

  const phaseConfig = PHASE_ENDPOINTS[phase]
  const endpoints = [
    ...phaseConfig.required,
    ...(includeOptional ? phaseConfig.optional : []),
  ]

  // Dry run - just return what would be executed
  if (dryRun) {
    return NextResponse.json({
      success: true,
      dryRun: true,
      league: league.name,
      phase,
      endpoints: {
        required: phaseConfig.required,
        optional: phaseConfig.optional,
        toExecute: endpoints,
      },
    })
  }

  const startTime = Date.now()
  const results: RefreshResult[] = []

  // Execute required endpoints in parallel
  console.log(`[Phase Orchestrator] Executing ${phase} phase for ${league.name}`)
  console.log(`[Phase Orchestrator] Endpoints: ${endpoints.join(', ')}`)

  const requiredPromises = phaseConfig.required.map(ep => executeEndpoint(ep, league, baseUrl))
  const requiredResults = await Promise.all(requiredPromises)
  results.push(...requiredResults)

  // Execute optional endpoints if requested
  if (includeOptional && phaseConfig.optional.length > 0) {
    const optionalPromises = phaseConfig.optional.map(ep => executeEndpoint(ep, league, baseUrl))
    const optionalResults = await Promise.all(optionalPromises)
    results.push(...optionalResults)
  }

  const totalDuration = Date.now() - startTime
  const successCount = results.filter(r => r.success).length
  const failedCount = results.filter(r => !r.success).length

  // Get display info for the phase
  const phaseInfo = getPhaseDisplayInfo({
    phase: phase as any,
    nextMatch: null,
    nextMatchTime: null,
    hoursUntilNext: null,
    liveMatches: phase === 'live' ? 1 : 0,
    upcomingToday: phase === 'imminent' || phase === 'pre-match' ? 1 : 0,
    recentlyCompleted: phase === 'post-match' ? 1 : 0,
    recommendation: {
      required: phaseConfig.required,
      optional: phaseConfig.optional,
      skip: [],
      nextCheckMinutes: 30,
      description: '',
    },
  })

  return NextResponse.json({
    success: failedCount === 0,
    league: league.name,
    phase,
    display: phaseInfo,
    summary: {
      total: results.length,
      successful: successCount,
      failed: failedCount,
      duration: totalDuration,
    },
    results,
    refreshed: results.filter(r => r.success).map(r => r.endpoint),
    failed: results.filter(r => !r.success).map(r => ({ endpoint: r.endpoint, error: r.error })),
  })
}

export async function GET(request: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const league = await getLeagueFromRequest(request)

  // Return available phases and current detected phase
  const currentPhase = await detectPhaseFromFixtures(league.id)

  return NextResponse.json({
    league: league.name,
    currentPhase,
    availablePhases: Object.keys(PHASE_ENDPOINTS),
    phaseEndpoints: PHASE_ENDPOINTS,
  })
}
