import { createClient } from '@supabase/supabase-js'
import type { FixtureForTrigger, LeagueWithFixtures, TriggerType } from './check-windows'
import { getWebhookUrl, getWebhookSecret, DEFAULT_WEBHOOKS } from './webhook-config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DEFAULT_TIMEOUT_MS = 180000  // 3 minutes (increased from 60s to prevent timeouts)

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
 * Trigger predictions for fixtures without predictions
 * Uses the existing /api/predictions/generate endpoint
 */
export async function triggerPredictions(
  cronRunId: string,
  fixtures: FixtureForTrigger[]
): Promise<TriggerResult> {
  const startTime = Date.now()
  const results: { fixture_id: string; success: boolean; error?: string }[] = []
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://football.analyserinsights.com'
  const apiKey = process.env.ADMIN_API_KEY || ''
  const model = 'openai/gpt-5-mini'

  // Process each fixture through the existing prediction endpoint
  for (const fixture of fixtures) {
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
      results.push({
        fixture_id: fixture.id,
        success: result.success || response.ok
      })

      // Rate limit between requests
      if (fixtures.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    } catch (err: any) {
      results.push({
        fixture_id: fixture.id,
        success: false,
        error: err.message
      })
    }
  }

  const duration = Date.now() - startTime
  const successCount = results.filter(r => r.success).length
  const hasErrors = successCount < fixtures.length

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
      response: { results }
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
 * Trigger post-match analysis for fixtures with predictions
 * Uses the existing /api/match-analysis/generate endpoint
 */
export async function triggerAnalysis(
  cronRunId: string,
  fixtures: FixtureForTrigger[]
): Promise<TriggerResult> {
  const startTime = Date.now()
  const results: { fixture_id: string; success: boolean; error?: string }[] = []
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://football.analyserinsights.com'
  const apiKey = process.env.ADMIN_API_KEY || ''
  const model = 'openai/gpt-5-mini'

  // Process each fixture through the existing analysis endpoint
  for (const fixture of fixtures) {
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
      results.push({
        fixture_id: fixture.id,
        success: result.success || response.ok
      })

      // Rate limit between requests (analysis takes longer)
      if (fixtures.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
    } catch (err: any) {
      results.push({
        fixture_id: fixture.id,
        success: false,
        error: err.message
      })
    }
  }

  const duration = Date.now() - startTime
  const successCount = results.filter(r => r.success).length
  const hasErrors = successCount < fixtures.length

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
      response: { results }
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
