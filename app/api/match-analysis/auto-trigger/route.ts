import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

// Configuration constants
const ANALYSIS_DELAY_HOURS = 1 // Wait this long after match ends before analyzing
const MAX_AGE_DAYS = 7 // Don't process matches older than this
const RATE_LIMIT_MS = 2000 // Delay between requests to avoid overwhelming n8n

/**
 * Validate cron secret to prevent unauthorized triggering
 * Uses timing-safe comparison to prevent timing attacks
 */
function validateCronSecret(request: Request): boolean {
  const cronSecret = request.headers.get('x-cron-secret')
  const expectedSecret = process.env.CRON_SECRET

  if (!cronSecret || !expectedSecret) {
    return false
  }

  // Timing-safe comparison - constant time regardless of where strings differ
  const maxLen = Math.max(cronSecret.length, expectedSecret.length)
  let mismatch = cronSecret.length === expectedSecret.length ? 0 : 1

  for (let i = 0; i < maxLen; i++) {
    const charA = i < cronSecret.length ? cronSecret.charCodeAt(i) : 0
    const charB = i < expectedSecret.length ? expectedSecret.charCodeAt(i) : 0
    mismatch |= charA ^ charB
  }
  return mismatch === 0
}

// This endpoint requires CRON_SECRET header for security
// Called by external cron service (Vercel, n8n, or similar)
export async function POST(request: Request) {
  // Validate cron secret
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const now = new Date()

    // Delay: Only process matches that ended more than ANALYSIS_DELAY_HOURS ago
    // This ensures match statistics and events have been synced
    const delayAgo = new Date(now.getTime() - ANALYSIS_DELAY_HOURS * 60 * 60 * 1000)

    // Don't process matches older than MAX_AGE_DAYS
    const maxAgeAgo = new Date(now.getTime() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000)

    console.log(`[Auto-Trigger] Looking for matches between ${maxAgeAgo.toISOString()} and ${delayAgo.toISOString()}`)

    // Get completed fixtures that:
    // 1. Have status FT/AET/PEN (completed)
    // 2. Match ended between maxAgeAgo and delayAgo
    // 3. Have predictions (inner join)
    const { data: fixtures, error } = await supabase
      .from('fixtures')
      .select(`
        id,
        match_date,
        status,
        goals_home,
        goals_away,
        home_team:teams!fixtures_home_team_id_fkey(name),
        away_team:teams!fixtures_away_team_id_fkey(name),
        prediction:predictions!inner(id)
      `)
      .in('status', ['FT', 'AET', 'PEN'])
      .gte('match_date', maxAgeAgo.toISOString())
      .lte('match_date', delayAgo.toISOString())

    if (error) throw error

    // Filter out fixtures that already have analysis
    const { data: existingAnalyses } = await supabase
      .from('match_analysis')
      .select('fixture_id')

    const existingIds = new Set(existingAnalyses?.map(a => a.fixture_id) || [])
    const needsAnalysis = fixtures?.filter(f => !existingIds.has(f.id)) || []

    console.log(`[Auto-Trigger] Found ${needsAnalysis.length} fixtures needing analysis`)

    // Trigger analysis for each
    const results = []
    for (const fixture of needsAnalysis) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/match-analysis/generate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fixture_id: fixture.id })
          }
        )

        const result = await response.json()
        results.push({
          fixture_id: fixture.id,
          match: `${(fixture.home_team as any).name} vs ${(fixture.away_team as any).name}`,
          success: result.success
        })

        // Rate limit between requests to avoid overwhelming n8n
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS))
      } catch (err: any) {
        console.error(`Failed to analyze fixture ${fixture.id}:`, err)
        results.push({
          fixture_id: fixture.id,
          success: false,
          error: err.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      checked: fixtures?.length || 0,
      triggered: needsAnalysis.length,
      results
    })

  } catch (error) {
    console.error('Error in auto-trigger:', error)
    return NextResponse.json({ error: 'Failed to auto-trigger' }, { status: 500 })
  }
}
