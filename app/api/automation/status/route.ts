import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/auth'
import { getAutomationConfig } from '@/lib/automation/check-windows'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface TriggerStats {
  successToday: number
  errorToday: number
  lastTriggered: string | null
  enabled: boolean
}

interface TriggerSummary {
  preMatch: TriggerStats
  prediction: TriggerStats
  live: TriggerStats
  postMatch: TriggerStats
  analysis: TriggerStats
}

function getEmptyStats(enabled: boolean): TriggerStats {
  return {
    successToday: 0,
    errorToday: 0,
    lastTriggered: null,
    enabled
  }
}

export async function GET() {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const config = await getAutomationConfig()
  if (!config) {
    return NextResponse.json({ error: 'Automation config not found' }, { status: 500 })
  }

  // Get today's date at midnight UTC
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const todayStart = today.toISOString()

  // Get all logs from today
  const { data: logs, error } = await supabase
    .from('automation_logs')
    .select('trigger_type, status, triggered_at')
    .gte('triggered_at', todayStart)
    .neq('trigger_type', 'cron-check')
    .order('triggered_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch automation logs:', error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }

  // Initialize trigger stats
  const triggers: TriggerSummary = {
    preMatch: getEmptyStats(config.pre_match_enabled),
    prediction: getEmptyStats(config.prediction_enabled),
    live: getEmptyStats(config.live_enabled),
    postMatch: getEmptyStats(config.post_match_enabled),
    analysis: getEmptyStats(config.analysis_enabled)
  }

  // Aggregate stats from logs
  const triggerTypeMap: Record<string, keyof TriggerSummary> = {
    'pre-match': 'preMatch',
    'prediction': 'prediction',
    'live': 'live',
    'post-match': 'postMatch',
    'analysis': 'analysis'
  }

  for (const log of logs || []) {
    const key = triggerTypeMap[log.trigger_type]
    if (!key) continue

    if (log.status === 'success') {
      triggers[key].successToday++
    } else if (log.status === 'error') {
      triggers[key].errorToday++
    }

    // Set last triggered (first occurrence since sorted desc)
    if (!triggers[key].lastTriggered && log.status !== 'no-action') {
      triggers[key].lastTriggered = log.triggered_at
    }
  }

  // Calculate next expected cron run (every 5 minutes)
  let nextCronRun: string | null = null
  if (config.last_cron_run) {
    const lastRun = new Date(config.last_cron_run)
    const nextRun = new Date(lastRun.getTime() + 5 * 60 * 1000)
    // If next run is in the past, calculate based on current time
    if (nextRun < new Date()) {
      const now = new Date()
      const minutes = now.getUTCMinutes()
      const nextMinute = Math.ceil(minutes / 5) * 5
      now.setUTCMinutes(nextMinute, 0, 0)
      nextCronRun = now.toISOString()
    } else {
      nextCronRun = nextRun.toISOString()
    }
  }

  // Calculate total errors today
  const errorsToday = Object.values(triggers).reduce((sum, t) => sum + t.errorToday, 0)

  return NextResponse.json({
    isEnabled: config.is_enabled,
    lastCronRun: config.last_cron_run,
    lastCronStatus: config.last_cron_status,
    nextCronRun,
    triggers,
    errorsToday,
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
