import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

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
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Fixture not found' }, { status: 404 })
      }
      throw error
    }

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
