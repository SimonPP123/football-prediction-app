import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/auth'
import { parseLimit, ValidationError } from '@/lib/validation'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const limitParam = searchParams.get('limit')
  const triggerType = searchParams.get('trigger_type')
  const status = searchParams.get('status')
  const date = searchParams.get('date')
  const cronRunId = searchParams.get('cron_run_id')

  // Validate limit (parseLimit returns undefined if no default and no value)
  let limit = 50
  try {
    limit = parseLimit(limitParam, 50, 1, 200) ?? 50
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    throw e
  }

  // Build query
  let query = supabase
    .from('automation_logs')
    .select(`
      id,
      trigger_type,
      cron_run_id,
      league_id,
      fixture_ids,
      fixture_count,
      webhook_url,
      webhook_status,
      webhook_response,
      webhook_duration_ms,
      status,
      message,
      error_message,
      triggered_at,
      completed_at,
      details,
      league:leagues(id, name)
    `)
    .order('triggered_at', { ascending: false })
    .limit(limit)

  // Apply filters
  if (triggerType) {
    query = query.eq('trigger_type', triggerType)
  }

  if (status) {
    query = query.eq('status', status)
  }

  if (cronRunId) {
    query = query.eq('cron_run_id', cronRunId)
  }

  if (date) {
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
    }
    query = query.gte('triggered_at', `${date}T00:00:00Z`)
                 .lte('triggered_at', `${date}T23:59:59Z`)
  }

  const { data: logs, error } = await query

  if (error) {
    console.error('Failed to fetch automation logs:', error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }

  // Transform logs to include league name
  const transformedLogs = logs?.map(log => ({
    ...log,
    league_name: (log.league as any)?.name || null,
    league: undefined
  })) || []

  return NextResponse.json({
    logs: transformedLogs,
    count: transformedLogs.length
  })
}
