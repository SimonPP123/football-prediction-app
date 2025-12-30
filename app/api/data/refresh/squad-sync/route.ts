import { createSSEStream } from '@/lib/utils/streaming'

export const dynamic = 'force-dynamic'

// Squad sync endpoints - run during transfer windows or when squad changes occur
// Updates player-related data that may change due to transfers, injuries, etc.
// timeout: in ms (player-squads needs 10 min due to rate limiting)
const SQUAD_SYNC_ENDPOINTS = [
  { key: 'player-squads', name: 'Squad Rosters', description: 'Current squad assignments for all teams', timeout: 600000 },
  { key: 'transfers', name: 'Transfers', description: 'Recent transfer activity', timeout: 120000 },
  { key: 'injuries', name: 'Injuries', description: 'Updated injury list for all teams', timeout: 120000 },
  { key: 'coaches', name: 'Managers', description: 'Manager/coach changes', timeout: 120000 },
]

export async function POST(request: Request) {
  const { stream, sendLog, close, closeWithError, headers } = createSSEStream()
  const startTime = Date.now()

  ;(async () => {
    try {
      const totalEndpoints = SQUAD_SYNC_ENDPOINTS.length
      sendLog({
        type: 'info',
        message: `Starting squad sync (${totalEndpoints} endpoints)...`
      })
      sendLog({
        type: 'info',
        message: 'This updates squad rosters and player-related data. Run during transfer windows.'
      })

      const results: Record<string, { success: boolean; inserted?: number; updated?: number; errors?: number; duration?: number }> = {}
      let successCount = 0
      let failCount = 0

      for (let i = 0; i < SQUAD_SYNC_ENDPOINTS.length; i++) {
        const endpoint = SQUAD_SYNC_ENDPOINTS[i]
        const stepNum = i + 1

        sendLog({
          type: 'info',
          message: `[${stepNum}/${totalEndpoints}] ${endpoint.name}: ${endpoint.description}...`
        })

        const endpointStart = Date.now()

        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          // Use AbortController for timeout (player-squads needs longer due to rate limiting)
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout)

          const response = await fetch(`${baseUrl}/api/data/refresh/${endpoint.key}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('cookie') || '',
            },
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

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
        message: `Squad sync complete: ${successCount}/${totalEndpoints} successful (${(totalDuration / 1000).toFixed(1)}s)`
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
