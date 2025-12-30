import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

// Note: This endpoint is called by Vercel cron job, not user requests
// Auth is handled by Vercel's cron security (cron jobs are internal)
export async function POST(request: Request) {
  try {
    const now = new Date()

    // 1-hour delay: Only process matches that ended more than 1 hour ago
    // This ensures match statistics and events have been synced
    const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000)

    // Don't process matches older than 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    console.log(`[Auto-Trigger] Looking for matches between ${sevenDaysAgo.toISOString()} and ${oneHourAgo.toISOString()}`)

    // Get completed fixtures that:
    // 1. Have status FT/AET/PEN (completed)
    // 2. Match ended between 7 days ago and 1 hour ago
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
      .gte('match_date', sevenDaysAgo.toISOString())
      .lte('match_date', oneHourAgo.toISOString())

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

        // Rate limit: 1 request per 2 seconds to avoid overwhelming n8n
        await new Promise(resolve => setTimeout(resolve, 2000))
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
