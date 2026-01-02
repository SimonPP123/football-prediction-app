import { NextResponse } from 'next/server'
import { createSSEStream } from '@/lib/utils/streaming'
import { isAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

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

  // Helper to call a single refresh endpoint
  const callEndpoint = async (endpoint: typeof POST_MATCH_ENDPOINTS[0]) => {
    const endpointStart = Date.now()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const url = `${baseUrl}/api/data/refresh/${endpoint.key}?recent_only=true`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || '',
        },
      })

      let data
      try {
        data = await response.json()
      } catch {
        throw new Error(`Invalid response from ${endpoint.key} endpoint`)
      }
      const endpointDuration = Date.now() - endpointStart

      return {
        endpoint,
        success: data.success !== false,
        data,
        duration: endpointDuration,
      }
    } catch (error) {
      const endpointDuration = Date.now() - endpointStart
      return {
        endpoint,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: endpointDuration,
      }
    }
  }

  // Helper to format result message
  const formatResult = (result: { endpoint: typeof POST_MATCH_ENDPOINTS[0]; success: boolean; data?: any; error?: string; duration: number }) => {
    const { endpoint, success, data, error, duration } = result

    if (success && data) {
      const inserted = data.inserted ?? data.imported ?? 0
      const updated = data.updated ?? 0
      const errors = data.errors ?? 0

      let msg = `${endpoint.name}: `
      if (data.inserted !== undefined || data.updated !== undefined) {
        msg += `${inserted} new, ${updated} updated`
      } else if (data.imported !== undefined) {
        msg += `${data.imported} imported`
      } else {
        msg += 'completed'
      }
      if (errors > 0) msg += `, ${errors} errors`
      msg += ` (${(duration / 1000).toFixed(1)}s)`
      return { type: 'success' as const, message: msg }
    }

    return {
      type: 'error' as const,
      message: `${endpoint.name} failed: ${error || data?.error || 'Unknown error'}`
    }
  }

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

      // Phase 1: Run fixtures first (other endpoints may depend on fixture status)
      const fixturesEndpoint = endpointsToRun.find(ep => ep.key === 'fixtures')
      if (fixturesEndpoint) {
        sendLog({ type: 'info', message: `[Phase 1] Refreshing ${fixturesEndpoint.name}...` })

        const result = await callEndpoint(fixturesEndpoint)
        const { type, message } = formatResult(result)
        sendLog({ type, message })

        if (result.success) {
          successCount++
          results[fixturesEndpoint.key] = {
            success: true,
            inserted: result.data?.inserted ?? result.data?.imported ?? 0,
            updated: result.data?.updated ?? 0,
            errors: result.data?.errors ?? 0,
            duration: result.duration,
          }
        } else {
          failCount++
          results[fixturesEndpoint.key] = { success: false, duration: result.duration }
        }
      }

      // Phase 2: Run all other endpoints in parallel
      const parallelEndpoints = endpointsToRun.filter(ep => ep.key !== 'fixtures')

      if (parallelEndpoints.length > 0) {
        sendLog({
          type: 'info',
          message: `[Phase 2] Refreshing ${parallelEndpoints.length} endpoints in parallel...`
        })

        const parallelResults = await Promise.all(parallelEndpoints.map(callEndpoint))

        // Process results
        for (const result of parallelResults) {
          const { type, message } = formatResult(result)
          sendLog({ type, message })

          if (result.success) {
            successCount++
            results[result.endpoint.key] = {
              success: true,
              inserted: result.data?.inserted ?? result.data?.imported ?? 0,
              updated: result.data?.updated ?? 0,
              errors: result.data?.errors ?? 0,
              duration: result.duration,
            }
          } else {
            failCount++
            results[result.endpoint.key] = { success: false, duration: result.duration }
          }
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
