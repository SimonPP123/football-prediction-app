import { createSSEStream } from '@/lib/utils/streaming'
import { getLeagueFromRequest } from '@/lib/league-context'

export const dynamic = 'force-dynamic'

// Season setup endpoints - run once at start of season or first-time setup
// Order matters: teams must be first (foundation), then dependent data
const SEASON_SETUP_ENDPOINTS = [
  { key: 'teams', name: 'Teams & Venues', description: 'Foundation data for all teams and stadiums' },
  { key: 'fixtures', name: 'Season Fixtures', description: 'Full fixture list for the season' },
  { key: 'standings', name: 'League Table', description: 'Initial standings and positions' },
  { key: 'team-stats', name: 'Team Statistics', description: 'Season-to-date team stats' },
  { key: 'coaches', name: 'Managers', description: 'Coach/manager information' },
  { key: 'player-squads', name: 'Squad Rosters', description: 'Current squad assignments' },
]

export async function POST(request: Request) {
  // Get league from request (defaults to Premier League)
  const league = await getLeagueFromRequest(request)

  const { stream, sendLog, close, closeWithError, headers } = createSSEStream()
  const startTime = Date.now()

  ;(async () => {
    try {
      const totalEndpoints = SEASON_SETUP_ENDPOINTS.length
      sendLog({
        type: 'info',
        message: `Starting season setup for ${league.name} (${totalEndpoints} endpoints)...`
      })
      sendLog({
        type: 'info',
        message: 'This will populate foundational data. Run once per season or on first-time setup.'
      })

      const results: Record<string, { success: boolean; inserted?: number; updated?: number; errors?: number; duration?: number }> = {}
      let successCount = 0
      let failCount = 0

      for (let i = 0; i < SEASON_SETUP_ENDPOINTS.length; i++) {
        const endpoint = SEASON_SETUP_ENDPOINTS[i]
        const stepNum = i + 1

        sendLog({
          type: 'info',
          message: `[${stepNum}/${totalEndpoints}] ${endpoint.name}: ${endpoint.description}...`
        })

        const endpointStart = Date.now()

        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          // Pass league_id to each refresh endpoint
          const response = await fetch(`${baseUrl}/api/data/refresh/${endpoint.key}?league_id=${league.id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          const data = await response.json()
          const endpointDuration = Date.now() - endpointStart

          if (data.success) {
            successCount++
            results[endpoint.key] = {
              success: true,
              inserted: data.inserted ?? data.imported ?? 0,
              updated: data.updated ?? 0,
              errors: data.errors ?? 0,
              duration: endpointDuration,
            }

            const inserted = data.inserted ?? data.imported ?? 0
            const updated = data.updated ?? 0
            const errors = data.errors ?? 0

            let resultMsg = `${endpoint.name}: `
            if (data.inserted !== undefined || data.updated !== undefined) {
              resultMsg += `${inserted} new, ${updated} updated`
            } else if (data.imported !== undefined) {
              resultMsg += `${data.imported} imported`
            } else {
              resultMsg += 'completed'
            }
            if (errors > 0) resultMsg += `, ${errors} errors`
            resultMsg += ` (${(endpointDuration / 1000).toFixed(1)}s)`

            sendLog({ type: 'success', message: resultMsg })
          } else {
            failCount++
            results[endpoint.key] = {
              success: false,
              duration: endpointDuration,
            }
            sendLog({
              type: 'error',
              message: `${endpoint.name} failed: ${data.error || 'Unknown error'}`
            })
          }
        } catch (error) {
          failCount++
          const endpointDuration = Date.now() - endpointStart
          results[endpoint.key] = {
            success: false,
            duration: endpointDuration,
          }
          sendLog({
            type: 'error',
            message: `${endpoint.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
        }
      }

      const totalDuration = Date.now() - startTime

      sendLog({
        type: successCount === totalEndpoints ? 'success' : 'warning',
        message: `Season setup for ${league.name} complete: ${successCount}/${totalEndpoints} successful (${(totalDuration / 1000).toFixed(1)}s)`
      })

      close({
        success: failCount === 0,
        endpoints: totalEndpoints,
        successful: successCount,
        failed: failCount,
        duration: totalDuration,
        total: totalEndpoints,
        errors: failCount,
        results,
        league: league.name,
      })
    } catch (error) {
      const duration = Date.now() - startTime
      sendLog({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
      closeWithError(error instanceof Error ? error.message : 'Unknown error', duration)
    }
  })()

  return new Response(stream, { headers })
}
