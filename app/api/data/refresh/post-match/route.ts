import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSSEStream } from '@/lib/utils/streaming'

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

// Post-match endpoints for completed fixtures
const POST_MATCH_ENDPOINTS = [
  // Required (always run) - Core match data
  { key: 'fixtures', name: 'Fixtures', required: true },
  { key: 'fixture-statistics', name: 'Match Statistics', required: true },
  { key: 'fixture-events', name: 'Match Events', required: true },
  { key: 'standings', name: 'League Table', required: true },
  // Required - Stats updates after match
  { key: 'team-stats', name: 'Team Stats', required: true },
  { key: 'player-stats', name: 'Player Stats', required: true },
  { key: 'top-performers', name: 'Top Performers', required: true },
  // Optional (user toggles)
  { key: 'lineups', name: 'Lineups', required: false },
]

interface PostMatchOptions {
  includeLineups?: boolean
}

export async function POST(request: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { stream, sendLog, close, closeWithError, headers } = createSSEStream()
  const startTime = Date.now()

  // Parse options from request body
  let options: PostMatchOptions = {}
  try {
    const body = await request.clone().json()
    options = {
      includeLineups: body.includeLineups ?? false,
    }
  } catch {
    // No body or invalid JSON - use defaults
  }

  // Determine which endpoints to run
  const endpointsToRun = POST_MATCH_ENDPOINTS.filter(ep => {
    if (ep.required) return true
    if (ep.key === 'lineups' && options.includeLineups) return true
    return false
  })

  ;(async () => {
    try {
      const totalEndpoints = endpointsToRun.length
      sendLog({
        type: 'info',
        message: `Starting post-match refresh (${totalEndpoints} endpoints)...`
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

          // Add recent_only parameter to filter last 7 days
          const url = `${baseUrl}/api/data/refresh/${endpoint.key}?recent_only=true`

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('cookie') || '',  // Pass auth cookies
            },
            // Don't use streaming for internal calls - get JSON response
          })

          let data
          try {
            data = await response.json()
          } catch {
            // Response wasn't JSON (e.g., HTML error page)
            throw new Error(`Invalid response from ${endpoint.key} endpoint`)
          }
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
        message: `Post-match refresh complete: ${successCount}/${totalEndpoints} successful (${(totalDuration / 1000).toFixed(1)}s)`
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
