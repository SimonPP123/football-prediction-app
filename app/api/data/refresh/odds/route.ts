import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSSEStream, wantsStreaming, StreamLogEntry } from '@/lib/utils/streaming'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ODDS_API_KEY = process.env.ODDS_API_KEY
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4'

// Featured betting markets supported by The Odds API for soccer
// Note: btts, double_chance, draw_no_bet, h2h_h1, h2h_h2 are NOT available for soccer_epl
const ODDS_MARKETS = [
  'h2h',           // Match Result (1X2)
  'spreads',       // Asian Handicap / Point Spread
  'totals',        // Over/Under goals
] as const

const MARKETS_PARAM = ODDS_MARKETS.join(',')

interface LogEntry {
  type: 'info' | 'success' | 'error' | 'warning' | 'progress'
  message: string
  details?: {
    endpoint?: string
    progress?: { current: number; total: number }
    error?: string
  }
}

// Team name aliases for matching odds API team names to our database
const TEAM_ALIASES: Record<string, string[]> = {
  'manchester united': ['man utd', 'man united', 'manchester utd'],
  'manchester city': ['man city'],
  'tottenham hotspur': ['tottenham', 'spurs'],
  'wolverhampton wanderers': ['wolves', 'wolverhampton'],
  'newcastle united': ['newcastle'],
  'west ham united': ['west ham'],
  'nottingham forest': ["nott'm forest", 'nottm forest'],
  'brighton & hove albion': ['brighton'],
  'crystal palace': ['palace'],
  'leicester city': ['leicester'],
  'afc bournemouth': ['bournemouth'],
  'ipswich town': ['ipswich'],
}

// Normalize team name for matching
const normalizeTeamName = (name: string): string => {
  const lower = name.toLowerCase().trim()
  // Check if this name is an alias
  for (const [canonical, aliases] of Object.entries(TEAM_ALIASES)) {
    if (canonical === lower || aliases.includes(lower)) {
      return canonical
    }
  }
  // Remove common suffixes for generic matching
  return lower
    .replace(/\s*(fc|afc|cf)$/i, '')
    .trim()
}

// Check if two team names match
const teamsMatch = (name1: string, name2: string): boolean => {
  const norm1 = normalizeTeamName(name1)
  const norm2 = normalizeTeamName(name2)

  // Exact match after normalization
  if (norm1 === norm2) return true

  // One contains the other (for partial matches)
  if (norm1.length > 5 && norm2.length > 5) {
    if (norm1.includes(norm2) || norm2.includes(norm1)) return true
  }

  return false
}

export async function POST(request: Request) {
  const isStreaming = wantsStreaming(request)

  // Parse body for fixture_ids (optional - if not provided, fetch all)
  let fixtureIds: string[] | undefined
  try {
    const body = await request.clone().json()
    fixtureIds = body.fixture_ids
  } catch {
    // No body or invalid JSON - will fetch all fixtures
  }

  if (isStreaming) {
    return handleStreamingRefresh(fixtureIds)
  }
  return handleBatchRefresh(fixtureIds)
}

async function handleStreamingRefresh(fixtureIds?: string[]) {
  const { stream, sendLog, close, closeWithError, headers } = createSSEStream()
  const startTime = Date.now()

  // Start async processing
  ;(async () => {
    try {
      if (!ODDS_API_KEY) {
        sendLog({ type: 'error', message: 'ODDS_API_KEY not configured' })
        closeWithError('ODDS_API_KEY not configured in environment', Date.now() - startTime)
        return
      }

      const isSelectedMode = fixtureIds && fixtureIds.length > 0
      sendLog({ type: 'info', message: isSelectedMode
        ? `Starting odds refresh for ${fixtureIds.length} selected matches...`
        : 'Starting odds refresh from The Odds API...' })

      // Build fixtures query
      let query = supabase
        .from('fixtures')
        .select('id, api_id, home_team:teams!fixtures_home_team_id_fkey(name), away_team:teams!fixtures_away_team_id_fkey(name), match_date')

      if (isSelectedMode) {
        // Fetch only selected fixtures
        query = query.in('id', fixtureIds)
      } else {
        // Fetch all upcoming fixtures for the season
        const endOfSeason = new Date('2026-06-01')
        query = query
          .gte('match_date', new Date().toISOString())
          .lte('match_date', endOfSeason.toISOString())
          .eq('status', 'NS')
      }

      const { data: fixtures } = await query

      if (!fixtures || fixtures.length === 0) {
        sendLog({ type: 'info', message: 'No upcoming fixtures found' })
        close({ success: true, imported: 0, errors: 0, total: 0, duration: Date.now() - startTime })
        return
      }

      sendLog({ type: 'info', message: `Found ${fixtures.length} upcoming fixtures` })

      // Fetch odds from The Odds API
      const endpoint = `${ODDS_API_BASE}/sports/soccer_epl/odds?apiKey=${ODDS_API_KEY}&regions=uk&markets=${MARKETS_PARAM}`
      sendLog({ type: 'info', message: `Fetching EPL odds (${ODDS_MARKETS.length} markets)...`, details: { endpoint: endpoint.replace(ODDS_API_KEY!, '***') } })

      const response = await fetch(endpoint)
      if (!response.ok) {
        throw new Error(`The Odds API error: ${response.status}`)
      }

      const oddsData = await response.json()
      sendLog({ type: 'info', message: `Received ${oddsData.length} matches from The Odds API` })

      let inserted = 0
      let updated = 0
      let errors = 0
      let matchedFixtures = 0

      // Match odds to fixtures by team names
      for (let i = 0; i < fixtures.length; i++) {
        const fixture = fixtures[i]
        const homeName = (fixture.home_team as any)?.name || ''
        const awayName = (fixture.away_team as any)?.name || ''

        // Find matching odds event
        const matchingOdds = oddsData.find((event: any) => {
          const eventHome = event.home_team || ''
          const eventAway = event.away_team || ''
          return teamsMatch(homeName, eventHome) && teamsMatch(awayName, eventAway)
        })

        if (!matchingOdds || !matchingOdds.bookmakers?.length) {
          continue
        }

        matchedFixtures++
        sendLog({
          type: 'progress',
          message: `Processing: ${homeName} vs ${awayName}`,
          details: { progress: { current: matchedFixtures, total: oddsData.length } }
        })

        // Insert odds for each bookmaker
        for (const bookmaker of matchingOdds.bookmakers) {
          for (const market of bookmaker.markets || []) {
            // Check if record exists
            const { data: existing } = await supabase
              .from('odds')
              .select('id')
              .eq('fixture_id', fixture.id)
              .eq('bookmaker', bookmaker.title)
              .eq('bet_type', market.key)
              .single()

            const { error } = await supabase
              .from('odds')
              .upsert({
                fixture_id: fixture.id,
                bookmaker: bookmaker.title,
                bet_type: market.key,
                values: market.outcomes,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'fixture_id,bookmaker,bet_type' })

            if (error) {
              errors++
            } else if (existing) {
              updated++
            } else {
              inserted++
            }
          }
        }
      }

      const duration = Date.now() - startTime
      sendLog({ type: 'success', message: `Completed: ${inserted} new, ${updated} updated, ${errors} errors (${(duration / 1000).toFixed(1)}s)` })
      close({ success: true, inserted, updated, errors, total: fixtures.length, duration })
    } catch (error) {
      const duration = Date.now() - startTime
      sendLog({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' })
      closeWithError(error instanceof Error ? error.message : 'Unknown error', duration)
    }
  })()

  return new Response(stream, { headers })
}

async function handleBatchRefresh(fixtureIds?: string[]) {
  const logs: LogEntry[] = []
  const startTime = Date.now()

  const addLog = (type: LogEntry['type'], message: string, details?: LogEntry['details']) => {
    logs.push({ type, message, details })
    console.log(`[Refresh Odds] ${message}`)
  }

  try {
    if (!ODDS_API_KEY) {
      addLog('error', 'ODDS_API_KEY not configured')
      return NextResponse.json({
        success: false,
        error: 'ODDS_API_KEY not configured in environment',
        logs,
      }, { status: 400 })
    }

    const isSelectedMode = fixtureIds && fixtureIds.length > 0
    addLog('info', isSelectedMode
      ? `Starting odds refresh for ${fixtureIds.length} selected matches...`
      : 'Starting odds refresh from The Odds API...')

    // Build fixtures query
    let query = supabase
      .from('fixtures')
      .select('id, api_id, home_team:teams!fixtures_home_team_id_fkey(name), away_team:teams!fixtures_away_team_id_fkey(name), match_date')

    if (isSelectedMode) {
      // Fetch only selected fixtures
      query = query.in('id', fixtureIds)
    } else {
      // Fetch all upcoming fixtures for the season
      const endOfSeason = new Date('2026-06-01')
      query = query
        .gte('match_date', new Date().toISOString())
        .lte('match_date', endOfSeason.toISOString())
        .eq('status', 'NS')
    }

    const { data: fixtures } = await query

    if (!fixtures || fixtures.length === 0) {
      addLog('info', 'No upcoming fixtures found')
      return NextResponse.json({
        success: true,
        imported: 0,
        errors: 0,
        total: 0,
        logs,
      })
    }

    addLog('info', `Found ${fixtures.length} upcoming fixtures`)

    // Fetch odds from The Odds API
    const endpoint = `${ODDS_API_BASE}/sports/soccer_epl/odds?apiKey=${ODDS_API_KEY}&regions=uk&markets=${MARKETS_PARAM}`
    addLog('info', `Fetching EPL odds (${ODDS_MARKETS.length} markets)...`, { endpoint: endpoint.replace(ODDS_API_KEY, '***') })

    const response = await fetch(endpoint)
    if (!response.ok) {
      throw new Error(`The Odds API error: ${response.status}`)
    }

    const oddsData = await response.json()
    addLog('info', `Received ${oddsData.length} matches from The Odds API`)

    let inserted = 0
    let updated = 0
    let errors = 0

    // Match odds to fixtures by team names
    for (const fixture of fixtures) {
      const homeName = (fixture.home_team as any)?.name || ''
      const awayName = (fixture.away_team as any)?.name || ''

      // Find matching odds event using improved matching
      const matchingOdds = oddsData.find((event: any) => {
        const eventHome = event.home_team || ''
        const eventAway = event.away_team || ''
        // Both home and away teams must match to prevent cross-matching
        return teamsMatch(homeName, eventHome) && teamsMatch(awayName, eventAway)
      })

      if (!matchingOdds || !matchingOdds.bookmakers?.length) {
        continue
      }

      // Insert odds for each bookmaker
      for (const bookmaker of matchingOdds.bookmakers) {
        for (const market of bookmaker.markets || []) {
          // Check if record exists
          const { data: existing } = await supabase
            .from('odds')
            .select('id')
            .eq('fixture_id', fixture.id)
            .eq('bookmaker', bookmaker.title)
            .eq('bet_type', market.key)
            .single()

          const { error } = await supabase
            .from('odds')
            .upsert({
              fixture_id: fixture.id,
              bookmaker: bookmaker.title,
              bet_type: market.key,
              values: market.outcomes,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'fixture_id,bookmaker,bet_type' })

          if (error) {
            errors++
          } else if (existing) {
            updated++
          } else {
            inserted++
          }
        }
      }
    }

    const duration = Date.now() - startTime
    addLog('success', `Completed: ${inserted} new, ${updated} updated, ${errors} errors (${(duration / 1000).toFixed(1)}s)`)

    return NextResponse.json({
      success: true,
      inserted,
      updated,
      errors,
      total: fixtures.length,
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
