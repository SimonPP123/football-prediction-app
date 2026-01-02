import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/auth'
import {
  queryPreMatchFixtures,
  queryPredictionFixtures,
  queryLiveLeagues,
  queryPostMatchLeagues,
  queryAnalysisFixtures,
  getAutomationConfig,
  updateAutomationConfig
} from '@/lib/automation/check-windows'
import {
  triggerPreMatch,
  triggerPredictions,
  triggerLive,
  triggerPostMatch,
  triggerAnalysis,
  logNoAction,
  logAutomationEvent,
  type TriggerResult
} from '@/lib/automation/send-webhooks'

export const dynamic = 'force-dynamic'
export const maxDuration = 120 // 2 minutes max for this endpoint

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface TriggerSummary {
  pre_match: { checked: number; triggered: number; errors: number }
  prediction: { checked: number; triggered: number; errors: number }
  live: { checked: number; triggered: number; errors: number }
  post_match: { checked: number; triggered: number; errors: number }
  analysis: { checked: number; triggered: number; errors: number }
}

export async function POST(request: Request) {
  // Verify admin access (API key or cookie)
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const cronRunId = crypto.randomUUID()
  const startTime = Date.now()
  const now = new Date()

  console.log(`[Automation] Starting cron run ${cronRunId} at ${now.toISOString()}`)

  // Get automation config
  const config = await getAutomationConfig()
  if (!config) {
    return NextResponse.json({
      success: false,
      error: 'Automation config not found',
      cronRunId
    }, { status: 500 })
  }

  // Check if automation is enabled
  if (!config.is_enabled) {
    await logAutomationEvent({
      cronRunId,
      triggerType: 'cron-check',
      status: 'skipped',
      message: 'Automation is disabled'
    })

    return NextResponse.json({
      success: true,
      cronRunId,
      timestamp: now.toISOString(),
      message: 'Automation is disabled',
      results: null
    })
  }

  // Update last cron run status
  await updateAutomationConfig({
    last_cron_run: now.toISOString(),
    last_cron_status: 'running'
  })

  const results: TriggerResult[] = []
  const summary: TriggerSummary = {
    pre_match: { checked: 0, triggered: 0, errors: 0 },
    prediction: { checked: 0, triggered: 0, errors: 0 },
    live: { checked: 0, triggered: 0, errors: 0 },
    post_match: { checked: 0, triggered: 0, errors: 0 },
    analysis: { checked: 0, triggered: 0, errors: 0 }
  }

  try {
    // 1. Check Pre-Match window (25-35 min before kickoff)
    if (config.pre_match_enabled) {
      console.log('[Automation] Checking pre-match window...')
      const preMatchLeagues = await queryPreMatchFixtures()
      const totalFixtures = preMatchLeagues.reduce((sum, l) => sum + l.fixtures.length, 0)
      summary.pre_match.checked = totalFixtures

      if (preMatchLeagues.length > 0) {
        const preMatchResults = await triggerPreMatch(cronRunId, preMatchLeagues)
        results.push(...preMatchResults)
        summary.pre_match.triggered = totalFixtures
        summary.pre_match.errors = preMatchResults.filter(r => r.status === 'error').length
        console.log(`[Automation] Pre-match: triggered ${totalFixtures} fixtures across ${preMatchLeagues.length} leagues`)
      } else {
        await logNoAction(cronRunId, 'pre-match')
        console.log('[Automation] Pre-match: no fixtures in window')
      }
    }

    // 2. Check Prediction window (20-30 min before kickoff)
    if (config.prediction_enabled) {
      console.log('[Automation] Checking prediction window...')
      const predictionFixtures = await queryPredictionFixtures()
      summary.prediction.checked = predictionFixtures.length

      if (predictionFixtures.length > 0) {
        const predictionResult = await triggerPredictions(cronRunId, predictionFixtures)
        results.push(predictionResult)
        summary.prediction.triggered = predictionFixtures.length
        summary.prediction.errors = predictionResult.status === 'error' ? 1 : 0
        console.log(`[Automation] Prediction: triggered for ${predictionFixtures.length} fixtures`)
      } else {
        await logNoAction(cronRunId, 'prediction')
        console.log('[Automation] Prediction: no fixtures need predictions')
      }
    }

    // 3. Check Live matches
    if (config.live_enabled) {
      console.log('[Automation] Checking live matches...')

      // First, refresh fixtures from API-Football to get current live status
      // This ensures we have up-to-date match statuses before checking
      try {
        console.log('[Automation] Refreshing fixture statuses from API...')
        const activeLeagues = await supabase
          .from('leagues')
          .select('id')
          .eq('is_active', true)

        if (activeLeagues.data) {
          for (const league of activeLeagues.data) {
            // Use internal fetch to refresh each league's fixtures (live mode for speed)
            const refreshUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3004'}/api/data/refresh/fixtures?mode=live&stream=false&league_id=${league.id}`
            await fetch(refreshUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ADMIN_API_KEY || ''
              }
            }).catch(err => console.log(`[Automation] Failed to refresh league ${league.id}:`, err.message))
          }
        }
      } catch (refreshError) {
        console.log('[Automation] Fixture refresh failed, continuing with existing data:', refreshError)
      }

      const liveLeagues = await queryLiveLeagues()
      const totalLive = liveLeagues.reduce((sum, l) => sum + l.live_count, 0)
      summary.live.checked = totalLive

      if (liveLeagues.length > 0) {
        const liveResults = await triggerLive(cronRunId, liveLeagues)
        results.push(...liveResults)
        summary.live.triggered = totalLive
        summary.live.errors = liveResults.filter(r => r.status === 'error').length
        console.log(`[Automation] Live: triggered for ${totalLive} matches across ${liveLeagues.length} leagues`)
      } else {
        await logNoAction(cronRunId, 'live')
        console.log('[Automation] Live: no live matches')
      }
    }

    // 4. Check Post-Match window (4h after FT)
    if (config.post_match_enabled) {
      console.log('[Automation] Checking post-match window...')
      const postMatchLeagues = await queryPostMatchLeagues()
      const totalFinished = postMatchLeagues.reduce((sum, l) => sum + l.finished_count, 0)
      summary.post_match.checked = totalFinished

      if (postMatchLeagues.length > 0) {
        const postMatchResults = await triggerPostMatch(cronRunId, postMatchLeagues)
        results.push(...postMatchResults)
        summary.post_match.triggered = totalFinished
        summary.post_match.errors = postMatchResults.filter(r => r.status === 'error').length
        console.log(`[Automation] Post-match: triggered for ${totalFinished} matches across ${postMatchLeagues.length} leagues`)
      } else {
        await logNoAction(cronRunId, 'post-match')
        console.log('[Automation] Post-match: no finished matches in window')
      }
    }

    // 5. Check Analysis window (4h15m after FT)
    if (config.analysis_enabled) {
      console.log('[Automation] Checking analysis window...')
      const analysisFixtures = await queryAnalysisFixtures()
      summary.analysis.checked = analysisFixtures.length

      if (analysisFixtures.length > 0) {
        const analysisResult = await triggerAnalysis(cronRunId, analysisFixtures)
        results.push(analysisResult)
        summary.analysis.triggered = analysisFixtures.length
        summary.analysis.errors = analysisResult.status === 'error' ? 1 : 0
        console.log(`[Automation] Analysis: triggered for ${analysisFixtures.length} fixtures`)
      } else {
        await logNoAction(cronRunId, 'analysis')
        console.log('[Automation] Analysis: no fixtures need analysis')
      }
    }

    // Update final status
    const hasErrors = results.some(r => r.status === 'error')
    await updateAutomationConfig({
      last_cron_status: hasErrors ? 'error' : 'success'
    })

    const duration = Date.now() - startTime
    console.log(`[Automation] Cron run ${cronRunId} completed in ${duration}ms`)

    return NextResponse.json({
      success: true,
      cronRunId,
      timestamp: now.toISOString(),
      duration,
      summary,
      results: results.map(r => ({
        triggerType: r.triggerType,
        status: r.status,
        fixtureCount: r.fixtureCount,
        error: r.error
      }))
    })
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    console.error(`[Automation] Cron run ${cronRunId} failed:`, errorMessage)

    // Update status to error
    await updateAutomationConfig({
      last_cron_status: 'error'
    })

    // Log the error
    await logAutomationEvent({
      cronRunId,
      triggerType: 'cron-check',
      status: 'error',
      errorMessage,
      message: 'Cron run failed with error'
    })

    return NextResponse.json({
      success: false,
      cronRunId,
      timestamp: now.toISOString(),
      duration,
      error: errorMessage,
      summary
    }, { status: 500 })
  }
}

// GET endpoint to check automation status and next run
export async function GET() {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const config = await getAutomationConfig()
  if (!config) {
    return NextResponse.json({ error: 'Automation config not found' }, { status: 500 })
  }

  // Calculate next expected cron run (every 5 minutes)
  let nextCronRun: string | null = null
  if (config.last_cron_run) {
    const lastRun = new Date(config.last_cron_run)
    const nextRun = new Date(lastRun.getTime() + 5 * 60 * 1000) // 5 minutes
    nextCronRun = nextRun.toISOString()
  }

  return NextResponse.json({
    isEnabled: config.is_enabled,
    lastCronRun: config.last_cron_run,
    lastCronStatus: config.last_cron_status,
    nextCronRun,
    config: {
      pre_match_enabled: config.pre_match_enabled,
      prediction_enabled: config.prediction_enabled,
      live_enabled: config.live_enabled,
      post_match_enabled: config.post_match_enabled,
      analysis_enabled: config.analysis_enabled,
      pre_match_minutes_before: config.pre_match_minutes_before,
      prediction_minutes_before: config.prediction_minutes_before,
      post_match_hours_after: config.post_match_hours_after,
      analysis_hours_after: config.analysis_hours_after
    }
  })
}
