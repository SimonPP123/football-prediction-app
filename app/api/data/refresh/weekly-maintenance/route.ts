import { NextResponse } from 'next/server'
import { createSSEStream } from '@/lib/utils/streaming'
import { isAdminWithSessionValidation } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Weekly maintenance endpoints - run every Sunday to refresh aggregated stats
// These endpoints update cumulative statistics that change over time
const WEEKLY_MAINTENANCE_ENDPOINTS = [
  { key: 'team-stats', name: 'Team Statistics', description: 'Full team season stats (goals, xG, form)' },
  { key: 'player-stats', name: 'Player Statistics', description: 'Individual player performance data' },
  { key: 'top-performers', name: 'Top Performers', description: 'Top scorers, assists, clean sheets' },
  { key: 'referee-stats', name: 'Referee Statistics', description: 'Referee tendencies (cards, fouls)' },
  { key: 'head-to-head', name: 'Head-to-Head', description: 'Historical H2H records for all teams' },
]

export async function POST(request: Request) {
  if (!(await isAdminWithSessionValidation())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { stream, sendLog, close, closeWithError, headers } = createSSEStream()
  const startTime = Date.now()

  ;(async () => {
    try {
      const totalEndpoints = WEEKLY_MAINTENANCE_ENDPOINTS.length
      sendLog({
        type: 'info',
        message: `Starting weekly maintenance (${totalEndpoints} endpoints)...`
      })
      sendLog({
        type: 'info',
        message: 'This refreshes all aggregated statistics. Run every Sunday.'
      })

      const results: Record<string, { success: boolean; inserted?: number; updated?: number; errors?: number; duration?: number }> = {}
      let successCount = 0
      let failCount = 0

      for (let i = 0; i < WEEKLY_MAINTENANCE_ENDPOINTS.length; i++) {
        const endpoint = WEEKLY_MAINTENANCE_ENDPOINTS[i]
        const stepNum = i + 1

        sendLog({
          type: 'info',
          message: `[${stepNum}/${totalEndpoints}] ${endpoint.name}: ${endpoint.description}...`
        })

        const endpointStart = Date.now()

        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          const response = await fetch(`${baseUrl}/api/data/refresh/${endpoint.key}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('cookie') || '',
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
        message: `Weekly maintenance complete: ${successCount}/${totalEndpoints} successful (${(totalDuration / 1000).toFixed(1)}s)`
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
