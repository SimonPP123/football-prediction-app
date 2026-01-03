import { createClient } from '@supabase/supabase-js'
import type { FixtureForTrigger, LeagueWithFixtures, TriggerType } from './check-windows'
import { PROCESSING_CONFIG, updateTriggerTimestamp } from './check-windows'
import { getWebhookUrl, getWebhookSecret, DEFAULT_WEBHOOKS } from './webhook-config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DEFAULT_TIMEOUT_MS = 300000  // 5 minutes (matches prediction/analysis timeout)

export interface WebhookResult {
  success: boolean
  status: number
  duration: number
  response?: any
  error?: string
}

export interface TriggerResult {
  triggerType: TriggerType
  status: 'success' | 'error' | 'no-action'
  fixtureCount: number
  webhookResult?: WebhookResult
  error?: string
}

/**
 * Send webhook to n8n and return result
 */
async function sendWebhook(
  url: string,
  payload: Record<string, any>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<WebhookResult> {
  const startTime = Date.now()
  const webhookSecret = await getWebhookSecret()

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(webhookSecret && { 'X-Webhook-Secret': webhookSecret })
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    })

    clearTimeout(timeout)

    const duration = Date.now() - startTime
    let responseData: any = null

    try {
      responseData = await response.json()
    } catch {
      responseData = { raw: await response.text() }
    }

    return {
      success: response.ok,
      status: response.status,
      duration,
      response: responseData
    }
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return {
      success: false,
      status: 0,
      duration,
      error: errorMessage
    }
  }
}

/**
 * Log automation event to database
 */
export async function logAutomationEvent(params: {
  cronRunId: string
  triggerType: TriggerType | 'cron-check'
  leagueId?: string
  fixtureIds?: string[]
  fixtureCount?: number
  webhookUrl?: string
  webhookStatus?: number
  webhookResponse?: any
  webhookDurationMs?: number
  status: 'success' | 'error' | 'skipped' | 'no-action'
  message?: string
  errorMessage?: string
  details?: Record<string, any>
}) {
  const { data, error } = await supabase.from('automation_logs').insert({
    cron_run_id: params.cronRunId,
    trigger_type: params.triggerType,
    league_id: params.leagueId || null,
    fixture_ids: params.fixtureIds || [],
    fixture_count: params.fixtureCount || 0,
    webhook_url: params.webhookUrl || null,
    webhook_status: params.webhookStatus || null,
    webhook_response: params.webhookResponse || null,
    webhook_duration_ms: params.webhookDurationMs || null,
    status: params.status,
    message: params.message || null,
    error_message: params.errorMessage || null,
    completed_at: new Date().toISOString(),
    details: params.details || null
  }).select().single()

  if (error) {
    console.error('Failed to log automation event:', error)
  }

  return data
}

/**
 * Trigger pre-match + imminent phases for leagues with upcoming matches
 */
export async function triggerPreMatch(
  cronRunId: string,
  leagues: LeagueWithFixtures[]
): Promise<TriggerResult[]> {
  const results: TriggerResult[] = []
  const webhookUrl = await getWebhookUrl('pre-match')

  for (const league of leagues) {
    const payload = {
      league_id: league.league_id,
      league_name: league.league_name,
      fixtures: league.fixtures.map(f => ({
        id: f.id,
        home_team: f.home_team?.name,
        away_team: f.away_team?.name,
        match_date: f.match_date
      })),
      trigger_type: 'pre-match'
    }

    const webhookResult = await sendWebhook(webhookUrl, payload)

    await logAutomationEvent({
      cronRunId,
      triggerType: 'pre-match',
      leagueId: league.league_id,
      fixtureIds: league.fixtures.map(f => f.id),
      fixtureCount: league.fixtures.length,
      webhookUrl,
      webhookStatus: webhookResult.status,
      webhookResponse: webhookResult.response,
      webhookDurationMs: webhookResult.duration,
      status: webhookResult.success ? 'success' : 'error',
      message: webhookResult.success
        ? `Triggered pre-match for ${league.fixtures.length} fixtures in ${league.league_name}`
        : `Pre-match webhook failed for ${league.league_name}`,
      errorMessage: webhookResult.error,
      details: { fixtures: payload.fixtures }
    })

    results.push({
      triggerType: 'pre-match',
      status: webhookResult.success ? 'success' : 'error',
      fixtureCount: league.fixtures.length,
      webhookResult,
      error: webhookResult.error
    })
  }

  return results
}

/**
 * Trigger predictions for fixtures using parallel batch processing
 *
 * - Processes fixtures in batches of BATCH_SIZE (default 3)
 * - Uses Promise.allSettled to handle individual failures gracefully
 * - Updates prediction_triggered_at BEFORE making API call (prevents duplicate triggers)
 * - Logs detailed results for each fixture
 */
export async function triggerPredictions(
  cronRunId: string,
  fixtures: FixtureForTrigger[]
): Promise<TriggerResult> {
  const startTime = Date.now()
  const results: { fixture_id: string; success: boolean; error?: string; duration?: number }[] = []
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://football.analyserinsights.com'
  const apiKey = process.env.ADMIN_API_KEY || ''
  const model = 'openai/gpt-5-mini'
  const { BATCH_SIZE, BATCH_DELAY_MS } = PROCESSING_CONFIG

  console.log(`[Predictions] Starting batch processing for ${fixtures.length} fixtures (batch size: ${BATCH_SIZE})`)

  // Process in batches
  for (let i = 0; i < fixtures.length; i += BATCH_SIZE) {
    const batch = fixtures.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(fixtures.length / BATCH_SIZE)

    console.log(`[Predictions] Processing batch ${batchNum}/${totalBatches} (${batch.length} fixtures)`)

    // Update trigger timestamps BEFORE making API calls (prevents duplicate triggers if cron overlaps)
    await Promise.all(
      batch.map(f => updateTriggerTimestamp(f.id, 'prediction'))
    )

    // Process batch in parallel using Promise.allSettled
    const batchPromises = batch.map(async (fixture) => {
      const fixtureStart = Date.now()

      try {
        const response = await fetch(`${baseUrl}/api/predictions/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
          },
          body: JSON.stringify({
            fixture_id: fixture.id,
            model
          })
        })

        const result = await response.json()
        const duration = Date.now() - fixtureStart

        return {
          fixture_id: fixture.id,
          success: result.success || response.ok,
          duration,
          error: result.error
        }
      } catch (err: any) {
        return {
          fixture_id: fixture.id,
          success: false,
          duration: Date.now() - fixtureStart,
          error: err.message
        }
      }
    })

    // Wait for all promises in this batch to settle
    const batchResults = await Promise.allSettled(batchPromises)

    // Extract results
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value)
        console.log(`[Predictions] Fixture ${result.value.fixture_id}: ${result.value.success ? 'SUCCESS' : 'FAILED'} (${result.value.duration}ms)`)
      } else {
        // Promise rejected (shouldn't happen with our try/catch, but handle it)
        results.push({
          fixture_id: 'unknown',
          success: false,
          error: result.reason?.message || 'Promise rejected'
        })
      }
    }

    // Brief delay between batches to prevent overwhelming the system
    if (i + BATCH_SIZE < fixtures.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS))
    }
  }

  const duration = Date.now() - startTime
  const successCount = results.filter(r => r.success).length
  const hasErrors = successCount < fixtures.length

  console.log(`[Predictions] Completed: ${successCount}/${fixtures.length} succeeded in ${duration}ms`)

  await logAutomationEvent({
    cronRunId,
    triggerType: 'prediction',
    fixtureIds: fixtures.map(f => f.id),
    fixtureCount: fixtures.length,
    webhookUrl: `${baseUrl}/api/predictions/generate`,
    webhookStatus: hasErrors ? 500 : 200,
    webhookResponse: { results, model },
    webhookDurationMs: duration,
    status: hasErrors ? 'error' : 'success',
    message: hasErrors
      ? `Predictions: ${successCount}/${fixtures.length} succeeded`
      : `Triggered predictions for ${fixtures.length} fixtures`,
    errorMessage: hasErrors ? `${fixtures.length - successCount} predictions failed` : undefined,
    details: {
      batch_size: BATCH_SIZE,
      total_batches: Math.ceil(fixtures.length / BATCH_SIZE),
      fixtures: fixtures.map(f => ({
        id: f.id,
        home_team: f.home_team?.name,
        away_team: f.away_team?.name
      })),
      results
    }
  })

  return {
    triggerType: 'prediction',
    status: hasErrors ? 'error' : 'success',
    fixtureCount: fixtures.length,
    webhookResult: {
      success: !hasErrors,
      status: hasErrors ? 500 : 200,
      duration,
      response: { results, successCount, failedCount: fixtures.length - successCount }
    },
    error: hasErrors ? `${fixtures.length - successCount} predictions failed` : undefined
  }
}

/**
 * Trigger live phase refresh for leagues with live matches
 */
export async function triggerLive(
  cronRunId: string,
  leagues: { league_id: string; league_name: string; live_count: number }[]
): Promise<TriggerResult[]> {
  const results: TriggerResult[] = []
  const webhookUrl = await getWebhookUrl('live')

  for (const league of leagues) {
    const payload = {
      leagues: [{ league_id: league.league_id, live_count: league.live_count }],
      trigger_type: 'live'
    }

    const webhookResult = await sendWebhook(webhookUrl, payload)

    await logAutomationEvent({
      cronRunId,
      triggerType: 'live',
      leagueId: league.league_id,
      fixtureCount: league.live_count,
      webhookUrl,
      webhookStatus: webhookResult.status,
      webhookResponse: webhookResult.response,
      webhookDurationMs: webhookResult.duration,
      status: webhookResult.success ? 'success' : 'error',
      message: webhookResult.success
        ? `Triggered live refresh for ${league.live_count} matches in ${league.league_name}`
        : `Live webhook failed for ${league.league_name}`,
      errorMessage: webhookResult.error
    })

    results.push({
      triggerType: 'live',
      status: webhookResult.success ? 'success' : 'error',
      fixtureCount: league.live_count,
      webhookResult,
      error: webhookResult.error
    })
  }

  return results
}

/**
 * Trigger post-match phase refresh for leagues with finished matches
 */
export async function triggerPostMatch(
  cronRunId: string,
  leagues: { league_id: string; league_name: string; finished_count: number }[]
): Promise<TriggerResult[]> {
  const results: TriggerResult[] = []
  const webhookUrl = await getWebhookUrl('post-match')

  for (const league of leagues) {
    const payload = {
      leagues: [{ league_id: league.league_id, finished_count: league.finished_count }],
      trigger_type: 'post-match'
    }

    const webhookResult = await sendWebhook(webhookUrl, payload)

    await logAutomationEvent({
      cronRunId,
      triggerType: 'post-match',
      leagueId: league.league_id,
      fixtureCount: league.finished_count,
      webhookUrl,
      webhookStatus: webhookResult.status,
      webhookResponse: webhookResult.response,
      webhookDurationMs: webhookResult.duration,
      status: webhookResult.success ? 'success' : 'error',
      message: webhookResult.success
        ? `Triggered post-match for ${league.finished_count} matches in ${league.league_name}`
        : `Post-match webhook failed for ${league.league_name}`,
      errorMessage: webhookResult.error
    })

    results.push({
      triggerType: 'post-match',
      status: webhookResult.success ? 'success' : 'error',
      fixtureCount: league.finished_count,
      webhookResult,
      error: webhookResult.error
    })
  }

  return results
}

/**
 * Trigger post-match analysis for fixtures using parallel batch processing
 *
 * - Processes fixtures in batches of BATCH_SIZE (default 3)
 * - Uses Promise.allSettled to handle individual failures gracefully
 * - Updates analysis_triggered_at BEFORE making API call (prevents duplicate triggers)
 */
export async function triggerAnalysis(
  cronRunId: string,
  fixtures: FixtureForTrigger[]
): Promise<TriggerResult> {
  const startTime = Date.now()
  const results: { fixture_id: string; success: boolean; error?: string; duration?: number }[] = []
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://football.analyserinsights.com'
  const apiKey = process.env.ADMIN_API_KEY || ''
  const model = 'openai/gpt-5-mini'
  const { BATCH_SIZE, BATCH_DELAY_MS } = PROCESSING_CONFIG

  console.log(`[Analysis] Starting batch processing for ${fixtures.length} fixtures (batch size: ${BATCH_SIZE})`)

  // Process in batches
  for (let i = 0; i < fixtures.length; i += BATCH_SIZE) {
    const batch = fixtures.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(fixtures.length / BATCH_SIZE)

    console.log(`[Analysis] Processing batch ${batchNum}/${totalBatches} (${batch.length} fixtures)`)

    // Update trigger timestamps BEFORE making API calls
    await Promise.all(
      batch.map(f => updateTriggerTimestamp(f.id, 'analysis'))
    )

    // Process batch in parallel
    const batchPromises = batch.map(async (fixture) => {
      const fixtureStart = Date.now()

      try {
        const response = await fetch(`${baseUrl}/api/match-analysis/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
          },
          body: JSON.stringify({
            fixture_id: fixture.id,
            model
          })
        })

        const result = await response.json()
        const duration = Date.now() - fixtureStart

        return {
          fixture_id: fixture.id,
          success: result.success || response.ok,
          duration,
          error: result.error
        }
      } catch (err: any) {
        return {
          fixture_id: fixture.id,
          success: false,
          duration: Date.now() - fixtureStart,
          error: err.message
        }
      }
    })

    const batchResults = await Promise.allSettled(batchPromises)

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value)
        console.log(`[Analysis] Fixture ${result.value.fixture_id}: ${result.value.success ? 'SUCCESS' : 'FAILED'} (${result.value.duration}ms)`)
      } else {
        results.push({
          fixture_id: 'unknown',
          success: false,
          error: result.reason?.message || 'Promise rejected'
        })
      }
    }

    if (i + BATCH_SIZE < fixtures.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS))
    }
  }

  const duration = Date.now() - startTime
  const successCount = results.filter(r => r.success).length
  const hasErrors = successCount < fixtures.length

  console.log(`[Analysis] Completed: ${successCount}/${fixtures.length} succeeded in ${duration}ms`)

  await logAutomationEvent({
    cronRunId,
    triggerType: 'analysis',
    fixtureIds: fixtures.map(f => f.id),
    fixtureCount: fixtures.length,
    webhookUrl: `${baseUrl}/api/match-analysis/generate`,
    webhookStatus: hasErrors ? 500 : 200,
    webhookResponse: { results, model },
    webhookDurationMs: duration,
    status: hasErrors ? 'error' : 'success',
    message: hasErrors
      ? `Analysis: ${successCount}/${fixtures.length} succeeded`
      : `Triggered analysis for ${fixtures.length} fixtures`,
    errorMessage: hasErrors ? `${fixtures.length - successCount} analyses failed` : undefined,
    details: {
      batch_size: BATCH_SIZE,
      total_batches: Math.ceil(fixtures.length / BATCH_SIZE),
      fixtures: fixtures.map(f => ({
        id: f.id,
        home_team: f.home_team?.name,
        away_team: f.away_team?.name,
        score: `${f.goals_home ?? 0}-${f.goals_away ?? 0}`
      })),
      results
    }
  })

  return {
    triggerType: 'analysis',
    status: hasErrors ? 'error' : 'success',
    fixtureCount: fixtures.length,
    webhookResult: {
      success: !hasErrors,
      status: hasErrors ? 500 : 200,
      duration,
      response: { results, successCount, failedCount: fixtures.length - successCount }
    },
    error: hasErrors ? `${fixtures.length - successCount} analyses failed` : undefined
  }
}

/**
 * Log "no action" for a trigger type (when window check found nothing)
 */
export async function logNoAction(cronRunId: string, triggerType: TriggerType) {
  await logAutomationEvent({
    cronRunId,
    triggerType,
    status: 'no-action',
    message: `No fixtures in ${triggerType} window`
  })
}
