import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidUUID } from '@/lib/validation'

// Use service role for API routes to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Validate fixture ID format
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid fixture ID format' },
        { status: 400 }
      )
    }

    // Fetch fixture with all related data
    const { data: fixture, error } = await supabase
      .from('fixtures')
      .select(`
        *,
        home_team:teams!fixtures_home_team_id_fkey(*),
        away_team:teams!fixtures_away_team_id_fkey(*),
        venue:venues(*),
        prediction:predictions(*),
        odds:odds(*),
        statistics:fixture_statistics(*),
        events:fixture_events(*),
        match_analysis:match_analysis(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('[Fixture API] Error fetching fixture:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Fixture not found' }, { status: 404 })
      }
      throw error
    }

    console.log(`[Fixture API] Fixture ${id}: events=${fixture.events?.length || 0}, odds=${fixture.odds?.length || 0}, predictions=${fixture.prediction?.length || 0}, statistics=${fixture.statistics?.length || 0}`)

    // Fetch weather if venue has coordinates
    let weather = null
    if (fixture.venue?.latitude && fixture.venue?.longitude) {
      const { data: weatherData } = await supabase
        .from('weather')
        .select('*')
        .eq('fixture_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      weather = weatherData
    }

    // Fetch head-to-head if both teams exist
    let headToHead = null
    if (fixture.home_team_id && fixture.away_team_id) {
      const { data: h2hData } = await supabase
        .from('head_to_head')
        .select('*')
        .or(`and(team1_id.eq.${fixture.home_team_id},team2_id.eq.${fixture.away_team_id}),and(team1_id.eq.${fixture.away_team_id},team2_id.eq.${fixture.home_team_id})`)
        .limit(1)
        .single()

      headToHead = h2hData
    }

    return NextResponse.json({
      ...fixture,
      weather,
      head_to_head: headToHead,
    })
  } catch (error) {
    console.error('Error fetching fixture:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fixture' },
      { status: 500 }
    )
  }
}
