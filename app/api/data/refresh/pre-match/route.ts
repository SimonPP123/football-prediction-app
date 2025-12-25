import { createSSEStream } from '@/lib/utils/streaming'

export const dynamic = 'force-dynamic'

// Pre-match endpoints needed for predictions
const PRE_MATCH_ENDPOINTS = [
  // Required (always run)
  { key: 'standings', name: 'Standings', required: true },
  { key: 'injuries', name: 'Injuries', required: true },
  { key: 'team-stats', name: 'Team Stats', required: true },
  { key: 'head-to-head', name: 'Head-to-Head', required: true },
  { key: 'fixture-statistics', name: 'Match Statistics', required: true },
  { key: 'weather', name: 'Weather', required: true },
  { key: 'odds', name: 'Odds', required: true },
  // Optional (user toggles)
  { key: 'referee-stats', name: 'Referee Stats', required: false },
  { key: 'lineups', name: 'Lineups', required: false },
]

interface PreMatchOptions {
  includeRefereeStats?: boolean
  includeLineups?: boolean
}

export async function POST(request: Request) {
  const { stream, sendLog, close, closeWithError, headers } = createSSEStream()
  const startTime = Date.now()

  // Parse options from request body
  let options: PreMatchOptions = {}
  try {
    const body = await request.clone().json()
    options = {
      includeRefereeStats: body.includeRefereeStats ?? false,
      includeLineups: body.includeLineups ?? false,
    }
  } catch {
    // No body or invalid JSON - use defaults
  }

  // Determine which endpoints to run
  const endpointsToRun = PRE_MATCH_ENDPOINTS.filter(ep => {
    if (ep.required) return true
    if (ep.key === 'referee-stats' && options.includeRefereeStats) return true
    if (ep.key === 'lineups' && options.includeLineups) return true
    return false
  })

  ;(async () => {
    try {
      const totalEndpoints = endpointsToRun.length
      sendLog({
        type: 'info',
        message: `Starting pre-match refresh (${totalEndpoints} endpoints)...`
      })

      const results: Record<string, { success: boolean; inserted?: number; updated?: number; errors?: number; duration?: number }> = {}
      let successCount = 0
      let failCount = 0

      for (let i = 0; i < endpointsToRun.length; i++) {
        const endpoint = endpointsToRun[i]
        const stepNum = i + 1

        sendLog({
          type: 'info',
          message: `[${stepNum}/${totalEndpoints}] Refreshing ${endpoint.name}...`
        })

        const endpointStart = Date.now()

        try {
          // Call the individual refresh endpoint
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          const response = await fetch(`${baseUrl}/api/data/refresh/${endpoint.key}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            // Don't use streaming for internal calls - get JSON response
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

            // Format result message
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
        message: `Pre-match refresh complete: ${successCount}/${totalEndpoints} successful (${(totalDuration / 1000).toFixed(1)}s)`
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
