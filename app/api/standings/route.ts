import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const leagueId = searchParams.get('league_id')

    let query = supabase
      .from('standings')
      .select(`
        id,
        team_id,
        league_id,
        rank,
        points,
        goal_diff,
        form,
        description,
        played,
        won,
        drawn,
        lost,
        goals_for,
        goals_against,
        home_record,
        away_record,
        team:teams(id, name, logo, code, api_id)
      `)
      .order('rank', { ascending: true })

    if (leagueId) {
      query = query.eq('league_id', leagueId)
    }

    const { data: standings, error } = await query

    if (error) {
      console.error('[API Standings] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch standings' }, { status: 500 })
    }

    return NextResponse.json(standings || [])
  } catch (error) {
    console.error('[API Standings] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch standings' },
      { status: 500 }
    )
  }
}
