import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchTeams, ENDPOINTS } from '@/lib/api-football'
import { getLeagueFromRequest } from '@/lib/league-context'
import { createSSEStream, wantsStreaming } from '@/lib/utils/streaming'
import { isAdminWithSessionValidation } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Known stadium coordinates for weather API (can be extended per league)
// These are fallbacks when API-Football doesn't provide coordinates
const VENUE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // England - Premier League
  'Emirates Stadium': { lat: 51.5549, lng: -0.1084 },
  'Villa Park': { lat: 52.5092, lng: -1.8847 },
  'Vitality Stadium': { lat: 50.7352, lng: -1.8384 },
  'Gtech Community Stadium': { lat: 51.4907, lng: -0.2886 },
  'Amex Stadium': { lat: 50.8609, lng: -0.0831 },
  'American Express Stadium': { lat: 50.8609, lng: -0.0831 },
  'Stamford Bridge': { lat: 51.4817, lng: -0.1910 },
  'Selhurst Park': { lat: 51.3983, lng: -0.0855 },
  'Goodison Park': { lat: 53.4388, lng: -2.9663 },
  'Craven Cottage': { lat: 51.4749, lng: -0.2217 },
  'Portman Road': { lat: 52.0553, lng: 1.1453 },
  'King Power Stadium': { lat: 52.6204, lng: -1.1422 },
  'Anfield': { lat: 53.4308, lng: -2.9609 },
  'Etihad Stadium': { lat: 53.4831, lng: -2.2004 },
  'Old Trafford': { lat: 53.4631, lng: -2.2913 },
  "St. James' Park": { lat: 54.9756, lng: -1.6217 },
  'St. James Park': { lat: 54.9756, lng: -1.6217 },
  'City Ground': { lat: 52.9399, lng: -1.1325 },
  "St. Mary's Stadium": { lat: 50.9058, lng: -1.3910 },
  'Tottenham Hotspur Stadium': { lat: 51.6043, lng: -0.0664 },
  'London Stadium': { lat: 51.5387, lng: -0.0166 },
  'Molineux Stadium': { lat: 52.5902, lng: -2.1305 },
  // Spain - La Liga
  'Santiago Bernabéu': { lat: 40.4531, lng: -3.6883 },
  'Camp Nou': { lat: 41.3809, lng: 2.1228 },
  'Metropolitano': { lat: 40.4362, lng: -3.5995 },
  'Ramón Sánchez Pizjuán': { lat: 37.3840, lng: -5.9705 },
  // Germany - Bundesliga
  'Allianz Arena': { lat: 48.2188, lng: 11.6247 },
  'Signal Iduna Park': { lat: 51.4926, lng: 7.4519 },
  // Italy - Serie A
  'San Siro': { lat: 45.4781, lng: 9.1240 },
  'Olimpico': { lat: 41.9341, lng: 12.4547 },
  'Allianz Stadium': { lat: 45.1096, lng: 7.6413 },
  // France - Ligue 1
  'Parc des Princes': { lat: 48.8414, lng: 2.2530 },
  'Groupama Stadium': { lat: 45.7652, lng: 4.9822 },
}

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

interface LeagueConfig {
  id: string
  apiId: number
  name: string
  country: string
  currentSeason: number
}

export async function POST(request: Request) {
  if (!(await isAdminWithSessionValidation())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Get league from request (defaults to Premier League)
  const league = await getLeagueFromRequest(request)

  if (wantsStreaming(request)) {
    return handleStreamingRefresh(league)
  }
  return handleBatchRefresh(league)
}

async function handleStreamingRefresh(league: LeagueConfig) {
  const { stream, sendLog, close, closeWithError, headers } = createSSEStream()
  const startTime = Date.now()

  ;(async () => {
    try {
      sendLog({ type: 'info', message: `Starting teams refresh for ${league.name}...`, details: { endpoint: ENDPOINTS.teams.url } })

      const data = await fetchTeams(league.apiId, league.currentSeason)

      if (!data.response || data.response.length === 0) {
        sendLog({ type: 'error', message: 'No teams returned from API' })
        closeWithError('No teams returned from API', Date.now() - startTime)
        return
      }

      sendLog({ type: 'info', message: `Received ${data.response.length} teams from API` })

      const total = data.response.length
      let errors = 0

      // STEP 1: Collect and batch upsert all venues
      sendLog({ type: 'info', message: 'Processing venues...' })

      // Collect unique venues
      const venueMap = new Map<number, any>() // api_id -> venue data
      for (const item of data.response) {
        const venue = item.venue
        if (venue && venue.id && !venueMap.has(venue.id)) {
          const coords = VENUE_COORDINATES[venue.name] || { lat: null, lng: null }
          venueMap.set(venue.id, {
            api_id: venue.id,
            name: venue.name,
            city: venue.city,
            country: league.country,
            capacity: venue.capacity,
            surface: venue.surface,
            lat: coords.lat,
            lng: coords.lng,
          })
        }
      }

      // Get existing venue api_ids
      const venueApiIds = Array.from(venueMap.keys())
      const { data: existingVenues } = await supabase
        .from('venues')
        .select('api_id')
        .in('api_id', venueApiIds)
      const existingVenueApiIds = new Set(existingVenues?.map(v => v.api_id) || [])

      // Batch upsert venues and get IDs back
      const venuesToUpsert = Array.from(venueMap.values())
      let venuesInserted = 0
      let venuesUpdated = 0
      const venueIdMap = new Map<number, string>() // api_id -> db id

      if (venuesToUpsert.length > 0) {
        const { data: upsertedVenues, error: venueError } = await supabase
          .from('venues')
          .upsert(venuesToUpsert, { onConflict: 'api_id' })
          .select('id, api_id')

        if (venueError) {
          sendLog({ type: 'warning', message: `Venue batch error: ${venueError.message}` })
        } else if (upsertedVenues) {
          for (const v of upsertedVenues) {
            venueIdMap.set(v.api_id, v.id)
            if (existingVenueApiIds.has(v.api_id)) {
              venuesUpdated++
            } else {
              venuesInserted++
            }
          }
        }
      }

      // STEP 2: Collect and batch upsert all teams
      sendLog({ type: 'info', message: 'Processing teams...' })

      // Get existing team api_ids for this league
      const teamApiIds = data.response.map((item: any) => item.team.id)
      const { data: existingTeams } = await supabase
        .from('teams')
        .select('api_id')
        .eq('league_id', league.id)
        .in('api_id', teamApiIds)
      const existingTeamApiIds = new Set(existingTeams?.map(t => t.api_id) || [])

      // Collect all teams for batch upsert
      const teamsToUpsert = data.response.map((item: any) => {
        const team = item.team
        const venue = item.venue
        return {
          api_id: team.id,
          league_id: league.id,
          name: team.name,
          code: team.code,
          country: team.country,
          logo: team.logo,
          venue_id: venue?.id ? venueIdMap.get(venue.id) || null : null,
        }
      })

      let teamsInserted = 0
      let teamsUpdated = 0

      if (teamsToUpsert.length > 0) {
        sendLog({ type: 'info', message: `Batch upserting ${teamsToUpsert.length} teams...` })
        const { error: teamError } = await supabase
          .from('teams')
          .upsert(teamsToUpsert, { onConflict: 'api_id,league_id' })

        if (teamError) {
          sendLog({ type: 'error', message: `Team batch error: ${teamError.message}` })
          errors = teamsToUpsert.length
        } else {
          for (const t of teamsToUpsert) {
            if (existingTeamApiIds.has(t.api_id)) {
              teamsUpdated++
            } else {
              teamsInserted++
            }
          }
        }
      }

      const duration = Date.now() - startTime
      sendLog({ type: 'success', message: `Completed: Teams (${teamsInserted} new, ${teamsUpdated} updated), Venues (${venuesInserted} new, ${venuesUpdated} updated), ${errors} errors (${(duration / 1000).toFixed(1)}s)` })
      close({ success: true, inserted: teamsInserted, updated: teamsUpdated, venuesInserted, venuesUpdated, errors, total, duration, league: league.name })
    } catch (error) {
      const duration = Date.now() - startTime
      sendLog({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' })
      closeWithError(error instanceof Error ? error.message : 'Unknown error', duration)
    }
  })()

  return new Response(stream, { headers })
}

async function handleBatchRefresh(league: LeagueConfig) {
  const logs: LogEntry[] = []
  const startTime = Date.now()

  const addLog = (
    type: LogEntry['type'],
    message: string,
    details?: LogEntry['details']
  ) => {
    logs.push({ type, message, details })
    console.log(`[Refresh Teams - ${league.name}] ${message}`)
  }

  try {
    addLog('info', `Starting teams refresh for ${league.name}...`, {
      endpoint: ENDPOINTS.teams.url,
    })

    // Fetch teams from API-Football for this league
    const data = await fetchTeams(league.apiId, league.currentSeason)

    if (!data.response || data.response.length === 0) {
      addLog('error', 'No teams returned from API')
      return NextResponse.json({
        success: false,
        error: 'No teams returned from API',
        logs,
        endpoint: ENDPOINTS.teams.url,
        league: league.name,
      }, { status: 400 })
    }

    addLog('info', `Received ${data.response.length} teams from API`)

    const total = data.response.length
    let errors = 0

    // STEP 1: Collect and batch upsert all venues
    addLog('info', 'Processing venues...')

    // Collect unique venues
    const venueMap = new Map<number, any>() // api_id -> venue data
    for (const item of data.response) {
      const venue = item.venue
      if (venue && venue.id && !venueMap.has(venue.id)) {
        const coords = VENUE_COORDINATES[venue.name] || { lat: null, lng: null }
        venueMap.set(venue.id, {
          api_id: venue.id,
          name: venue.name,
          city: venue.city,
          country: league.country,
          capacity: venue.capacity,
          surface: venue.surface,
          lat: coords.lat,
          lng: coords.lng,
        })
      }
    }

    // Get existing venue api_ids
    const venueApiIds = Array.from(venueMap.keys())
    const { data: existingVenues } = await supabase
      .from('venues')
      .select('api_id')
      .in('api_id', venueApiIds)
    const existingVenueApiIds = new Set(existingVenues?.map(v => v.api_id) || [])

    // Batch upsert venues and get IDs back
    const venuesToUpsert = Array.from(venueMap.values())
    let venuesInserted = 0
    let venuesUpdated = 0
    const venueIdMap = new Map<number, string>() // api_id -> db id

    if (venuesToUpsert.length > 0) {
      addLog('info', `Batch upserting ${venuesToUpsert.length} venues...`)
      const { data: upsertedVenues, error: venueError } = await supabase
        .from('venues')
        .upsert(venuesToUpsert, { onConflict: 'api_id' })
        .select('id, api_id')

      if (venueError) {
        addLog('warning', `Venue batch error: ${venueError.message}`)
      } else if (upsertedVenues) {
        for (const v of upsertedVenues) {
          venueIdMap.set(v.api_id, v.id)
          if (existingVenueApiIds.has(v.api_id)) {
            venuesUpdated++
          } else {
            venuesInserted++
          }
        }
      }
    }

    // STEP 2: Collect and batch upsert all teams
    addLog('info', 'Processing teams...')

    // Get existing team api_ids for this league
    const teamApiIds = data.response.map((item: any) => item.team.id)
    const { data: existingTeams } = await supabase
      .from('teams')
      .select('api_id')
      .eq('league_id', league.id)
      .in('api_id', teamApiIds)
    const existingTeamApiIds = new Set(existingTeams?.map(t => t.api_id) || [])

    // Collect all teams for batch upsert
    const teamsToUpsert = data.response.map((item: any) => {
      const team = item.team
      const venue = item.venue
      return {
        api_id: team.id,
        league_id: league.id,
        name: team.name,
        code: team.code,
        country: team.country,
        logo: team.logo,
        venue_id: venue?.id ? venueIdMap.get(venue.id) || null : null,
      }
    })

    let teamsInserted = 0
    let teamsUpdated = 0

    if (teamsToUpsert.length > 0) {
      addLog('info', `Batch upserting ${teamsToUpsert.length} teams...`)
      const { error: teamError } = await supabase
        .from('teams')
        .upsert(teamsToUpsert, { onConflict: 'api_id,league_id' })

      if (teamError) {
        addLog('error', `Team batch error: ${teamError.message}`)
        errors = teamsToUpsert.length
      } else {
        for (const t of teamsToUpsert) {
          if (existingTeamApiIds.has(t.api_id)) {
            teamsUpdated++
          } else {
            teamsInserted++
          }
        }
      }
    }

    const duration = Date.now() - startTime
    addLog('success', `Completed: Teams (${teamsInserted} new, ${teamsUpdated} updated), Venues (${venuesInserted} new, ${venuesUpdated} updated), ${errors} errors (${(duration / 1000).toFixed(1)}s)`)

    return NextResponse.json({
      success: true,
      inserted: teamsInserted,
      updated: teamsUpdated,
      venuesInserted,
      venuesUpdated,
      errors,
      total,
      duration,
      endpoint: ENDPOINTS.teams.url,
      logs,
      league: league.name,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    addLog('error', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
      endpoint: ENDPOINTS.teams.url,
      logs,
      league: league.name,
    }, { status: 500 })
  }
}
