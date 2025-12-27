import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function POST(request: Request) {
  try {
    // Fetch completed fixtures from last 7 days without analysis
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Get all completed fixtures with predictions
    const { data: fixtures, error } = await supabase
      .from('fixtures')
      .select(`
        id,
        match_date,
        home_team:teams!fixtures_home_team_id_fkey(name),
        away_team:teams!fixtures_away_team_id_fkey(name),
        prediction:predictions!inner(id)
      `)
      .in('status', ['FT', 'AET', 'PEN'])
      .gte('match_date', sevenDaysAgo.toISOString())

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
