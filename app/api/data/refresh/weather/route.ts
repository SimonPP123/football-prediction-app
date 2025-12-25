import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSSEStream, wantsStreaming } from '@/lib/utils/streaming'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Open-Meteo API (free, no key needed)
const WEATHER_API_BASE = 'https://api.open-meteo.com/v1/forecast'

interface LogEntry {
  type: 'info' | 'success' | 'error' | 'warning' | 'progress'
  message: string
  details?: {
    endpoint?: string
    recordName?: string
    progress?: { current: number; total: number }
    error?: string
  }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Weather code descriptions
const weatherCodes: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Depositing rime fog',
  51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
  61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
  71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
  80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Severe thunderstorm',
}

export async function POST(request: Request) {
  if (wantsStreaming(request)) {
    return handleStreamingRefresh()
  }
  return handleBatchRefresh()
}

async function handleStreamingRefresh() {
  const { stream, sendLog, close, closeWithError, headers } = createSSEStream()
  const startTime = Date.now()

  ;(async () => {
    try {
      sendLog({ type: 'info', message: 'Starting weather refresh from Open-Meteo...' })

      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)

      const { data: fixtures } = await supabase
        .from('fixtures')
        .select(`
          id, api_id, match_date,
          home_team:teams!fixtures_home_team_id_fkey(name),
          venue:venues!fixtures_venue_id_fkey(name, lat, lng)
        `)
        .gte('match_date', new Date().toISOString())
        .lte('match_date', nextWeek.toISOString())
        .eq('status', 'NS')

      if (!fixtures || fixtures.length === 0) {
        sendLog({ type: 'info', message: 'No upcoming fixtures found' })
        close({ success: true, imported: 0, errors: 0, total: 0, duration: Date.now() - startTime })
        return
      }

      const fixturesWithVenue = fixtures.filter(f => {
        const venue = f.venue as any
        return venue?.lat && venue?.lng
      })

      sendLog({ type: 'info', message: `Found ${fixturesWithVenue.length} fixtures with venue coordinates (${fixtures.length} total)` })

      let imported = 0
      let errors = 0

      for (let i = 0; i < fixturesWithVenue.length; i++) {
        const fixture = fixturesWithVenue[i]
        const venue = fixture.venue as any
        const matchDate = new Date(fixture.match_date)
        const matchName = `${(fixture.home_team as any)?.name || 'Home'} at ${venue?.name || 'Venue'}`

        await delay(200)

        sendLog({
          type: 'progress',
          message: `Fetching weather for ${matchName}...`,
          details: { recordName: matchName, progress: { current: i + 1, total: fixturesWithVenue.length } }
        })

        try {
          const dateStr = matchDate.toISOString().split('T')[0]
          const hour = matchDate.getUTCHours()
          const endpoint = `${WEATHER_API_BASE}?latitude=${venue.lat}&longitude=${venue.lng}&hourly=temperature_2m,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m,relative_humidity_2m,weather_code&start_date=${dateStr}&end_date=${dateStr}`

          const response = await fetch(endpoint)
          if (!response.ok) throw new Error(`Weather API error: ${response.status}`)

          const data = await response.json()
          const hourlyIndex = data.hourly?.time?.findIndex((t: string) => new Date(t).getUTCHours() === hour) ?? 0
          const weatherCode = data.hourly?.weather_code?.[hourlyIndex] ?? null

          const { error } = await supabase
            .from('weather')
            .upsert({
              fixture_id: fixture.id,
              temperature: data.hourly?.temperature_2m?.[hourlyIndex] ?? null,
              feels_like: data.hourly?.apparent_temperature?.[hourlyIndex] ?? null,
              wind_speed: data.hourly?.wind_speed_10m?.[hourlyIndex] ?? null,
              wind_direction: data.hourly?.wind_direction_10m?.[hourlyIndex] ?? null,
              precipitation: data.hourly?.precipitation?.[hourlyIndex] ?? null,
              humidity: data.hourly?.relative_humidity_2m?.[hourlyIndex] ?? null,
              weather_code: weatherCode,
              description: weatherCode !== null ? weatherCodes[weatherCode] || 'Unknown' : null,
              fetched_at: new Date().toISOString(),
            }, { onConflict: 'fixture_id' })

          if (error) {
            sendLog({ type: 'error', message: `Error for ${matchName}: ${error.message}` })
            errors++
          } else {
            sendLog({ type: 'success', message: `${matchName}: ${data.hourly?.temperature_2m?.[hourlyIndex]}°C, ${weatherCodes[weatherCode] || 'Unknown'}` })
            imported++
          }
        } catch (err) {
          sendLog({ type: 'error', message: `Failed for ${matchName}: ${err instanceof Error ? err.message : 'Unknown'}` })
          errors++
        }
      }

      const duration = Date.now() - startTime
      sendLog({ type: 'success', message: `Completed: ${imported} imported, ${errors} errors (${(duration / 1000).toFixed(1)}s)` })
      close({ success: true, imported, errors, total: fixturesWithVenue.length, duration })
    } catch (error) {
      const duration = Date.now() - startTime
      sendLog({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' })
      closeWithError(error instanceof Error ? error.message : 'Unknown error', duration)
    }
  })()

  return new Response(stream, { headers })
}

async function handleBatchRefresh() {
  const logs: LogEntry[] = []
  const startTime = Date.now()

  const addLog = (type: LogEntry['type'], message: string, details?: LogEntry['details']) => {
    logs.push({ type, message, details })
    console.log(`[Refresh Weather] ${message}`)
  }

  try {
    addLog('info', 'Starting weather refresh from Open-Meteo...')

    // Get upcoming fixtures with venue info (next 7 days)
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)

    const { data: fixtures } = await supabase
      .from('fixtures')
      .select(`
        id, api_id, match_date,
        home_team:teams!fixtures_home_team_id_fkey(name),
        venue:venues!fixtures_venue_id_fkey(name, lat, lng)
      `)
      .gte('match_date', new Date().toISOString())
      .lte('match_date', nextWeek.toISOString())
      .eq('status', 'NS')

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

    // Filter fixtures that have venue coordinates
    const fixturesWithVenue = fixtures.filter(f => {
      const venue = f.venue as any
      return venue?.lat && venue?.lng
    })

    addLog('info', `Found ${fixturesWithVenue.length} fixtures with venue coordinates (${fixtures.length} total)`)

    let imported = 0
    let errors = 0

    for (let i = 0; i < fixturesWithVenue.length; i++) {
      const fixture = fixturesWithVenue[i]
      const venue = fixture.venue as any
      const matchDate = new Date(fixture.match_date)
      const matchName = `${(fixture.home_team as any)?.name || 'Home'} at ${venue?.name || 'Venue'}`

      await delay(200) // Rate limiting

      addLog('progress', `Fetching weather for ${matchName}...`, {
        recordName: matchName,
        progress: { current: i + 1, total: fixturesWithVenue.length },
      })

      try {
        // Format date for API
        const dateStr = matchDate.toISOString().split('T')[0]
        const hour = matchDate.getUTCHours()

        const endpoint = `${WEATHER_API_BASE}?latitude=${venue.lat}&longitude=${venue.lng}&hourly=temperature_2m,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m,relative_humidity_2m,weather_code&start_date=${dateStr}&end_date=${dateStr}`

        const response = await fetch(endpoint)
        if (!response.ok) {
          throw new Error(`Weather API error: ${response.status}`)
        }

        const data = await response.json()
        const hourlyIndex = data.hourly?.time?.findIndex((t: string) => new Date(t).getUTCHours() === hour) ?? 0

        const weatherCode = data.hourly?.weather_code?.[hourlyIndex] ?? null

        const { error } = await supabase
          .from('weather')
          .upsert({
            fixture_id: fixture.id,
            temperature: data.hourly?.temperature_2m?.[hourlyIndex] ?? null,
            feels_like: data.hourly?.apparent_temperature?.[hourlyIndex] ?? null,
            wind_speed: data.hourly?.wind_speed_10m?.[hourlyIndex] ?? null,
            wind_direction: data.hourly?.wind_direction_10m?.[hourlyIndex] ?? null,
            precipitation: data.hourly?.precipitation?.[hourlyIndex] ?? null,
            humidity: data.hourly?.relative_humidity_2m?.[hourlyIndex] ?? null,
            weather_code: weatherCode,
            description: weatherCode !== null ? weatherCodes[weatherCode] || 'Unknown' : null,
            fetched_at: new Date().toISOString(),
          }, { onConflict: 'fixture_id' })

        if (error) {
          addLog('error', `Error for ${matchName}: ${error.message}`)
          errors++
        } else {
          addLog('success', `${matchName}: ${data.hourly?.temperature_2m?.[hourlyIndex]}°C, ${weatherCodes[weatherCode] || 'Unknown'}`)
          imported++
        }
      } catch (err) {
        addLog('error', `Failed for ${matchName}: ${err instanceof Error ? err.message : 'Unknown'}`)
        errors++
      }
    }

    const duration = Date.now() - startTime
    addLog('success', `Completed: ${imported} imported, ${errors} errors (${(duration / 1000).toFixed(1)}s)`)

    return NextResponse.json({
      success: true,
      imported,
      errors,
      total: fixturesWithVenue.length,
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
